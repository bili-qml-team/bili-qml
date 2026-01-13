// leaderboard.js

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('leaderboard-grid');
    const tabs = document.querySelectorAll('.tab-btn');
    let currentRange = 'realtime';


    initApiBase().then(() => {
        fetchLeaderboard(currentRange);
    });

    // 切换主题
    const themeToggleBtn = document.getElementById('theme-toggle');
    // 默认浅色模式。如果保存了'dark'，则应用暗色模式。
    browserStorage.sync.get(['theme'], (result) => {
        const classList = [...document.body.classList];
        classList.forEach(className => {
            document.body.classList.remove(className);
        });
        if (result.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (result.theme === 'light') {
            document.body.classList.add('light-mode');
        }
    });

    // 监听其他标签页/Popup的主题变更
    browserStorage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.theme) {
            const classList = [...document.body.classList];
            classList.forEach(className => {
                document.body.classList.remove(className);
            });
            if (changes.theme.newValue === 'dark') {
                document.body.classList.add('dark-mode');
            } else if (changes.theme.newValue === 'light') {
                document.body.classList.add('light-mode');
            }
        }
    });

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const { matches } = window.matchMedia('(prefers-color-scheme: dark)');

            const changeThemeDark = () => {
                const classList = [...document.body.classList];
                classList.forEach(className => {
                    document.body.classList.remove(className);
                });
                document.body.classList.add('dark-mode');
                browserStorage.sync.set({ theme: 'dark' });
            }

            const changeThemeLight = () => {
                const classList = [...document.body.classList];
                classList.forEach(className => {
                    document.body.classList.remove(className);
                });
                document.body.classList.add('light-mode');
                browserStorage.sync.set({ theme: 'light' });
            }

            if (matches) {
                if (document.body.className === 'light-mode') {
                    changeThemeDark();
                } else if (matches || document.body.className === 'dark-mode') {
                    changeThemeLight();
                }
            } else {
                if (document.body.className === 'dark-mode') {
                    changeThemeLight();
                } else if (!matches || document.body.className === 'light-mode') {
                    changeThemeDark();
                }
            }
        });
    }


    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentRange = tab.dataset.range;
            fetchLeaderboard(currentRange);
        });
    });

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

    async function fetchLeaderboard(range = 'realtime', altchaSolution = null) {
        showLoading();

        try {
            let url = `${API_BASE}/leaderboard?range=${range}&type=2`;
            if (altchaSolution) {
                url += `&altcha=${encodeURIComponent(altchaSolution)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            // Handle CAPTCHA
            if (data.requiresCaptcha) {
                try {
                    const solution = await showAltchaCaptchaDialog();
                    return fetchLeaderboard(range, solution);
                } catch (captchaError) {
                    showError('验证已取消，无法获取数据。');
                    return;
                }
            }

            if (data.success && data.list.length > 0) {
                await renderList(data.list);
            } else {
                showEmpty();
            }

        } catch (error) {
            console.error('Fetch error:', error);
            showError('连接服务器失败，请稍后重试。');
        }
    }

    async function renderList(list) {
        grid.innerHTML = '';

        // 获取设置
        const settings = await new Promise(resolve => browserStorage.sync.get(['rank1Setting'], resolve));
        const rank1Custom = (settings.rank1Setting || 'custom') === 'custom';


        const renderedItems = await Promise.all(list.map(async (item, index) => {
            let details = {
                title: '加载中...',
                pic: '',
                ownerName: '',
                view: null,
                danmaku: null
            };

            try {
                const info = await fetchVideoInfo(item.bvid);
                if (info) {
                    details.title = info.title || '未知标题';
                    details.pic = info.pic;
                    details.ownerName = info.owner?.name;
                    details.view = info.stat?.view;
                    details.danmaku = info.stat?.danmaku;
                }
            } catch (e) {
                console.warn(`Failed to fetch meta for ${item.bvid}`, e);
                details.title = `Video ${item.bvid}`;
            }

            return createCardHTML(item, index + 1, details, rank1Custom);
        }));

        grid.innerHTML = renderedItems.join('');


        const cards = grid.querySelectorAll('.video-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 50); // 50ms delay per card
        });
    }

    async function fetchVideoInfo(bvid) {
        const tryFetch = async (url) => {
            try {
                const resp = await fetch(url);
                const json = await resp.json();
                if (json && json.code === 0 && json.data) return json.data;
            } catch (e) { /* 忽略 */ }
            return null;
        };

        return (
            (await tryFetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`)) ||
            null
        );
    }

    function createCardHTML(item, rank, details, rank1Custom) {
        let rankDisplay = rank <= 3 ? rank : `#${rank}`;

        let rankClass = rank <= 3 ? `rank-${rank}` : '';

        if (rank === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankClass += ' rank-custom-text';
        }

        const safeTitle = escapeHtml(details.title);
        const picUrl = details.pic ? details.pic.replace('http:', 'https:') : '';
        const ownerName = escapeHtml(details.ownerName || '未知UP');
        const viewText = details.view != null ? formatCount(details.view) : '-';
        const danmakuText = details.danmaku != null ? formatCount(details.danmaku) : '-';

        return `
            <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="video-card">
                <div class="thumb-container">
                     ${picUrl ? `<img src="${picUrl}" alt="${safeTitle}" class="thumb-img" loading="lazy" />` : ''}
                    <span class="rank-badge ${rankClass}">${rankDisplay}</span>
                    <div class="card-header-overlay">
                         <div class="score-tag">
                            <span class="qml-icon">❓</span> ${item.count}
                        </div>
                    </div>
                </div>
                
                <div class="card-content">
                    <h3 class="video-title" title="${safeTitle}">${safeTitle}</h3>
                    
                    <div class="video-info-row">
                        <div class="owner-info">
                            <span class="owner-icon">UP</span>
                            <span class="owner-name" title="${ownerName}">${ownerName}</span>
                        </div>
                    </div>
                    
                    <div class="video-info-row" style="margin-top: 4px;">
                        <div class="stat-item" title="播放量">
                            <span>▶</span> ${viewText}
                        </div>
                        <div class="stat-item" title="弹幕数">
                            <span>💬</span> ${danmakuText}
                        </div>
                    </div>
                </div>
            </a>
        `;
    }

    function showLoading() {
        grid.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>正在获取排行榜数据...</p>
            </div>
        `;
    }

    function showError(msg) {
        grid.innerHTML = `
            <div class="loading-state">
                <p style="color: #ff4d4f;">⚠️ ${msg}</p>
                <button onclick="location.reload()" class="tab-btn" style="background: rgba(255, 77, 79, 0.2); margin-top: 10px;">重试</button>
            </div>
        `;
    }

    function showEmpty() {
        grid.innerHTML = `
            <div class="loading-state">
                <p>📭 暂无数据</p>
            </div>
        `;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
