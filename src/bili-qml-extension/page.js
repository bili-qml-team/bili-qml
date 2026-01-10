// page.js
const API_BASE = 'https://bili-qml.bydfk.com/api';

function formatCount(num) {
    const n = Number(num) || 0;
    if (n >= 100000000) {
        const v = n / 100000000;
        return `${v >= 10 ? Math.round(v) : v.toFixed(1)}亿`;
    }
    if (n >= 10000) {
        const v = n / 10000;
        return `${v >= 10 ? Math.round(v) : v.toFixed(1)}万`;
    }
    return String(n);
}

async function fetchVideoInfo(bvid) {
    const tryFetch = async (url) => {
        const resp = await fetch(url, { credentials: 'include' });
        const json = await resp.json();
        if (json && json.code === 0 && json.data) return json.data;
        return null;
    };

    // Prefer wbi/view (requires SESSDATA). If it fails, fall back to view.
    return (
        (await tryFetch(`https://api.bilibili.com/x/web-interface/wbi/view?bvid=${encodeURIComponent(bvid)}`)) ||
        (await tryFetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`))
    );
}

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
    const videoInfoCache = new Map();

    async function fetchLeaderboard(range = 'realtime') {
        leaderboard.innerHTML = '<div class="loading">加载中...</div>';
        try {
            const response = await fetch(`${API_BASE}/leaderboard?range=${range}&type=2`);
            const data = await response.json();

            await Promise.all(
                (data.list || []).map(async (item, index) => {
                    const bvid = item?.bvid;
                    if (!bvid) return;
                    try {
                        if (!videoInfoCache.has(bvid)) {
                            videoInfoCache.set(bvid, fetchVideoInfo(bvid));
                        }
                        const info = await videoInfoCache.get(bvid);
                        if (info) {
                            data.list[index].title = info.title || data.list[index].title || '未知标题';
                            data.list[index].pic = info.pic;
                            data.list[index].ownerName = info.owner?.name;
                            data.list[index].view = info.stat?.view;
                            data.list[index].danmaku = info.stat?.danmaku;
                        } else {
                            data.list[index].title = data.list[index].title || '加载失败';
                        }
                    } catch (err) {
                        console.error(`获取视频信息失败 ${bvid}:`, err);
                        data.list[index].title = data.list[index].title || '加载失败';
                    }
                })
            );

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
            const title = item.title || '未知标题';
            const ownerName = item.ownerName || '';
            const viewText = item.view != null ? formatCount(item.view) : '';
            const danmakuText = item.danmaku != null ? formatCount(item.danmaku) : '';
            const pic = item.pic || '';
            div.innerHTML = `
                <div class="rank">${index + 1}</div>
                <a class="thumb" href="https://www.bilibili.com/video/${item.bvid}" target="_blank" aria-label="打开视频">
                    ${pic ? `<img src="${pic}" alt="${title}" loading="lazy" />` : ''}
                </a>
                <div class="info">
                    <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="title" title="${title}">${title}</a>
                    <div class="qml">抽象指数：${item.count}</div>
                    <div class="bottom">
                        <div class="bottom-row">
                            ${ownerName ? `<span class="bottom-item"><span class="icon">UP</span><span class="text up" title="${ownerName}">${ownerName}</span></span>` : ''}
                        </div>
                        <div class="bottom-row">
                            ${viewText ? `<span class="bottom-item"><span class="icon">▶</span><span class="text">${viewText}</span></span>` : ''}
                            ${danmakuText ? `<span class="bottom-item"><span class="icon">弹</span><span class="text">${danmakuText}</span></span>` : ''}
                        </div>
                    </div>
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
