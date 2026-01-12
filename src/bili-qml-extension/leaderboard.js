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
        API_ENDPOINT: 'apiEndpoint',
        THEME: 'theme',
        RANK1_SETTING: 'rank1Setting'
    };

    // 排行榜时间范围
    const LEADERBOARD_RANGES = ['realtime', 'daily', 'weekly', 'monthly'];

    /**
     * 通用工具函数
     * @module shared/utils
     */


    /**
     * 格式化数字显示（B站风格）
     * @param {number} num - 要格式化的数字
     * @returns {string} 格式化后的字符串，如 "1.2万"
     */
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
     * 排行榜渲染逻辑
     * @module shared/leaderboard
     */


    /**
     * 创建视频卡片 HTML（用于独立排行榜页面）
     * @param {Object} item - 排行榜项目 {bvid, count}
     * @param {number} rank - 排名
     * @param {Object} details - 视频详情 {title, pic, ownerName, view, danmaku}
     * @param {boolean} rank1Custom - 是否使用自定义第一名显示
     * @returns {string} HTML 字符串
     */
    function createVideoCardHTML(item, rank, details, rank1Custom = true) {
        let rankDisplay = rank <= 3 ? rank : `#${rank}`;
        let rankClass = rank <= 3 ? `rank-${rank}` : '';

        if (rank === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankClass += ' rank-custom-text';
        }

        const safeTitle = escapeHtml(details.title || '未知标题');
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
     * B站问号榜 - 浏览器扩展 独立排行榜页面
     */


    // ==================== 全局状态 ====================

    let API_BASE = DEFAULT_API_BASE;
    let currentRange = 'realtime';

    // ==================== 初始化 ====================

    document.addEventListener('DOMContentLoaded', async () => {
        // 初始化 API_BASE
        API_BASE = await initApiBaseFromStorage(STORAGE_KEYS.API_ENDPOINT, DEFAULT_API_BASE);

        const grid = document.getElementById('leaderboard-grid');
        const tabs = document.querySelectorAll('.tab-btn');

        // 从 URL 参数获取初始 range
        const urlParams = new URLSearchParams(window.location.search);
        const initialRange = urlParams.get('range');
        if (initialRange && LEADERBOARD_RANGES.includes(initialRange)) {
            currentRange = initialRange;
            // 更新 tab 激活状态
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.range === currentRange);
            });
        }

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

        // 主题切换按钮
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', async () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                await storageSet({ [STORAGE_KEYS.THEME]: isDark ? 'dark' : 'light' });
            });
        }

        // Tab 切换
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentRange = tab.dataset.range;
                loadLeaderboard(currentRange);
            });
        });

        // ==================== 排行榜加载 ====================

        async function loadLeaderboard(range = 'realtime', altchaSolution = null) {
            showLoading();

            try {
                const data = await fetchLeaderboard(API_BASE, range, altchaSolution);

                // 处理 CAPTCHA
                if (data.requiresCaptcha) {
                    try {
                        const solution = await showAltchaCaptchaDialog(API_BASE);
                        return loadLeaderboard(range, solution);
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
            // 获取设置
            const settings = await storageGet([STORAGE_KEYS.RANK1_SETTING]);
            const rank1Custom = (settings[STORAGE_KEYS.RANK1_SETTING] || 'custom') === 'custom';

            const items = await Promise.all(list.map(async (item, index) => {
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

                return createVideoCardHTML(item, index + 1, details, rank1Custom);
            }));

            grid.innerHTML = items.join('');

            // 入场动画
            const cards = grid.querySelectorAll('.video-card');
            cards.forEach((card, i) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, i * 50);
            });
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
                <p style="color: #ff4d4f;">⚠️ ${escapeHtml(msg)}</p>
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

        // 加载初始数据
        loadLeaderboard(currentRange);
    });

})();
