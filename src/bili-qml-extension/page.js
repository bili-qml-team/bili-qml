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

// ==================== Altcha CAPTCHA 功能 ====================

// 获取 Altcha 挑战
async function fetchAltchaChallenge() {
    const response = await fetch(`${API_BASE}/altcha/challenge`);
    if (!response.ok) throw new Error('Failed to fetch challenge');
    return response.json();
}

// 解决 Altcha 挑战 (Proof-of-Work)
async function solveAltchaChallenge(challenge) {
    const { algorithm, challenge: challengeHash, salt, maxnumber, signature } = challenge;
    const encoder = new TextEncoder();

    for (let number = 0; number <= maxnumber; number++) {
        const data = encoder.encode(salt + number);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === challengeHash) {
            const solution = {
                algorithm,
                challenge: challengeHash,
                number,
                salt,
                signature
            };
            return btoa(JSON.stringify(solution));
        }

        if (number % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    throw new Error('Failed to solve challenge');
}

// 显示 Altcha CAPTCHA 对话框
function showAltchaCaptchaDialog() {
    return new Promise((resolve, reject) => {
        const overlay = document.createElement('div');
        overlay.id = 'qmr-captcha-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; border-radius: 12px; padding: 24px;
            width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            text-align: center;
        `;

        dialog.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
            <div style="font-size: 18px; font-weight: bold; color: #18191c; margin-bottom: 12px;">人机验证</div>
            <div id="qmr-captcha-status" style="font-size: 14px; color: #61666d; margin-bottom: 20px;">检测到频繁操作，请完成验证</div>
            <div id="qmr-captcha-progress" style="display: none; margin-bottom: 20px;">
                <div style="width: 100%; height: 6px; background: #e3e5e7; border-radius: 3px; overflow: hidden;">
                    <div id="qmr-captcha-bar" style="width: 0%; height: 100%; background: #00aeec; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 12px; color: #9499a0; margin-top: 8px;">正在验证中...</div>
            </div>
            <div id="qmr-captcha-buttons">
                <button id="qmr-captcha-start" type="button" style="
                    padding: 10px 32px; border: none; border-radius: 6px;
                    background: #00aeec; color: white; cursor: pointer;
                    font-size: 14px; transition: all 0.2s;
                ">开始验证</button>
                <button id="qmr-captcha-cancel" type="button" style="
                    padding: 10px 20px; border: 1px solid #e3e5e7; border-radius: 6px;
                    background: white; color: #61666d; cursor: pointer;
                    font-size: 14px; margin-left: 12px; transition: all 0.2s;
                ">取消</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const startBtn = dialog.querySelector('#qmr-captcha-start');
        const cancelBtn = dialog.querySelector('#qmr-captcha-cancel');
        const statusDiv = dialog.querySelector('#qmr-captcha-status');
        const progressDiv = dialog.querySelector('#qmr-captcha-progress');
        const buttonsDiv = dialog.querySelector('#qmr-captcha-buttons');

        startBtn.addEventListener('mouseenter', () => startBtn.style.background = '#00a1d6');
        startBtn.addEventListener('mouseleave', () => startBtn.style.background = '#00aeec');

        cancelBtn.onclick = () => {
            overlay.remove();
            reject(new Error('CAPTCHA cancelled'));
        };

        startBtn.onclick = async () => {
            try {
                buttonsDiv.style.display = 'none';
                progressDiv.style.display = 'block';
                statusDiv.textContent = '正在获取验证挑战...';

                const challenge = await fetchAltchaChallenge();
                statusDiv.textContent = '正在计算验证...';

                const progressBar = dialog.querySelector('#qmr-captcha-bar');
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress = Math.min(progress + Math.random() * 15, 95);
                    progressBar.style.width = progress + '%';
                }, 200);

                const solution = await solveAltchaChallenge(challenge);

                clearInterval(progressInterval);
                progressBar.style.width = '100%';
                statusDiv.textContent = '验证成功！';

                setTimeout(() => {
                    overlay.remove();
                    resolve(solution);
                }, 500);
            } catch (error) {
                statusDiv.textContent = '验证失败: ' + error.message;
                statusDiv.style.color = '#ff4d4f';
                buttonsDiv.style.display = 'block';
                progressDiv.style.display = 'none';
            }
        };

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                reject(new Error('CAPTCHA cancelled'));
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = document.getElementById('leaderboard');
    const tabs = document.querySelectorAll('.tab-btn');
    const videoInfoCache = new Map();

    async function fetchLeaderboard(range = 'realtime', altchaSolution = null) {
        leaderboard.innerHTML = '<div class="loading">加载中...</div>';
        try {
            let url = `${API_BASE}/leaderboard?range=${range}&type=2`;
            if (altchaSolution) {
                url += `&altcha=${encodeURIComponent(altchaSolution)}`;
            }
            const response = await fetch(url);
            const data = await response.json();

            // 处理频率限制，需要 CAPTCHA 验证
            if (data.requiresCaptcha) {
                leaderboard.innerHTML = '<div class="loading">需要人机验证...</div>';
                try {
                    const solution = await showAltchaCaptchaDialog();
                    return fetchLeaderboard(range, solution);
                } catch (captchaError) {
                    leaderboard.innerHTML = '<div class="loading">验证已取消</div>';
                    return;
                }
            }

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
