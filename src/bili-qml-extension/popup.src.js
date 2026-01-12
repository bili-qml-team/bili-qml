/**
 * B站问号榜 - 浏览器扩展 Popup Script
 */

// 导入共享模块
import {
    DEFAULT_API_BASE,
    STORAGE_KEYS,
    LEADERBOARD_RANGES,
    RANGE_LABELS
} from '../shared/constants.js';

import { escapeHtml } from '../shared/utils.js';
import { showAltchaCaptchaDialog } from '../shared/dialogs.js';
import { fetchLeaderboard, fetchVideoInfo } from '../shared/api.js';
import { createLeaderboardItemHTML } from '../shared/leaderboard.js';

import {
    initApiBaseFromStorage,
    getExtensionUrl,
    storageGet,
    storageSet,
    storageRemove,
    onStorageChange
} from '../shared/platform-extension.js';

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
