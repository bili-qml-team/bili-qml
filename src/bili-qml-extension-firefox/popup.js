// popup.js
const API_BASE = 'https://bili-qml.bydfk.com/api';
// for debug
// const API_BASE = 'http://localhost:3000/api'
const STORAGE_KEY_DANMAKU_PREF = 'danmakuPreference';

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
        return new Promise((resolve) => {
            browser.storage.sync.get([STORAGE_KEY_DANMAKU_PREF]).then((result) => {
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

                resolve();
            });
        });
    }

    // 保存设置
    async function saveSettings() {
        const selectedRadio = document.querySelector('input[name="danmaku-pref"]:checked');
        if (!selectedRadio) return;

        const value = selectedRadio.value;
        let preference;

        if (value === 'always') {
            preference = true;
        } else if (value === 'never') {
            preference = false;
        } else {
            preference = null; // 每次询问
        }

        return new Promise((resolve) => {
            if (preference === null) {
                // 删除存储的偏好，恢复到默认状态
                browser.storage.sync.remove([STORAGE_KEY_DANMAKU_PREF]).then(() => {
                    showSaveStatus('设置已保存');
                    resolve();
                });
            } else {
                browser.storage.sync.set({ [STORAGE_KEY_DANMAKU_PREF]: preference }).then(() => {
                    showSaveStatus('设置已保存');
                    resolve();
                });
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
            document.querySelector('.tabs').style.display = 'none';
            loadSettings();
        } else {
            leaderboard.style.display = 'block';
            settingsPanel.style.display = 'none';
            document.querySelector('.tabs').style.display = 'flex';
        }
    }

    // 标签页点击事件
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.type === 'page') {
                openPageWithRange();
                return;
            }
            if (tab.dataset.type === 'settings') return;

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
            setTimeout(() => {
                switchPanel('leaderboard');
            }, 500);
        });
    }

    // 默认加载日榜
    fetchLeaderboard();
});
