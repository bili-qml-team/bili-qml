const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis 配置
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Altcha 配置
const { createChallenge, verifySolution } = require('altcha-lib');
const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'bili-qml-default-dev-key-change-in-production';

// 频率限制配置 (Serverless 兼容，基于 Redis)
const VOTE_LIMIT = { max: 5, windowSec: 60 };         // 每分钟5次投票
const LEADERBOARD_LIMIT = { max: 10, windowSec: 60 }; // 每分钟10次排行榜

// 基于 Redis 的频率限制检查
async function checkRateLimit(key, limit) {
    const redisKey = `ratelimit:${key}`;
    try {
        // INCR 原子操作增加计数
        const countRes = await fetch(`${REDIS_URL}/incr/${redisKey}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const countData = await countRes.json();
        const count = countData.result || 1;

        // 首次请求时设置过期时间
        if (count === 1) {
            await fetch(`${REDIS_URL}/expire/${redisKey}/${limit.windowSec}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
            });
        }

        return {
            exceeded: count > limit.max,
            remaining: Math.max(0, limit.max - count),
            count
        };
    } catch (e) {
        console.error('Rate limit check failed:', e);
        return { exceeded: false, remaining: limit.max }; // 失败时放行
    }
}

// 辅助函数：与 Redis 交互
async function getDB() {
    try {
        const res = await fetch(`${REDIS_URL}/get/votes`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const data = await res.json();
        if (!data.result) return {};

        let parsed = JSON.parse(data.result);
        // 如果解析出来还是字符串（双重序列化），再解析一次
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        console.error('Redis 读取失败', e);
        return {};
    }
}

async function setDB(data) {
    try {
        await fetch(`${REDIS_URL}/set/votes`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
            body: JSON.stringify(data) // 只进行一次序列化
        });
    } catch (e) {
        console.error('Redis 写入失败', e);
    }
}

app.use(cors({
    origin: ['https://www.bilibili.com', 'chrome-extension://*'],
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

        // 强行清洗标题：防止恶意内容展示
        if (title) {
            const forbidden = /服务器|入侵|hack|attack|admin|system|database|root/i;
            if (forbidden.test(title)) {
                // 发现敏感词，不报错，但悄悄把标题改掉，让攻击者“白费力气”
                req.body.title = "未知视频 (已拦截违规内容)";
            } else {
                // 限制长度，防止数据库压力
                req.body.title = String(title).substring(0, 50).trim();
            }
        }

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

// Altcha 挑战生成端点
app.get(['/api/altcha/challenge', '/altcha/challenge'], async (req, res) => {
    try {
        const challenge = await createChallenge({
            hmacKey: ALTCHA_HMAC_KEY,
            maxNumber: 50000, // 中等难度，约需1-3秒解决
            expires: new Date(Date.now() + 5 * 60 * 1000), // 5分钟过期
        });
        res.json(challenge);
    } catch (error) {
        console.error('Altcha challenge generation error:', error);
        res.status(500).json({ error: 'Failed to generate challenge' });
    }
});

// 处理投票
app.post(['/api/vote', '/vote'], async (req, res) => {
    try {
        const { bvid, title, userId, altcha } = req.body;

        // 1. 基础参数校验
        if (!bvid || !userId) return res.status(400).json({ success: false, error: 'Missing params' });

        // 2. BVID 格式强校验
        if (!bvid.startsWith('BV') || bvid.length < 10) {
            return res.status(400).json({ success: false, error: 'Invalid BVID' });
        }

        // 3. 频率限制检查
        const rateLimitKey = `vote:${userId}`;
        const rateLimit = await checkRateLimit(rateLimitKey, VOTE_LIMIT);

        if (rateLimit.exceeded) {
            // 超过频率限制，检查是否携带 Altcha 验证
            if (!altcha) {
                return res.json({
                    success: false,
                    requiresCaptcha: true,
                    message: '检测到频繁操作，请完成人机验证'
                });
            }

            // 验证 Altcha payload
            try {
                const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
                if (!isValid) {
                    return res.status(400).json({ success: false, error: '验证失败，请重试' });
                }
                // 验证成功，重置频率计数
                await fetch(`${REDIS_URL}/del/ratelimit:${rateLimitKey}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
                });
            } catch (verifyError) {
                console.error('Altcha verification error:', verifyError);
                return res.status(400).json({ success: false, error: '验证处理失败' });
            }
        }

        // 3. 标题清洗 (防御重点)
        // 截断过长的标题，并过滤恶意词汇
        let safeTitle = (title || '未知视频').substring(0, 80).trim();
        const sensitiveWords = ['服务器', '入侵', 'hack', 'admin', 'system', 'root', '脚本', '刷榜'];
        if (sensitiveWords.some(word => safeTitle.toLowerCase().includes(word))) {
            safeTitle = '内容包含敏感词已过滤';
        }

        let data = await getDB();

        // 确保 data 是对象且包含 bvid 路径
        if (!data || typeof data !== 'object') data = {};
        if (!data[bvid] || typeof data[bvid] !== 'object') {
            data[bvid] = { title: safeTitle, votes: {} };
        } else {
            // 如果已有该视频，且标题是“未知视频”或包含敏感词，则更新为当前清洗后的标题
            if (data[bvid].title === '未知视频' || data[bvid].title === '内容包含敏感词已过滤') {
                data[bvid].title = safeTitle;
            }
        }
        if (!data[bvid].votes) {
            data[bvid].votes = {};
        }

        let active = false;
        if (data[bvid].votes[userId]) {
            delete data[bvid].votes[userId];
            active = false;
        } else {
            data[bvid].votes[userId] = Date.now();
            active = true;
        }

        await setDB(data);
        res.json({ success: true, active });
    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取状态
app.get(['/api/status', '/status'], async (req, res) => {
    const { bvid, userId } = req.query;
    const data = await getDB();
    const videoData = data[bvid] || { votes: {} };
    const isVoted = videoData.votes[userId];
    const totalCount = Object.keys(videoData.votes).length;
    res.json({ success: true, active: !!isVoted, count: totalCount });
});

// 获取排行榜
app.get(['/api/leaderboard', '/leaderboard'], async (req, res) => {
    const range = req.query.range || 'realtime';
    const altcha = req.query.altcha;

    // 获取客户端 IP 用于频率限制
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.ip ||
        'unknown';

    // 频率限制检查
    const rateLimitKey = `leaderboard:${clientIP}`;
    const rateLimit = await checkRateLimit(rateLimitKey, LEADERBOARD_LIMIT);

    if (rateLimit.exceeded) {
        if (!altcha) {
            return res.json({
                success: false,
                requiresCaptcha: true,
                message: '请求过于频繁，请完成人机验证'
            });
        }

        // 验证 Altcha payload
        try {
            const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
            if (!isValid) {
                return res.status(400).json({ success: false, error: '验证失败，请重试' });
            }
            // 验证成功，重置频率计数
            await fetch(`${REDIS_URL}/del/ratelimit:${rateLimitKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
            });
        } catch (verifyError) {
            console.error('Altcha verification error:', verifyError);
            return res.status(400).json({ success: false, error: '验证处理失败' });
        }
    }

    const data = await getDB();

    // 关键修复：强制使用北京时间 (UTC+8)
    const now = () => moment().utcOffset(8);

    let startTime = 0;
    let endTime = now().valueOf();

    if (range === 'realtime') {
        // 实时榜：今天零点至今
        startTime = now().startOf('day').valueOf();
    } else if (range === 'daily') {
        // 日榜：昨天零点到昨天 23:59:59
        startTime = now().subtract(1, 'days').startOf('day').valueOf();
        endTime = now().subtract(1, 'days').endOf('day').valueOf();
    } else if (range === 'weekly') {
        // 周榜：本周一零点至今
        startTime = now().startOf('isoWeek').valueOf();
    } else if (range === 'monthly') {
        // 月榜：本月1号零点至今
        startTime = now().startOf('month').valueOf();
    }

    const list = [];
    for (const bvid in data) {
        const video = data[bvid];
        // 过滤在指定时间范围内的投票
        const validVotesCount = Object.values(video.votes).filter(ts => ts >= startTime && ts <= endTime).length;
        if (validVotesCount > 0) {
            list.push({ bvid, title: video.title, count: validVotesCount });
        }
    }

    const sortedList = list.sort((a, b) => b.count - a.count).slice(0, 5);
    res.json({ success: true, list: sortedList });
});

module.exports = app;
