/**
 * B站问号榜 - 油猴脚本入口
 * 此文件通过 Rollup 打包，将共享模块内联到最终的 bili-qml.user.js
 */

// 导入共享模块
import {
    DEFAULT_API_BASE,
    STORAGE_KEYS,
    SELECTORS,
    QUESTION_BTN,
    LEADERBOARD_RANGES,
    RANGE_LABELS
} from '../shared/constants.js';

import {
    getUserId,
    getBvid,
    formatCount,
    escapeHtml,
    waitFor,
    debounce,
    wait,
    findFirst
} from '../shared/utils.js';

import {
    fetchAltchaChallenge,
    solveAltchaChallenge
} from '../shared/altcha.js';

import {
    showAltchaCaptchaDialog,
    showDanmakuConfirmDialog
} from '../shared/dialogs.js';

import { sendDanmaku } from '../shared/danmaku.js';

import {
    getVoteStatus,
    doVote,
    fetchLeaderboard,
    fetchVideoInfo
} from '../shared/api.js';

import {
    createLeaderboardItemHTML,
    createVideoCardHTML,
    renderSimpleLeaderboard,
    renderFullLeaderboard
} from '../shared/leaderboard.js';

import {
    PANEL_STYLES,
    LEADERBOARD_PAGE_STYLES
} from '../shared/styles.js';

import { tryInject, syncButtonState } from '../shared/inject.js';

// ==================== 油猴特有配置 ====================

// 当前 API_BASE
let API_BASE = GM_getValue(STORAGE_KEYS.API_ENDPOINT, null) || DEFAULT_API_BASE;

// 注入样式
GM_addStyle(PANEL_STYLES);

// GM_xmlhttpRequest 封装，模拟 fetch API
const gmFetch = (resource, init) => {
    return new Promise((resolve, reject) => {
        const method = init?.method || 'GET';
        const headers = init?.headers || {};
        const data = init?.body;

        const requestDetails = {
            method: method,
            url: resource,
            headers: headers,
            data: data,
            onload: (response) => {
                resolve({
                    ok: response.status >= 200 && response.status < 300,
                    status: response.status,
                    statusText: response.statusText,
                    json: () => {
                        try {
                            return Promise.resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            return Promise.reject(e);
                        }
                    },
                    text: () => Promise.resolve(response.responseText)
                });
            },
            onerror: (error) => {
                console.error('GM_xmlhttpRequest error:', error);
                reject(new TypeError('Network request failed'));
            },
            ontimeout: () => {
                reject(new TypeError('Network request timed out'));
            }
        };

        if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest(requestDetails);
        } else if (typeof GM !== 'undefined' && GM.xmlHttpRequest) {
            GM.xmlHttpRequest(requestDetails);
        } else {
            fetch(resource, init).then(resolve).catch(reject);
        }
    });
};

// ==================== 问号按钮全局变量 ====================

globalThis.isInjecting = false;
globalThis.isSyncing = false;
globalThis.currentBvid = '';
globalThis.lastSyncedUserId = null;

// ==================== 排行榜面板逻辑 ====================

let panelCreated = false;

// 打开独立排行榜页面
function openStandaloneLeaderboardPage(initialRange = 'realtime') {
    const win = window.open('about:blank', '_blank');
    if (!win) {
        alert('[B站问号榜] 打开新页面失败：可能被浏览器拦截了弹窗');
        return;
    }

    // 将 gmFetch 传递给新窗口
    win.gmFetch = gmFetch;

    const safeRange = LEADERBOARD_RANGES.includes(initialRange) ? initialRange : 'realtime';
    const rank1Setting = GM_getValue(STORAGE_KEYS.RANK1_SETTING, 'custom');
    const rank1Custom = rank1Setting === 'custom';
    const savedTheme = GM_getValue(STORAGE_KEYS.THEME, 'light');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>B站问号榜 ❓ - 排行榜</title>
    <style>${LEADERBOARD_PAGE_STYLES}</style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="${savedTheme === 'dark' ? 'dark-mode' : ''}">
    <div class="background-mesh"></div>

    <div class="container">
        <header>
            <div class="logo-section">
                <span class="logo-img" style="font-size: 32px; display:flex; align-items:center; justify-content:center;">❓</span>
                <h1>B站 <span class="highlight">问号榜</span></h1>
                <button id="theme-toggle" class="theme-toggle-btn" title="切换深色/浅色模式">🌓</button>
            </div>
            <nav class="time-range-tabs">
                ${LEADERBOARD_RANGES.map(r => `
                    <button class="tab-btn ${r === safeRange ? 'active' : ''}" data-range="${r}">${RANGE_LABELS[r]}</button>
                `).join('')}
            </nav>
        </header>

        <main id="leaderboard-grid" class="leaderboard-grid">
            <div class="loading-state">
                <div class="spinner"></div>
                <p>正在获取最新抽象榜数据...</p>
            </div>
        </main>
    </div>

    <script>
        const API_BASE = '${API_BASE}';
        const rank1Custom = ${rank1Custom};
        
        // 获取父窗口传递的 gmFetch
        const gmFetch = window.gmFetch || fetch;

        // 注入工具函数
        ${formatCount.toString()}
        ${escapeHtml.toString()}
        ${createVideoCardHTML.toString()}
        ${fetchVideoInfo.toString()}
        
        const grid = document.getElementById('leaderboard-grid');
        const tabs = document.querySelectorAll('.tab-btn');
        let currentRange = '${safeRange}';
        
        async function loadLeaderboard(range) {
            grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>正在获取最新抽象榜数据...</p></div>';
            try {
                // 使用 gmFetch
                const response = await gmFetch(API_BASE + '/leaderboard?range=' + range + '&type=2');
                const data = await response.json();
                
                if (data.success && data.list.length > 0) {
                    const items = await Promise.all(data.list.map(async (item, index) => {
                        let details = { title: '加载中...', pic: '', ownerName: '', view: null, danmaku: null };
                        try {
                            // 使用 gmFetch 获取视频详情
                            const info = await fetchVideoInfo(item.bvid, gmFetch);
                            if (info) {
                                details.title = info.title || '未知标题';
                                details.pic = info.pic;
                                details.ownerName = info.owner?.name;
                                details.view = info.stat?.view;
                                details.danmaku = info.stat?.danmaku;
                            }
                        } catch (e) {
                            details.title = 'Video ' + item.bvid;
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
                } else {
                    grid.innerHTML = '<div class="loading-state"><p>📭 暂无数据</p></div>';
                }
            } catch (e) {
                console.error(e);
                grid.innerHTML = '<div class="loading-state"><p style="color: #ff4d4f;">⚠️ 连接服务器失败</p><p style="font-size:12px">如果您启用了广告拦截器，请尝试放行</p></div>';
            }
        }
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentRange = tab.dataset.range;
                loadLeaderboard(currentRange);
            });
        });
        
        const themeBtn = document.getElementById('theme-toggle');
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
        
        loadLeaderboard(currentRange);
    </script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
}

function createLeaderboardPanel() {
    if (panelCreated) return document.getElementById(QUESTION_BTN.PANEL_ID);

    const panel = document.createElement('div');
    panel.id = QUESTION_BTN.PANEL_ID;

    // 获取保存的主题设置
    const savedTheme = GM_getValue(STORAGE_KEYS.THEME, 'light');
    if (savedTheme === 'dark') {
        panel.classList.add('dark-mode');
    }

    panel.innerHTML = `
        <header class="qmr-header">
            <div class="header-left">
                <div class="settings-btn" id="qmr-full-leaderboard-btn" title="打开完整榜单">📊</div>
                <div class="settings-btn" id="qmr-theme-btn" title="切换深色/浅色模式">🌓</div>
            </div>
            <h1 class="qmr-title">B站问号榜 ❓</h1>
            <div class="header-actions">
                <div class="settings-btn" id="qmr-settings-btn" title="设置">⚙️</div>
                <button class="qmr-close" title="关闭">×</button>
            </div>
        </header>
        <div class="tabs">
            ${LEADERBOARD_RANGES.map((r, i) => `
                <button class="tab-btn ${i === 0 ? 'active' : ''}" data-range="${r}">${RANGE_LABELS[r]}</button>
            `).join('')}
        </div>
        <main id="qmr-leaderboard" class="content-panel">
            <div class="loading">加载中...</div>
        </main>
        <div id="qmr-settings-wrapper" class="settings-wrapper">
            <main id="qmr-settings" class="settings-content">
                <div class="settings-section">
                    <h3>弹幕发送设置</h3>
                    <p class="settings-desc">点亮问号后，是否自动发送"?"弹幕</p>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="danmaku-pref" value="ask">
                            <span>每次询问</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="danmaku-pref" value="always">
                            <span>总是发送</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="danmaku-pref" value="never">
                            <span>总是不发送</span>
                        </label>
                    </div>
                </div>
                <div class="settings-section" style="margin-top: 15px;">
                    <h3>第一名显示设置</h3>
                    <p class="settings-desc">自定义排行榜第一名的显示文本</p>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="rank1-pref" value="default">
                            <span>正常 (1)</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="rank1-pref" value="custom">
                            <span>抽象 (何一位)</span>
                        </label>
                    </div>
                </div>
                <details class="advanced-section" style="margin-top: 15px;">
                    <summary class="advanced-toggle">高级选项</summary>
                    <div class="settings-section">
                        <h3>API 服务器设置</h3>
                        <p class="settings-desc">自定义问号榜服务器地址</p>
                        <div class="endpoint-input-group">
                            <input type="text" id="qmr-endpoint-input" class="endpoint-input" placeholder="${DEFAULT_API_BASE}">
                            <button id="qmr-reset-endpoint" class="reset-btn" title="恢复默认">↺</button>
                        </div>
                    </div>
                </details>
            </main>
            <div id="qmr-settings-footer" class="settings-footer">
                <button id="qmr-save-settings" class="save-btn">保存设置</button>
                <div id="qmr-save-status" class="save-status"></div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // 事件绑定
    const closeBtn = panel.querySelector('.qmr-close');
    const settingsBtn = panel.querySelector('#qmr-settings-btn');
    const pageBtn = panel.querySelector('#qmr-full-leaderboard-btn');
    const themeBtn = panel.querySelector('#qmr-theme-btn');
    const saveBtn = panel.querySelector('#qmr-save-settings');
    const resetBtn = panel.querySelector('#qmr-reset-endpoint');
    const endpointInput = panel.querySelector('#qmr-endpoint-input');
    const tabBtns = panel.querySelectorAll('.tab-btn');
    const leaderboardDiv = panel.querySelector('#qmr-leaderboard');
    const settingsWrapper = panel.querySelector('#qmr-settings-wrapper');

    closeBtn.onclick = () => panel.classList.remove('show');

    // 设置按钮
    settingsBtn.onclick = () => {
        if (settingsWrapper.style.display === 'flex') {
            settingsWrapper.style.display = 'none';
            leaderboardDiv.style.display = 'block';
            panel.querySelector('.tabs').style.display = 'flex';
        } else {
            settingsWrapper.style.display = 'flex';
            leaderboardDiv.style.display = 'none';
            panel.querySelector('.tabs').style.display = 'none';
            loadSettingsUI();
        }
    };

    // 页面按钮：打开独立榜单页
    pageBtn.onclick = () => {
        const activeTab = panel.querySelector('.tab-btn.active');
        const range = activeTab?.dataset?.range || 'realtime';
        openStandaloneLeaderboardPage(range);
    };

    // 重置 Endpoint 按钮
    resetBtn.onclick = () => {
        endpointInput.value = DEFAULT_API_BASE;
    };

    // 主题切换
    themeBtn.onclick = () => {
        panel.classList.toggle('dark-mode');
        const isDark = panel.classList.contains('dark-mode');
        GM_setValue(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    };

    // 保存按钮
    saveBtn.onclick = () => {
        // 弹幕偏好
        const danmakuRadio = panel.querySelector('input[name="danmaku-pref"]:checked');
        if (danmakuRadio) {
            const val = danmakuRadio.value;
            if (val === 'always') {
                GM_setValue(STORAGE_KEYS.DANMAKU_PREF, true);
            } else if (val === 'never') {
                GM_setValue(STORAGE_KEYS.DANMAKU_PREF, false);
            } else {
                GM_setValue(STORAGE_KEYS.DANMAKU_PREF, null);
            }
        }

        // 第一名显示
        const rank1Radio = panel.querySelector('input[name="rank1-pref"]:checked');
        if (rank1Radio) {
            GM_setValue(STORAGE_KEYS.RANK1_SETTING, rank1Radio.value);
        }

        // Endpoint
        const endpointVal = endpointInput.value.trim();
        if (endpointVal && endpointVal !== DEFAULT_API_BASE) {
            GM_setValue(STORAGE_KEYS.API_ENDPOINT, endpointVal);
            API_BASE = endpointVal;
        } else {
            GM_setValue(STORAGE_KEYS.API_ENDPOINT, null);
            API_BASE = DEFAULT_API_BASE;
        }

        // 显示保存成功
        const status = panel.querySelector('#qmr-save-status');
        status.textContent = '设置已保存';
        status.style.opacity = '1';
        setTimeout(() => {
            status.style.opacity = '0';
            settingsWrapper.style.display = 'none';
            leaderboardDiv.style.display = 'block';
            panel.querySelector('.tabs').style.display = 'flex';
        }, 1000);
    };

    // Tab 切换
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadLeaderboardData(btn.dataset.range);
        };
    });

    // 拖拽功能
    const header = panel.querySelector('.qmr-header');
    let isDragging = false;
    let dragStartX, dragStartY, panelStartX, panelStartY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.qmr-close') || e.target.closest('.settings-btn')) return;
        isDragging = true;
        panel.classList.add('qmr-dragging');
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = panel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        panel.style.left = (panelStartX + dx) + 'px';
        panel.style.top = (panelStartY + dy) + 'px';
        panel.style.right = 'auto';
        panel.classList.add('qmr-dragged');
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.classList.remove('qmr-dragging');
    });

    panelCreated = true;
    return panel;
}

// 加载设置界面
function loadSettingsUI() {
    const panel = document.getElementById(QUESTION_BTN.PANEL_ID);
    if (!panel) return;

    // 弹幕偏好
    const pref = GM_getValue(STORAGE_KEYS.DANMAKU_PREF, null);
    let val = 'ask';
    if (pref === true) val = 'always';
    else if (pref === false) val = 'never';
    const radio = panel.querySelector(`input[name="danmaku-pref"][value="${val}"]`);
    if (radio) radio.checked = true;

    // 第一名显示
    const rank1Setting = GM_getValue(STORAGE_KEYS.RANK1_SETTING, 'custom');
    const rank1Radio = panel.querySelector(`input[name="rank1-pref"][value="${rank1Setting}"]`);
    if (rank1Radio) rank1Radio.checked = true;

    // Endpoint
    const endpointInput = panel.querySelector('#qmr-endpoint-input');
    const savedEndpoint = GM_getValue(STORAGE_KEYS.API_ENDPOINT, '');
    if (endpointInput) {
        endpointInput.value = savedEndpoint || '';
    }
}

function toggleLeaderboardPanel() {
    const panel = createLeaderboardPanel();
    const isVisible = panel.classList.contains('show');

    if (isVisible) {
        panel.classList.remove('show');
    } else {
        panel.classList.add('show');
        loadLeaderboardData('realtime');
    }
}

async function loadLeaderboardData(range = 'realtime', altchaSolution = null) {
    const panel = document.getElementById(QUESTION_BTN.PANEL_ID);
    if (!panel) return;

    const leaderboardDiv = panel.querySelector('#qmr-leaderboard');
    leaderboardDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const data = await fetchLeaderboard(API_BASE, range, altchaSolution, gmFetch);

        if (data.requiresCaptcha) {
            try {
                const solution = await showAltchaCaptchaDialog(API_BASE, gmFetch);
                return loadLeaderboardData(range, solution);
            } catch (e) {
                leaderboardDiv.innerHTML = '<div class="loading">验证已取消</div>';
                return;
            }
        }

        if (data.success && data.list.length > 0) {
            const rank1Setting = GM_getValue(STORAGE_KEYS.RANK1_SETTING, 'custom');
            await renderSimpleLeaderboard(leaderboardDiv, data.list, {
                rank1Custom: rank1Setting === 'custom',
                fetchImpl: gmFetch
            });
        } else {
            leaderboardDiv.innerHTML = '<div class="loading">暂无数据</div>';
        }
    } catch (e) {
        console.error('[B站问号榜] 获取排行榜失败:', e);
        leaderboardDiv.innerHTML = '<div class="loading">加载失败</div>';
    }
}

// ==================== 初始化 ====================

// 初始加载：等待 Vue 加载完成
Promise.all(SELECTORS.LOAD_INDICATOR.map((indicator)=>{return waitFor(indicator)})).then(()=>{tryInject()});

// 处理 SPA 软导航 (URL 变化)
let lastUrl = location.href;
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        syncButtonState();
    } else {
        if (getBvid() && !document.getElementById(QUESTION_BTN.ID)) {
            if (document.querySelector(SELECTORS.TOOLBAR_LEFT)) {
                tryInject();
            }
        }
    }
}, 1000);

// 注册油猴菜单命令
GM_registerMenuCommand('📊 打开问号榜', toggleLeaderboardPanel);
