const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');
const {Redis} = require('@upstash/redis');

const app = express();
const PORT = process.env.PORT || 3000;

const TIMESTAP_EXPIRE_MS=process.env.TIMESTAP_EXPIRE_MS || 30 * 24 * 3600 * 1000; //排行榜总数据过期时间
const CACHE_EXPIRE_MS=process.env.CACHE_EXPIRE_MS || 300 * 1000; // 排行榜cache过期时间
const leaderboardTimeInterval=[12 * 3600 * 1000,24 * 3600 * 1000,7* 24 * 3600 * 1000,30 * 24 * 3600 * 1000]; //排行榜相差时间

var leaderBoardCache={
    caches:[],
    expireTime:0
};

const redis = Redis.fromEnv();

async function getLeaderBoardFromTime(periodMs = 24 * 3600 * 1000, limit = 50){
    const now = Date.now();
    const minTime = now - periodMs;
    await redis.zremrangebyscore('votes:recent', '-inf', now - TIMESTAP_EXPIRE_MS - 1);
    const recentVotes = await redis.zrange('votes:recent', minTime, now, { byScore: true });
    const counts = {};
    for (const member of recentVotes) {
        const bvid = member.split(':')[0];  // 从 `${bvid}:${userId}` 提取
        counts[bvid] = (counts[bvid] || 0) + 1;
    }
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit);
    return sorted;
}

async function getLeaderBoard(range){
    const now = Date.now();
    if(leaderBoardCache.expireTime<now){
        var cache=[];
        leaderBoardCache.expireTime=Date.now()+CACHE_EXPIRE_MS;
        leaderBoardCache.caches=await Promise.all(leaderboardTimeInterval.map((time)=>{
            return getLeaderBoardFromTime(time);
        }));
    }
    switch(range){ //滑动窗口榜单 以UNIX时间戳计算
        case "realtime":
            return leaderBoardCache.caches[0];
            break;
        case "daily":
            return leaderBoardCache.caches[1];
            break;
        case "weekly":
            return leaderBoardCache.caches[2];
            break;
        case "monthly":
            return leaderBoardCache.caches[3];
            break;
    }
}

// 服务器逻辑区

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

// 处理投票
app.post(['/api/vote', '/vote'], async (req, res) => {
    try {
        const { bvid, title, userId } = req.body;
        
        // 1. 基础参数校验
        if (!bvid || !userId) return res.status(400).json({ success: false, error: 'Missing params' });
        // 用户投票记录
        const voted = await redis.sadd(`voted:${bvid}`, userId);
        if (voted === 0) return res.status(400).json({ success: false, error: 'Already Voted' });
        // 总票统计
        await redis.hincrby(`video:${bvid}`, 'votesTotal', 1);
        // 排行榜时间戳记录
        const now = Date.now();
        await redis.zadd('votes:recent',{score: now,member: `${bvid}:${userId}`});
        res.json({ success: true});
    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取状态
app.get(['/api/status', '/status'], async (req, res) => {
    const { bvid, userId } = req.query;
    try{
    const isVoted = (await redis.sismember(`voted:${bvid}`, userId))===1?true:false;
    const totalCount = await redis.hget(`video:${bvid}`, 'votesTotal');
    }catch(error){
        res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, active: !!isVoted, count: totalCount });
});

// 获取排行榜
app.get(['/api/leaderboard', '/leaderboard'], async (req, res) => {
    const range = req.query.range || 'realtime';
    try{
    const board=await getLeaderBoard(range);
    }catch(error){
        res.status(500).json({ success: false, error: error.message });
    }
    const list=board.map((array) => {return {bvid: array[0],count: array[1]}});
    res.json({ success: true, list: list});
});

module.exports = app;
//未知实际部署方式，故添加下列独立运行代码
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bili投票服务器已启动：http://localhost:${PORT}`);
});
