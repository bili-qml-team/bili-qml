const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis 配置
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 辅助函数：与 Redis 交互
async function getDB() {
    try {
        const res = await fetch(`${REDIS_URL}/get/votes`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const data = await res.json();
        return data.result ? JSON.parse(data.result) : {};
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
            body: JSON.stringify(JSON.stringify(data))
        });
    } catch (e) {
        console.error('Redis 写入失败', e);
    }
}

app.use(cors());
app.use(bodyParser.json());

// 根路径欢迎页
app.get('/', (req, res) => {
    res.send('<h1>B站问号榜服务器已启动 ❓</h1><p>已连接至云数据库。</p>');
});

// 处理投票
app.post(['/api/vote', '/vote'], async (req, res) => {
    const { bvid, title, userId } = req.body;
    if (!bvid || !userId) return res.status(400).json({ success: false });

    let data = await getDB();
    
    // 确保视频对象存在
    if (!data[bvid]) {
        data[bvid] = { title: title || '未知视频', votes: {} };
    }
    
    // 再次确保 votes 属性存在（防御性编程）
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
    const range = req.query.range || 'daily';
    const data = await getDB();
    
    let startTime = 0;
    if (range === 'daily') startTime = moment().startOf('day').valueOf();
    else if (range === 'weekly') startTime = moment().startOf('week').valueOf();
    else if (range === 'monthly') startTime = moment().startOf('month').valueOf();

    const list = [];
    for (const bvid in data) {
        const video = data[bvid];
        const validVotesCount = Object.values(video.votes).filter(ts => ts >= startTime).length;
        if (validVotesCount > 0) {
            list.push({ bvid, title: video.title, count: validVotesCount });
        }
    }

    const sortedList = list.sort((a, b) => b.count - a.count).slice(0, 10);
    res.json({ success: true, list: sortedList });
});

module.exports = app;
