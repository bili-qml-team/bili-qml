/**
 * B站问号榜 - 浏览器扩展 Content Script
 */

// 导入共享模块
import {
    DEFAULT_API_BASE,
    STORAGE_KEYS,
    SELECTORS,
    QUESTION_BTN
} from '../shared/constants.js';

import {
    getUserId,
    getBvid,
    formatCount,
    waitFor,
    findFirst
} from '../shared/utils.js';

import { showAltchaCaptchaDialog, showDanmakuConfirmDialog } from '../shared/dialogs.js';
import { sendDanmaku } from '../shared/danmaku.js';
import { getVoteStatus, doVote } from '../shared/api.js';

import {
    initApiBaseFromStorage,
    onStorageChange,
    storageGet,
    storageSet
} from '../shared/platform-extension.js';

import { tryInject, syncButtonState } from '../shared/inject.js';

// ==================== 全局状态 ====================

let API_BASE = DEFAULT_API_BASE;
globalThis.isInjecting = false;
globalThis.isSyncing = false;
globalThis.currentBvid = '';
globalThis.lastSyncedUserId = null;

// ==================== 初始化 API_BASE ====================

async function initApiBase() {
    API_BASE = await initApiBaseFromStorage(STORAGE_KEYS.API_ENDPOINT, DEFAULT_API_BASE);
}

// 监听 API 端点变化
onStorageChange(STORAGE_KEYS.API_ENDPOINT, (newValue) => {
    API_BASE = newValue || DEFAULT_API_BASE;
});

// ==================== Main Entry Point ====================

initApiBase().then(() => {
    // 初始加载：等待 Vue 加载完成
    waitFor(SELECTORS.NAV_SEARCH).then((ele) => {
        ele.addEventListener("load", () => {
            const fn = () => {
                if (ele.readyState == 'complete') {
                    tryInject();
                } else {
                    setTimeout(fn, 100);
                }
            };
            fn();
        });
    });

    // 处理 SPA 软导航 (URL 变化)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            syncButtonState();
        } else {
            // 保底检查
            if (getBvid() && !document.getElementById(QUESTION_BTN.ID)) {
                if (document.querySelector(SELECTORS.TOOLBAR_LEFT)) {
                    tryInject();
                }
            }
        }
    }, 1000);
});
