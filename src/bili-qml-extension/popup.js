(function () {
    'use strict';

    /**
     * 共享常量定义
     * @module shared/constants
     */

    // API 相关
    const DEFAULT_API_BASE = 'https://bili-qml.bydfk.com/api';
    // Debug 模式
    // export const DEFAULT_API_BASE = 'http://localhost:3000/api';

    // 存储键
    const STORAGE_KEYS = {
        DANMAKU_PREF: 'danmakuPreference',
        API_ENDPOINT: 'apiEndpoint',
        THEME: 'theme',
        RANK1_SETTING: 'rank1Setting'
    };

    /**
     * 通用工具函数
     * @module shared/utils
     */


    /**
     * HTML 转义，防止 XSS
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的安全文本
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }

    /**
     * Altcha CAPTCHA 功能
     * @module shared/altcha
     */

    /**
     * 获取 Altcha 挑战
     * @param {string} apiBase - API 基础地址
     * @returns {Promise<Object>} 挑战数据
     */
    async function fetchAltchaChallenge(apiBase, fetchImpl = fetch) {
        const response = await fetchImpl(`${apiBase}/altcha/challenge`);
        if (!response.ok) throw new Error('Failed to fetch challenge');
        return response.json();
    }

    /**
     * 解决 Altcha 挑战 (Proof-of-Work)
     * @param {Object} challenge - 挑战数据
     * @param {string} challenge.algorithm - 哈希算法
     * @param {string} challenge.challenge - 目标哈希
     * @param {string} challenge.salt - 盐值
     * @param {number} challenge.maxnumber - 最大尝试次数
     * @param {string} challenge.signature - 签名
     * @returns {Promise<string>} Base64 编码的解决方案
     */
    async function solveAltchaChallenge(challenge) {
        const { algorithm, challenge: challengeHash, salt, maxnumber, signature } = challenge;
        const encoder = new TextEncoder();

        for (let number = 0; number <= maxnumber; number++) {
            const data = encoder.encode(salt + number);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex === challengeHash) {
                // 找到解决方案，返回 Base64 编码的 JSON
                const solution = {
                    algorithm,
                    challenge: challengeHash,
                    number,
                    salt,
                    signature
                };
                return btoa(JSON.stringify(solution));
            }

            // 每1000次迭代让出主线程，避免阻塞 UI
            if (number % 1000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        throw new Error('Failed to solve challenge');
    }

    /**
     * 对话框 UI 组件
     * @module shared/dialogs
     */


    /**
     * 显示 Altcha CAPTCHA 对话框
     * @param {string} apiBase - API 基础地址
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<string>} 验证成功后返回 solution
     */
    function showAltchaCaptchaDialog(apiBase, fetchImpl = fetch) {
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
            <div style="font-size: 18px; font-weight: bold; color: #18191c; margin-bottom: 12px;">
                人机验证
            </div>
            <div id="qmr-captcha-status" style="font-size: 14px; color: #61666d; margin-bottom: 20px;">
                检测到频繁操作，请完成验证
            </div>
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
                ">
                    开始验证
                </button>
                <button id="qmr-captcha-cancel" type="button" style="
                    padding: 10px 20px; border: 1px solid #e3e5e7; border-radius: 6px;
                    background: white; color: #61666d; cursor: pointer;
                    font-size: 14px; margin-left: 12px; transition: all 0.2s;
                ">
                    取消
                </button>
            </div>
        `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const startBtn = dialog.querySelector('#qmr-captcha-start');
            const cancelBtn = dialog.querySelector('#qmr-captcha-cancel');
            const statusDiv = dialog.querySelector('#qmr-captcha-status');
            const progressDiv = dialog.querySelector('#qmr-captcha-progress');
            const buttonsDiv = dialog.querySelector('#qmr-captcha-buttons');

            // 悬停效果
            startBtn.addEventListener('mouseenter', () => startBtn.style.background = '#00a1d6');
            startBtn.addEventListener('mouseleave', () => startBtn.style.background = '#00aeec');

            const cleanup = () => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            };

            cancelBtn.onclick = () => {
                cleanup();
                reject(new Error('CAPTCHA cancelled'));
            };

            startBtn.onclick = async () => {
                try {
                    buttonsDiv.style.display = 'none';
                    progressDiv.style.display = 'block';
                    statusDiv.textContent = '正在获取验证挑战...';

                    const challenge = await fetchAltchaChallenge(apiBase, fetchImpl);
                    statusDiv.textContent = '正在计算验证...';

                    // 模拟进度
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
                        cleanup();
                        resolve(solution);
                    }, 500);
                } catch (error) {
                    statusDiv.textContent = '验证失败: ' + error.message;
                    statusDiv.style.color = '#ff4d4f';
                    buttonsDiv.style.display = 'block';
                    progressDiv.style.display = 'none';
                }
            };

            // ESC 键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    reject(new Error('CAPTCHA cancelled'));
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * API 调用封装
     * @module shared/api
     */


    /**
     * 获取排行榜数据
     * @param {string} apiBase - API 基础地址
     * @param {string} range - 时间范围 (realtime/daily/weekly/monthly)
     * @param {string|null} altchaSolution - CAPTCHA 解决方案
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<{success: boolean, list?: Array, requiresCaptcha?: boolean}>}
     */
    async function fetchLeaderboard(apiBase, range = 'realtime', altchaSolution = null, fetchImpl = fetch) {
        let url = `${apiBase}/leaderboard?range=${range}&type=2`;
        if (altchaSolution) {
            url += `&altcha=${encodeURIComponent(altchaSolution)}`;
        }
        const response = await fetchImpl(url);
        return response.json();
    }

    /**
     * 获取视频信息
     * @param {string} bvid - 视频 BVID
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<Object|null>}
     */
    async function fetchVideoInfo(bvid, fetchImpl = fetch) {
        try {
            const url = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
            const response = await fetchImpl(url);
            const json = await response.json();
            if (json && json.code === 0 && json.data) {
                return json.data;
            }
        } catch (e) {
            console.warn(`[B站问号榜] 获取视频信息失败: ${bvid}`, e);
        }
        return null;
    }

    /**
     * 浏览器扩展平台适配层
     * @module extension/platform
     */

    // 判断是否为 Firefox (使用 Promise-based API)
    const isFirefox = typeof browser !== 'undefined' && browser.storage;

    // 浏览器存储 API 兼容
    const browserStorage = (function () {
        if (isFirefox) {
            return browser.storage;
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return chrome.storage;
        }
        throw new Error('No storage API available');
    })();

    /**
     * 从存储中获取值 (兼容 Chrome 和 Firefox)
     * @param {string[]} keys - 要获取的键数组
     * @returns {Promise<Object>} 结果对象
     */
    function storageGet(keys) {
        return new Promise((resolve) => {
            if (isFirefox) {
                // Firefox 使用 Promise
                browserStorage.sync.get(keys).then(resolve).catch(() => resolve({}));
            } else {
                // Chrome 使用 callback
                browserStorage.sync.get(keys, (result) => {
                    resolve(result || {});
                });
            }
        });
    }

    /**
     * 向存储中设置值 (兼容 Chrome 和 Firefox)
     * @param {Object} items - 要设置的键值对
     * @returns {Promise<void>}
     */
    function storageSet(items) {
        return new Promise((resolve) => {
            if (isFirefox) {
                browserStorage.sync.set(items).then(resolve).catch(resolve);
            } else {
                browserStorage.sync.set(items, resolve);
            }
        });
    }

    /**
     * 从存储中移除值 (兼容 Chrome 和 Firefox)
     * @param {string[]} keys - 要移除的键数组
     * @returns {Promise<void>}
     */
    function storageRemove(keys) {
        return new Promise((resolve) => {
            if (isFirefox) {
                browserStorage.sync.remove(keys).then(resolve).catch(resolve);
            } else {
                browserStorage.sync.remove(keys, resolve);
            }
        });
    }

    /**
     * 初始化 API_BASE
     * @param {string} storageKey - 存储键名
     * @param {string} defaultValue - 默认值
     * @returns {Promise<string>} API 地址
     */
    async function initApiBaseFromStorage(storageKey, defaultValue) {
        const result = await storageGet([storageKey]);
        return result[storageKey] || defaultValue;
    }

    /**
     * 获取扩展资源 URL
     * @param {string} path - 资源路径
     * @returns {string} 完整 URL
     */
    function getExtensionUrl(path) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(path);
        }
        if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
            return browser.runtime.getURL(path);
        }
        return path;
    }

    /**
     * 监听存储变化
     * @param {string} key - 要监听的键
     * @param {Function} callback - 变化回调 (newValue) => void
     */
    function onStorageChange(key, callback) {
        browserStorage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync' && changes[key]) {
                callback(changes[key].newValue);
            }
        });
    }

    /**
     * B站问号榜 - 浏览器扩展 Popup Script
     */


    // ==================== 全局状态 ====================

    let API_BASE = DEFAULT_API_BASE;

    // ==================== 初始化 ====================

    document.addEventListener('DOMContentLoaded', async () => {
        // 初始化 API_BASE
        API_BASE = await initApiBaseFromStorage(STORAGE_KEYS.API_ENDPOINT, DEFAULT_API_BASE);

        // 应用保存的主题
        const themeResult = await storageGet([STORAGE_KEYS.THEME]);
        if (themeResult[STORAGE_KEYS.THEME] === 'dark') {
            document.body.classList.add('dark-mode');
        }

        // 监听主题变化
        onStorageChange(STORAGE_KEYS.THEME, (newValue) => {
            if (newValue === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });

        const leaderboard = document.getElementById('leaderboard');
        const settingsWrapper = document.getElementById('settings-wrapper');
        const tabs = document.querySelectorAll('.tab-btn');

        // ==================== 页面打开功能 ====================

        function openPageWithRange() {
            const activeTab = document.querySelector('.tab-btn.active');
            const range = activeTab?.dataset?.range || 'realtime';
            const url = `${getExtensionUrl('leaderboard.html')}?range=${encodeURIComponent(range)}`;
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

        // ==================== 主题切换 ====================

        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', async () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                await storageSet({ [STORAGE_KEYS.THEME]: isDark ? 'dark' : 'light' });
            });
        }

        // ==================== 排行榜加载 ====================

        async function loadLeaderboard(range = 'realtime', altchaSolution = null) {
            leaderboard.innerHTML = '<div class="loading">加载中...</div>';
            try {
                const data = await fetchLeaderboard(API_BASE, range, altchaSolution);

                // 处理频率限制
                if (data.requiresCaptcha) {
                    leaderboard.innerHTML = '<div class="loading">需要人机验证...</div>';
                    try {
                        const solution = await showAltchaCaptchaDialog(API_BASE);
                        return loadLeaderboard(range, solution);
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
            const settings = await storageGet([STORAGE_KEYS.RANK1_SETTING]);
            const rank1Custom = (settings[STORAGE_KEYS.RANK1_SETTING] || 'custom') === 'custom';

            await Promise.all(list.map(async (item, index) => {
                try {
                    let title = '未知标题';
                    const info = await fetchVideoInfo(item.bvid);
                    if (info?.title) {
                        title = info.title;
                    }
                    renderEntry(item, index + 1, title, rank1Custom);
                } catch (err) {
                    console.error(`获取标题失败 ${item.bvid}:`, err);
                    renderEntry(item, index + 1, '加载失败', rank1Custom);
                }
            }));
        }

        function renderEntry(item, index, title, rank1Custom) {
            const div = document.createElement('div');
            div.className = 'item';

            let rankDisplay = index;
            let rankHtmlClass = 'rank';
            if (index === 1 && rank1Custom) {
                rankDisplay = '何一位';
                rankHtmlClass += ' rank-custom';
            }

            const escapedTitle = escapeHtml(title);
            const escapedBvid = escapeHtml(item.bvid);
            const escapedCount = escapeHtml(String(item.count));

            div.innerHTML = `
            <div class="${rankHtmlClass}">${rankDisplay}</div>
            <div class="info">
                <a href="https://www.bilibili.com/video/${escapedBvid}" target="_blank" class="title" title="${escapedTitle}">${escapedTitle}</a>
                <div class="count">❓ 抽象指数: ${escapedCount}</div>
            </div>
        `;

            // 按排名顺序插入
            const allItems = Array.from(document.querySelectorAll('.item'));
            const nextItem = allItems.find(el => {
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

        // ==================== 设置功能 ====================

        async function loadSettings() {
            const result = await storageGet([
                STORAGE_KEYS.DANMAKU_PREF,
                STORAGE_KEYS.API_ENDPOINT,
                STORAGE_KEYS.RANK1_SETTING
            ]);

            // 弹幕偏好设置
            const preference = result[STORAGE_KEYS.DANMAKU_PREF];
            let value = 'ask';
            if (preference === true) value = 'always';
            else if (preference === false) value = 'never';

            const radio = document.querySelector(`input[name="danmaku-pref"][value="${value}"]`);
            if (radio) radio.checked = true;

            // 第一名显示设置
            const rank1Setting = result[STORAGE_KEYS.RANK1_SETTING] || 'custom';
            const rank1Radio = document.querySelector(`input[name="rank1-pref"][value="${rank1Setting}"]`);
            if (rank1Radio) rank1Radio.checked = true;

            // Endpoint 设置
            const endpointInput = document.getElementById('endpoint-input');
            if (endpointInput) {
                endpointInput.value = result[STORAGE_KEYS.API_ENDPOINT] || '';
            }
        }

        async function saveSettings() {
            const selectedRadio = document.querySelector('input[name="danmaku-pref"]:checked');
            const rank1Radio = document.querySelector('input[name="rank1-pref"]:checked');
            const endpointInput = document.getElementById('endpoint-input');
            const endpointValue = endpointInput ? endpointInput.value.trim() : '';

            // 处理弹幕偏好
            let preference = null;
            if (selectedRadio) {
                const value = selectedRadio.value;
                if (value === 'always') preference = true;
                else if (value === 'never') preference = false;
            }

            const rank1Setting = rank1Radio ? rank1Radio.value : 'default';

            const updates = {};
            const removals = [];

            // 弹幕偏好
            if (preference === null) {
                removals.push(STORAGE_KEYS.DANMAKU_PREF);
            } else {
                updates[STORAGE_KEYS.DANMAKU_PREF] = preference;
            }

            updates[STORAGE_KEYS.RANK1_SETTING] = rank1Setting;

            // Endpoint 设置
            if (endpointValue && endpointValue !== DEFAULT_API_BASE) {
                updates[STORAGE_KEYS.API_ENDPOINT] = endpointValue;
                API_BASE = endpointValue;
            } else {
                removals.push(STORAGE_KEYS.API_ENDPOINT);
                API_BASE = DEFAULT_API_BASE;
            }

            // 先删除需要删除的项
            if (removals.length > 0) {
                await storageRemove(removals);
            }

            // 设置更新项
            if (Object.keys(updates).length > 0) {
                await storageSet(updates);
            }

            showSaveStatus('设置已保存');
        }

        function showSaveStatus(message) {
            const statusDiv = document.getElementById('save-status');
            statusDiv.textContent = message;
            statusDiv.style.opacity = '1';
            setTimeout(() => {
                statusDiv.style.opacity = '0';
            }, 2000);
        }

        // ==================== 面板切换 ====================

        function switchPanel(panelType) {
            if (panelType === 'settings') {
                leaderboard.style.display = 'none';
                if (settingsWrapper) settingsWrapper.style.display = 'flex';
                document.querySelector('.tabs').style.display = 'none';
                loadSettings();
            } else {
                leaderboard.style.display = 'block';
                if (settingsWrapper) settingsWrapper.style.display = 'none';
                document.querySelector('.tabs').style.display = 'flex';
            }
        }

        // Tab 点击事件
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                switchPanel('leaderboard');
                loadLeaderboard(tab.dataset.range);
            });
        });

        // 设置按钮点击事件
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
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
                setTimeout(() => switchPanel('leaderboard'), 500);
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

        // 初始加载排行榜
        loadLeaderboard();
    });

})();
