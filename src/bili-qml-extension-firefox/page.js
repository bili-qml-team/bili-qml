// page.js
const API_BASE = 'https://www.bili-qml.top/api';

function getQueryRange() {
    try {
        const params = new URLSearchParams(location.search);
        const range = params.get('range');
        if (range === 'realtime' || range === 'daily' || range === 'weekly' || range === 'monthly') {
            return range;
        }
    } catch {
        // ignore
    }
    return 'realtime';
}

document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = document.getElementById('leaderboard');
    const tabs = document.querySelectorAll('.tab-btn');

    async function fetchLeaderboard(range = 'realtime') {
        leaderboard.innerHTML = '<div class="loading">加载中...</div>';
        try {
            const response = await fetch(`${API_BASE}/leaderboard?range=${range}`);
            const data = await response.json();

            if (data.success && data.list.length > 0) {
                renderList(data.list);
            } else {
                leaderboard.innerHTML = '<div class="loading">暂无数据</div>';
            }
        } catch (error) {
            console.error('获取排行榜失败:', error);
            leaderboard.innerHTML = '<div class="loading">获取排行榜失败，请确保服务器已启动。</div>';
        }
    }

    function renderList(list) {
        leaderboard.innerHTML = '';
        list.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `
                <div class="rank">${index + 1}</div>
                <div class="info">
                    <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="title" title="${item.title}">${item.title}</a>
                    <div class="count">❓ 抽象指数: ${item.count}</div>
                </div>
            `;
            leaderboard.appendChild(div);
        });
    }

    function setActiveTab(range) {
        tabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.range === range);
        });
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const range = tab.dataset.range;
            if (!range) return;
            setActiveTab(range);
            fetchLeaderboard(range);

            const url = new URL(location.href);
            url.searchParams.set('range', range);
            history.replaceState(null, '', url.toString());
        });
    });

    const initialRange = getQueryRange();
    setActiveTab(initialRange);
    fetchLeaderboard(initialRange);
});
