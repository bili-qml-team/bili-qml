// popup.js
const API_BASE = 'https://www.bili-qml.top/api';

document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = document.getElementById('leaderboard');
    const tabs = document.querySelectorAll('.tab-btn');
    let currentRange = 'realtime';

    // 加载 Altcha widget 脚本
    function loadAltchaScript() {
        return new Promise((resolve) => {
            if (document.querySelector('script[src*="altcha"]')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/altcha@latest/dist/altcha.min.js';
            script.type = 'module';
            script.async = true;
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    // 显示验证界面
    async function showCaptchaUI() {
        await loadAltchaScript();

        return new Promise((resolve, reject) => {
            leaderboard.innerHTML = `
                <div class="captcha-container" style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 16px; color: #61666d;">🤖 请求过于频繁，请完成验证</p>
                    <altcha-widget 
                        challengeurl="${API_BASE}/altcha/challenge"
                        hidelogo
                        hidefooter
                    ></altcha-widget>
                    <button id="cancel-captcha" style="
                        margin-top: 16px;
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        background: #f5f5f5;
                        cursor: pointer;
                    ">取消</button>
                </div>
            `;

            // 等待 widget 初始化
            setTimeout(() => {
                const widget = leaderboard.querySelector('altcha-widget');
                if (widget) {
                    widget.addEventListener('verified', (e) => {
                        resolve(e.detail.payload);
                    });
                }
            }, 100);

            document.getElementById('cancel-captcha')?.addEventListener('click', () => {
                reject(new Error('用户取消验证'));
            });
        });
    }

    async function fetchLeaderboard(range = 'realtime', altchaPayload = null) {
        currentRange = range;
        leaderboard.innerHTML = '<div class="loading">加载中...</div>';

        try {
            let url = `${API_BASE}/leaderboard?range=${range}`;
            if (altchaPayload) {
                url += `&altcha=${encodeURIComponent(altchaPayload)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            // 检查是否需要人机验证
            if (data.requiresCaptcha) {
                try {
                    const payload = await showCaptchaUI();
                    // 验证成功，重新请求
                    return fetchLeaderboard(range, payload);
                } catch (captchaError) {
                    leaderboard.innerHTML = '<div class="loading">已取消验证</div>';
                    return;
                }
            }

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

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fetchLeaderboard(tab.dataset.range);
        });
    });

    // 默认加载实时榜
    fetchLeaderboard();
});
