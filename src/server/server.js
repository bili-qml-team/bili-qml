const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Redis } = require('ioredis');
const { createChallenge, verifySolution } = require('altcha-lib');

const app = express();

const TIMESTAMP_EXPIRE_MS = Number(process.env.TIMESTAMP_EXPIRE_MS) || 180 * 24 * 3600 * 1000; //排行榜总数据过期时间
const CACHE_EXPIRE_MS = Number(process.env.CACHE_EXPIRE_MS) || 300 * 1000; // 排行榜cache过期时间
const leaderboardTimeInterval = [24 * 3600 * 1000, 7 * 24 * 3600 * 1000, 30 * 24 * 3600 * 1000]; //排行榜相差时间

// Altcha 配置
const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'bili-qml-default-hmac-key-change-in-production';
const ALTCHA_COMPLEXITY = Number(process.env.ALTCHA_COMPLEXITY) || 250000; // PoW 难度

// 频率限制配置
const RATE_LIMIT_VOTE_MAX = Number(process.env.RATE_LIMIT_VOTE_MAX) || 10; // 投票最大次数
const RATE_LIMIT_VOTE_WINDOW = Number(process.env.RATE_LIMIT_VOTE_WINDOW) || 300; // 投票窗口（秒）
const RATE_LIMIT_LEADERBOARD_MAX = Number(process.env.RATE_LIMIT_LEADERBOARD_MAX) || 20; // 排行榜最大次数
const RATE_LIMIT_LEADERBOARD_WINDOW = Number(process.env.RATE_LIMIT_LEADERBOARD_WINDOW) || 300; // 排行榜窗口（秒）

// 使用Workers KV作为缓存，见worker.js

const redis = new Redis(`${process.env.UPSTASH_REDIS_PROTO || "redis"}://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${process.env.UPSTASH_REDIS_REST_URL}`);

// 频率限制器：检查并增加计数
async function checkRateLimit(key, maxRequests, windowSeconds) {
    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, windowSeconds);
    }
    return current > maxRequests;
}

// 重置频率限制（CAPTCHA 验证通过后）
async function resetRateLimit(key) {
    await redis.del(key);
}

async function getLeaderBoardFromTime(periodMs = 24 * 3600 * 1000, limit = 30) {
    const now = Date.now();
    const minTime = now - periodMs;
    const counts = {};
    const [_, recentVotes] = await Promise.all([
        redis.zremrangebyscore('votes:recent', '-inf', now - TIMESTAMP_EXPIRE_MS - 1),
        redis.zrangebyscore('votes:recent', minTime, now)
    ]);
    for (const member of recentVotes) {
        const bvid = member.split(':')[0];  // 从 `${bvid}:${userId}` 提取
        counts[bvid] = (counts[bvid] || 0) + 1;
    }
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit);
    return sorted;
}

async function getCachedLeaderBoard(range) {
    const response = await fetch(`https://${process.env.WORKER_CACHE_URL}/${range}`);
    const data = await response.json();
    return [data.data, data.expireTime];
}

async function getLeaderBoard(range) {
    if (range === 'realtime') {
        return [(await getLeaderBoardFromTime(12 * 3600 * 1000)), 0]; //过去12小时
    }
    return await getCachedLeaderBoard(range);
}

// 服务器逻辑区

app.use(cors({
    origin: [
        'https://www.bilibili.com',
        /^chrome-extension:\/\/.+$/,
        /^moz-extension:\/\/.+$/
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// 安全中间件：检查请求头，增加简单的防刷逻辑
const securityCheck = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';

    // 1. 拦截自动化工具 (开源安全型：不依赖秘密令牌)
    const ua = userAgent.toLowerCase();
    const botKeywords = ['curl', 'python', 'httpclient', 'axios', 'node-fetch', 'go-http', 'wget', 'postman'];
    if (botKeywords.some(kw => ua.includes(kw))) {
        return res.status(403).json({ success: false, error: 'Access Denied' });
    }

    // 2. 内容清洗与安全过滤
    if (req.method === 'POST' && req.body) {
        let { title, bvid, userId } = req.body;

        // 校验 BVID 格式（简单正则）
        if (bvid && !/^BV[a-zA-Z0-9]{10}$/.test(bvid)) {
            return res.status(400).json({ success: false, error: 'Invalid ID' });
        }
    }

    next();
};

app.use(securityCheck); // 应用到所有路由

// 禁用所有 API 的缓存
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// 根路径欢迎页
app.get('/', (req, res) => {
    res.send('<h1>B站问号榜服务器已启动 ❓</h1><p>已连接至云数据库。</p>');
});

// 处理浏览器自动请求 favicon 的问题，防止 404 报错
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 处理 robots.txt，告诉爬虫哪些可以爬
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /api/\nDisallow: /vote\nAllow: /");
});

// 处理常见的恶意扫描路径，直接返回 404，防止产生大量警告日志
const scannerPaths = [
    '/wp-admin',
    '/wordpress',
    '/.env',
    '/.git',
    '/phpmyadmin',
    '/xmlrpc.php',
    '/setup-config.php'
];

app.use((req, res, next) => {
    if (scannerPaths.some(p => req.path.toLowerCase().includes(p.toLowerCase()))) {
        return res.status(404).end();
    }
    next();
});

// EdgeOne Pages不支持定时任务自动刷新，提供手动刷新接口，由外部定时任务调用
app.use(["/api/refresh", "/refresh"], async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    // simple token check
    if (!token || token !== process.env.REFRESH_TOKEN) {
        return res.status(403).json({ message: "Token missing" });
    }
    try {
        const leaderBoardCache = {
            expireTime: Date.now() + CACHE_EXPIRE_MS,
            caches: await Promise.all(leaderboardTimeInterval.map((time) => {
                return getLeaderBoardFromTime(time);
            }))
        };
        console.log('Leaderboard cache updated.');
        return res.json({ success: true, leaderBoardCache });
    } catch (error) {
        console.error('Leaderboard Cache Update Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to refresh cache' });
    }
});

// Altcha 挑战端点
app.get(['/api/altcha/challenge', '/altcha/challenge'], async (req, res) => {
    try {
        const challenge = await createChallenge({
            hmacKey: ALTCHA_HMAC_KEY,
            maxNumber: ALTCHA_COMPLEXITY,
            algorithm: 'SHA-256',
        });
        res.json(challenge);
    } catch (error) {
        console.error('Altcha Challenge Error:', error);
        res.status(500).json({ success: false, error: 'Failed to create challenge' });
    }
});

// 处理投票
app.post(['/api/vote', '/vote'], async (req, res) => {
    try {
        const { bvid, userId, altcha } = req.body;

        // 1. 基础参数校验
        if (!bvid || !userId) return res.status(400).json({ success: false, error: 'Missing params' });

        const rateLimitKey = `ratelimit:vote:${userId}`;
        const isRateLimited = await checkRateLimit(rateLimitKey, RATE_LIMIT_VOTE_MAX, RATE_LIMIT_VOTE_WINDOW);

        // 2. 检查频率限制
        if (isRateLimited) {
            // 如果有 Altcha 解决方案，验证它
            if (altcha) {
                const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
                if (!isValid) {
                    return res.status(400).json({ success: false, error: 'Invalid CAPTCHA', requiresCaptcha: true });
                }
                // CAPTCHA 验证通过，重置频率限制
                await resetRateLimit(rateLimitKey);
            } else {
                // 没有 CAPTCHA，要求客户端完成验证
                return res.status(429).json({ success: false, error: 'Rate limit exceeded', requiresCaptcha: true });
            }
        }

        // 3. 用户投票记录
        const voted = await redis.sadd(`voted:${bvid}`, userId);
        if (voted === 0) return res.status(400).json({ success: false, error: 'Already Voted' });
        // 总票统计

        // 排行榜时间戳记录
        const now = Date.now();
        await Promise.all([
            redis.hincrby(`video:${bvid}`, 'votesTotal', 1),
            redis.zadd('votes:recent', now, `${bvid}:${userId}`)
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post(['/api/unvote', '/unvote'], async (req, res) => {
    try {
        const { bvid, userId, altcha } = req.body;

        // 1. 基础参数校验
        if (!bvid || !userId) return res.status(400).json({ success: false, error: 'Missing params' });

        const rateLimitKey = `ratelimit:vote:${userId}`;
        const isRateLimited = await checkRateLimit(rateLimitKey, RATE_LIMIT_VOTE_MAX, RATE_LIMIT_VOTE_WINDOW);

        // 2. 检查频率限制
        if (isRateLimited) {
            if (altcha) {
                const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
                if (!isValid) {
                    return res.status(400).json({ success: false, error: 'Invalid CAPTCHA', requiresCaptcha: true });
                }
                await resetRateLimit(rateLimitKey);
            } else {
                return res.status(429).json({ success: false, error: 'Rate limit exceeded', requiresCaptcha: true });
            }
        }

        const isMember = await redis.sismember(`voted:${bvid}`, userId);
        if (!isMember) return res.status(400).json({ error: 'Not voted yet' });
        // 总票处理
        await Promise.all([
            redis.srem(`voted:${bvid}`, userId),           // 删除投票记录
            redis.zrem('votes:recent', `${bvid}:${userId}`), // 删除排行榜记录
            redis.hincrby(`video:${bvid}`, 'votesTotal', -1)
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取状态
app.get(['/api/status', '/status'], async (req, res) => {
    const { bvid, userId } = req.query;
    try {
        const [isVoted, totalCount] = await Promise.all([
            redis.sismember(`voted:${bvid}`, userId),
            redis.hget(`video:${bvid}`, 'votesTotal')
        ]);
        res.json({ success: true, active: !!isVoted, count: totalCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取排行榜
app.get(['/api/leaderboard', '/leaderboard'], async (req, res) => {
    const { range = 'realtime', type, altcha } = req.query;
    let proc_type = parseInt(type);

    try {
        // 使用 IP 作为频率限制标识（排行榜是公开的，不需要 userId）
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
        const rateLimitKey = `ratelimit:leaderboard:${clientIP}`;
        const isRateLimited = await checkRateLimit(rateLimitKey, RATE_LIMIT_LEADERBOARD_MAX, RATE_LIMIT_LEADERBOARD_WINDOW);

        if (isRateLimited) {
            if (altcha) {
                const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
                if (!isValid) {
                    return res.status(400).json({ success: false, error: 'Invalid CAPTCHA', requiresCaptcha: true });
                }
                await resetRateLimit(rateLimitKey);
            } else {
                return res.status(429).json({ success: false, error: 'Rate limit exceeded', requiresCaptcha: true });
            }
        }

        const [board, expireTime] = await getLeaderBoard(range);
        if (range !== 'realtime') res.set('QML-Cache-Expires', `${expireTime}`);
        let list = board.map((array) => { return { bvid: array[0], count: array[1] } });
        // no type or type != 2: add backward capability
        if (!proc_type || proc_type !== 2) {
            await Promise.all(list.map(async (item, index) => {
                try {
                    const conn = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${item.bvid}`,
                        {
                            headers: {
                                "Origin": "https://www.bilibili.com",
                                "Referer": `https://www.bilibili.com/video/${item.bvid}/`,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                            }
                        });
                    const json = await conn.json();
                    if (json.code === 0 && json.data?.title) {
                        list[index].title = json.data.title;
                    } else {
                        list[index].title = '未知标题';
                    }
                } catch (err) {
                    console.error(`获取标题失败 ${item.bvid}:`, err);
                    list[index].title = '加载失败';
                }
            }));
        }
        res.json({ success: true, list: list });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default app;
// module.exports = app;
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
