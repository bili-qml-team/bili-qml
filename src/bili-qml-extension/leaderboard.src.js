/**
 * B站问号榜 - 浏览器扩展 独立排行榜页面
 */

// 导入共享模块
import {
    DEFAULT_API_BASE,
    STORAGE_KEYS,
    LEADERBOARD_RANGES,
    RANGE_LABELS
} from '../shared/constants.js';

import { formatCount, escapeHtml } from '../shared/utils.js';
import { showAltchaCaptchaDialog } from '../shared/dialogs.js';
import { fetchLeaderboard, fetchVideoInfo } from '../shared/api.js';
import { createVideoCardHTML, renderFullLeaderboard } from '../shared/leaderboard.js';

import {
    initApiBaseFromStorage,
    storageGet,
    storageSet,
    onStorageChange
} from '../shared/platform-extension.js';

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
