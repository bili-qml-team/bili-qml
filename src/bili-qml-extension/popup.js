// popup.js

function getExtensionUrl(path) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
    }
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        return browser.runtime.getURL(path);
    }
    return path;
}

// HTML转义函数，防止特殊字符破坏HTML结构
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}


document.addEventListener('DOMContentLoaded', () => {


    browserStorage.sync.get(['theme'], (result) => {
        if (result.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (result.theme === 'light') {
            document.body.classList.add('light-mode');
        }
    });


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

    const leaderboard = document.getElementById('leaderboard');
    const settingsPanel = document.getElementById('settings');
    const settingsWrapper = document.getElementById('settings-wrapper');
    const tabs = document.querySelectorAll('.tab-btn');

    function openPageWithRange() {
        const activeTab = document.querySelector('.tab-btn.active');
        const range = activeTab?.dataset?.range || 'realtime';
        const url = `${getExtensionUrl('page.html')}?range=${encodeURIComponent(range)}`;
        window.open(url, '_blank');
    }

    const pageBtn = document.getElementById('page-btn');
    if (pageBtn) {
        pageBtn.addEventListener('click', openPageWithRange);
    }

    const fullLeaderboardBtn = document.getElementById('full-leaderboard-btn');
    if (fullLeaderboardBtn) {
        fullLeaderboardBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active');
            const range = activeTab?.dataset?.range || 'realtime';
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: `leaderboard.html?range=${range}` });
            } else if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.create) {
                browser.tabs.create({ url: `leaderboard.html?range=${range}` });
            } else {
                window.open(`leaderboard.html?range=${range}`, '_blank');
            }
        });
    }

    // 主题切换
    const themeRadioSystem = document.querySelector('input[name="theme-pref"][value="system"]');
    const themeRadioLight = document.querySelector('input[name="theme-pref"][value="light"]');
    const themeRadioDark = document.querySelector('input[name="theme-pref"][value="dark"]');
    if (themeRadioSystem) {
        themeRadioSystem.onclick = () => {
            const classList = [...document.body.classList];
            classList.forEach(className => {
                document.body.classList.remove(className);
            });
            browserStorage.sync.set({ theme: 'system' });
        };
    };
    if (themeRadioLight) {
        themeRadioLight.onclick = () => {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            browserStorage.sync.set({ theme: 'light' });
        };
    };
    if (themeRadioDark) {
        themeRadioDark.onclick = () => {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            browserStorage.sync.set({ theme: 'dark' });
        };
    };
    // 加载排行榜
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

            if (data.success && data.list.length > 0) {
                await renderList(data.list);
            } else {
                leaderboard.innerHTML = '<div class="loading">暂无数据</div>';
            }
        } catch (error) {
            console.error('获取排行榜失败:', error);
            leaderboard.innerHTML = '<div class="loading">获取排行榜失败，请确保服务器已启动。</div>';
        }
    }

    async function renderList(list) {
        leaderboard.innerHTML = '';
        // 获取设置
        const settings = await browserStorage.sync.get(['rank1Setting']);
        const rank1Custom = (settings.rank1Setting || 'custom') === 'custom';

        await Promise.all(list.map(async (item, index) => {
            try {
                let cache = {};
                const conn = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${item.bvid}`);
                const json = await conn.json();
                if (json.code === 0 && json.data?.title) {
                    cache.title = json.data.title;
                } else {
                    cache.title = '未知标题';
                }
                cache.bvid = item.bvid;
                cache.count = item.count;
                renderEntry(cache, index + 1, rank1Custom)
            } catch (err) {
                console.error(`获取标题失败 ${item.bvid}:`, err);
                cache.title = '加载失败';
            }
        }));
    }
    function renderEntry(item, index, rank1Custom) {
        const div = document.createElement('div');
        div.className = 'item';

        let rankDisplay = index;
        let rankHtmlClass = 'rank';
        if (index === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankHtmlClass += ' rank-custom';
        }

        // 对数据进行HTML转义，防止特殊字符破坏HTML结构
        const escapedTitle = escapeHtml(item.title);
        const escapedBvid = escapeHtml(item.bvid);
        const escapedCount = escapeHtml(String(item.count));

        div.innerHTML = `
            <div class="${rankHtmlClass}">${rankDisplay}</div>
            <div class="info">
                <a href="https://www.bilibili.com/video/${escapedBvid}" target="_blank" class="title" title="${escapedTitle}">${escapedTitle}</a>
                <div class="count">❓ 抽象指数: ${escapedCount}</div>
            </div>
        `;
        leaderboard.appendChild(div);
        const allItems = Array.from(document.querySelectorAll('.item'));
        const nextItem = allItems.find(el => {
            // 需要处理 '何一位' 这种非数字的情况，确保排序正确
            const rankText = el.querySelector('.rank')?.textContent || '999999';
            let rank = parseInt(rankText);
            if (rankText === '何一位') rank = 1;

            return rank >= index;
        });
        if (nextItem) {
            nextItem.before(div);
        } else {
            leaderboard.appendChild(div);
        }
    }

    // 加载设置
    async function loadSettings() {
        return new Promise((resolve) => {
            browserStorage.sync.get([STORAGE_KEY_DANMAKU_PREF, STORAGE_KEY_API_ENDPOINT, 'rank1Setting'], (result) => {
                // 弹幕偏好设置
                const preference = result[STORAGE_KEY_DANMAKU_PREF];
                let value = 'ask'; // 默认每次询问

                if (preference === true) {
                    value = 'always';
                } else if (preference === false) {
                    value = 'never';
                }

                // 设置选中的单选按钮
                const radio = document.querySelector(`input[name="danmaku-pref"][value="${value}"]`);
                if (radio) {
                    radio.checked = true;
                }

                // First Rank Display Setting
                const rank1Setting = result.rank1Setting || 'custom';
                const rank1Radio = document.querySelector(`input[name="rank1-pref"][value="${rank1Setting}"]`);
                if (rank1Radio) {
                    rank1Radio.checked = true;
                }

                // Endpoint 设置
                const endpointInput = document.getElementById('endpoint-input');
                if (endpointInput) {
                    endpointInput.value = result[STORAGE_KEY_API_ENDPOINT] || '';
                }

                resolve();
            });
        });
    }

    // 保存设置
    async function saveSettings() {
        const selectedRadio = document.querySelector('input[name="danmaku-pref"]:checked');
        const rank1Radio = document.querySelector('input[name="rank1-pref"]:checked');
        const endpointInput = document.getElementById('endpoint-input');
        const endpointValue = endpointInput ? endpointInput.value.trim() : '';

        // 处理弹幕偏好
        let preference = null;
        if (selectedRadio) {
            const value = selectedRadio.value;
            if (value === 'always') {
                preference = true;
            } else if (value === 'never') {
                preference = false;
            }
        }

        // Handle Rank 1 Setting
        const rank1Setting = rank1Radio ? rank1Radio.value : 'default';

        return new Promise((resolve) => {
            const updates = {};
            const removals = [];

            // 弹幕偏好
            if (preference === null) {
                removals.push(STORAGE_KEY_DANMAKU_PREF);
            } else {
                updates[STORAGE_KEY_DANMAKU_PREF] = preference;
            }

            updates['rank1Setting'] = rank1Setting;

            // Endpoint 设置
            if (endpointValue && endpointValue !== DEFAULT_API_BASE) {
                updates[STORAGE_KEY_API_ENDPOINT] = endpointValue;
                API_BASE = endpointValue;
            } else {
                removals.push(STORAGE_KEY_API_ENDPOINT);
                API_BASE = DEFAULT_API_BASE;
            }

            // 执行存储操作
            const doSave = () => {
                if (Object.keys(updates).length > 0) {
                    browserStorage.sync.set(updates, () => {
                        showSaveStatus('设置已保存');
                        resolve();
                    });
                } else {
                    showSaveStatus('设置已保存');
                    resolve();
                }
            };

            if (removals.length > 0) {
                browserStorage.sync.remove(removals, doSave);
            } else {
                doSave();
            }
        });
    }

    // 显示保存状态提示
    function showSaveStatus(message) {
        const statusDiv = document.getElementById('save-status');
        statusDiv.textContent = message;
        statusDiv.style.opacity = '1';

        setTimeout(() => {
            statusDiv.style.opacity = '0';
        }, 2000);
    }

    // 切换面板
    function switchPanel(panelType) {
        if (panelType === 'settings') {
            leaderboard.style.display = 'none';
            if (settingsWrapper) settingsWrapper.style.display = 'flex';
            document.querySelector('.tabs').style.display = 'none'; // 隐藏排行榜Tab
            loadSettings();
        } else {
            leaderboard.style.display = 'block';
            if (settingsWrapper) settingsWrapper.style.display = 'none';
            document.querySelector('.tabs').style.display = 'flex'; // 显示排行榜Tab
        }
    }

    // 标签页点击事件
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            switchPanel('leaderboard');
            fetchLeaderboard(tab.dataset.range);
        });
    });

    // 齿轮图标点击事件
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // 如果当前在设置页，则返回排行榜（toggle效果）
            if (settingsWrapper && settingsWrapper.style.display === 'flex') {
                switchPanel('leaderboard');
            } else {
                switchPanel('settings');
            }
        });
    }

    // 保存设置按钮
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveSettings();
            // 保存后自动返回
            setTimeout(() => {
                switchPanel('leaderboard');
            }, 500);
        });
    }

    // 重置 Endpoint 按钮
    const resetEndpointBtn = document.getElementById('reset-endpoint');
    if (resetEndpointBtn) {
        resetEndpointBtn.addEventListener('click', () => {
            const endpointInput = document.getElementById('endpoint-input');
            if (endpointInput) {
                endpointInput.value = DEFAULT_API_BASE;
            }
        });
    }

    // 初始化 API_BASE 后加载排行榜
    initApiBase().then(() => {
        fetchLeaderboard();
    });
});
