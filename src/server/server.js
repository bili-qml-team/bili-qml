const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'votes.json');

// 安全读取数据的辅助函数
function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        if (!content || content.trim() === '') return {};
        return JSON.parse(content);
    } catch (e) {
        console.error('读取数据失败，初始化为空对象', e);
        return {};
    }
}

// 确保数据目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

app.use(cors());
app.use(bodyParser.json());

// 根路径欢迎页
app.get('/', (req, res) => {
    res.send('<h1>B站问号榜服务器已启动 ❓</h1><p>这是一个 API 服务器，请通过插件进行交互。</p>');
});

// 处理投票（切换状态）
app.post('/api/vote', (req, res) => {
    const { bvid, title, userId } = req.body;
    if (!bvid || !userId) {
        return res.status(400).json({ success: false, message: 'Missing bvid or userId' });
    }

    let data = readData();
    
    // 如果该视频还没记录，初始化它
    if (!data[bvid]) {
        data[bvid] = { title, votes: {} };
    }

    let active = false;
    if (data[bvid].votes[userId]) {
        // 如果该用户已投过票，则删除（取消点亮）
        delete data[bvid].votes[userId];
        active = false;
    } else {
        // 如果没投过，则添加（点亮）
        data[bvid].votes[userId] = Date.now();
        active = true;
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, active });
});

// 获取用户对特定视频的状态及总计数
app.get('/api/status', (req, res) => {
    const { bvid, userId } = req.query;
    const data = readData();
    
    const videoData = data[bvid] || { votes: {} };
    const isVoted = videoData.votes[userId];
    const totalCount = Object.keys(videoData.votes).length;

    res.json({ success: true, active: !!isVoted, count: totalCount });
});

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
    const range = req.query.range || 'daily';
    const data = readData();
    
    let startTime;
    if (range === 'daily') {
        startTime = moment().startOf('day').valueOf();
    } else if (range === 'weekly') {
        startTime = moment().startOf('week').valueOf();
    } else if (range === 'monthly') {
        startTime = moment().startOf('month').valueOf();
    } else {
        startTime = 0;
    }

    const list = [];

    // 遍历每个视频
    for (const bvid in data) {
        const video = data[bvid];
        // 过滤出在时间范围内的投票
        const validVotesCount = Object.values(video.votes).filter(ts => ts >= startTime).length;
        
        if (validVotesCount > 0) {
            list.push({
                bvid: bvid,
                title: video.title,
                count: validVotesCount
            });
        }
    }

    // 排序并取前 10
    const sortedList = list
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    res.json({ success: true, list: sortedList });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
