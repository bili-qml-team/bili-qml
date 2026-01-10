// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = document.getElementById('leaderboard');
    const settingsPanel = document.getElementById('settings');
    const tabs = document.querySelectorAll('.tab-btn');

    function getExtensionUrl(path) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(path);
        }
        if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
            return browser.runtime.getURL(path);
        }
        return path;
    }

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

    // 加载排行榜
    async function fetchLeaderboard(range = 'realtime') {
        leaderboard.innerHTML = '<div class="loading">加载中...</div>';
        try {
            const response = await fetch(`${API_BASE}/leaderboard?range=${range}&type=2`);
            const data = await response.json();
            await Promise.all(data.list.map(async (item, index) => {
                try {
                    const conn = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${item.bvid}`);
                    const json = await conn.json();
                    if (json.code === 0 && json.data?.title) {
                        data.list[index].title = json.data.title;
                    } else {
                        data.list[index].title = '未知标题';
                    }
                } catch (err) {
                    console.error(`获取标题失败 ${item.bvid}:`, err);
                    data.list[index].title = '加载失败';
                }
            }));
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

    // 加载设置
    async function loadSettings() {
        browserStorage.sync.get([STORAGE_KEY_DANMAKU_PREF, STORAGE_KEY_API_ENDPOINT], (result) => {
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

            // Endpoint 设置
            const endpointInput = document.getElementById('endpoint-input');
            if (endpointInput) {
                endpointInput.value = result[STORAGE_KEY_API_ENDPOINT] || '';
            }

            resolve();
        });
    }

    // 保存设置
    async function saveSettings() {
        const selectedRadio = document.querySelector('input[name="danmaku-pref"]:checked');
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

        return new Promise((resolve) => {
            const updates = {};
            const removals = [];

            // 弹幕偏好
            if (preference === null) {
                removals.push(STORAGE_KEY_DANMAKU_PREF);
            } else {
                updates[STORAGE_KEY_DANMAKU_PREF] = preference;
            }

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
                    await browserStorage.sync.set(updates, () => {
                        showSaveStatus('设置已保存');
                        resolve();
                    });
                } else {
                    showSaveStatus('设置已保存');
                    resolve();
                }
            };

            if (removals.length > 0) {
                await browserStorage.sync.remove(removals, doSave);
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
            settingsPanel.style.display = 'block';
            document.querySelector('.tabs').style.display = 'none'; // 隐藏排行榜Tab
            loadSettings();
        } else {
            leaderboard.style.display = 'block';
            settingsPanel.style.display = 'none';
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
            if (settingsPanel.style.display === 'block') {
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
