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

// ==================== 全局状态 ====================

let API_BASE = DEFAULT_API_BASE;
let isInjecting = false;
let isSyncing = false;
let currentBvid = '';
let lastSyncedUserId = null;

// ==================== 初始化 API_BASE ====================

async function initApiBase() {
    API_BASE = await initApiBaseFromStorage(STORAGE_KEYS.API_ENDPOINT, DEFAULT_API_BASE);
}

// 监听 API 端点变化
onStorageChange(STORAGE_KEYS.API_ENDPOINT, (newValue) => {
    API_BASE = newValue || DEFAULT_API_BASE;
});

// ==================== 弹幕偏好功能 ====================

async function getDanmakuPreference() {
    const result = await storageGet([STORAGE_KEYS.DANMAKU_PREF]);
    return result[STORAGE_KEYS.DANMAKU_PREF] !== undefined ? result[STORAGE_KEYS.DANMAKU_PREF] : null;
}

async function setDanmakuPreference(preference) {
    await storageSet({ [STORAGE_KEYS.DANMAKU_PREF]: preference });
}

// ==================== 按钮状态同步 ====================

async function syncButtonState() {
    const qBtn = document.getElementById(QUESTION_BTN.ID);
    const qBtnInner = document.getElementById(QUESTION_BTN.INNER_ID);
    if (!qBtn || !qBtnInner || isSyncing) return;

    const bvid = getBvid();
    if (!bvid) return;

    try {
        isSyncing = true;
        const userId = getUserId();
        const statusData = await getVoteStatus(API_BASE, bvid, userId);

        currentBvid = bvid;
        lastSyncedUserId = userId;

        const isLoggedIn = !!userId;
        if (statusData.active && isLoggedIn) {
            qBtn.classList.add('voted');
            qBtnInner.classList.add('on');
        } else {
            qBtn.classList.remove('voted');
            qBtnInner.classList.remove('on');
        }

        // 更新显示的数量
        const countText = qBtn.querySelector('.qmr-text');
        if (countText) {
            const newText = statusData.count > 0 ? formatCount(statusData.count) : '问号';
            if (countText.innerText !== newText) {
                countText.innerText = newText;
            }
        }
    } catch (e) {
        console.error('[B站问号榜] 同步状态失败:', e);
    } finally {
        isSyncing = false;
    }
}

// ==================== 问号按钮注入 ====================

async function injectQuestionButton() {
    try {
        const bvid = getBvid();
        if (!bvid) return;

        // 寻找工具栏
        const toolbarLeft = document.querySelector(SELECTORS.TOOLBAR_LEFT);
        const shareBtn = findFirst(SELECTORS.SHARE_BTN);

        if (!toolbarLeft || !shareBtn) return;

        let qBtn = document.getElementById(QUESTION_BTN.ID);

        // 如果按钮不存在，创建并挂载
        if (!qBtn) {
            if (isInjecting) return;
            isInjecting = true;

            qBtn = document.createElement('div');
            qBtn.id = QUESTION_BTN.ID;
            qBtn.className = 'toolbar-left-item-wrap';

            const qBtnInner = document.createElement('div');
            qBtnInner.id = QUESTION_BTN.INNER_ID;
            qBtnInner.className = 'qmr-icon-wrap video-toolbar-left-item';
            qBtnInner.innerHTML = `${QUESTION_BTN.SVG_ICON}<span class="qmr-text">...</span>`;
            qBtn.appendChild(qBtnInner);

            toolbarLeft.style.position = 'relative';
            toolbarLeft.appendChild(qBtn);

            qBtn.onclick = async (e) => {
                e.preventDefault();

                // 检查登录状态
                if (!document.cookie.includes('DedeUserID')) {
                    alert('请先登录 B 站后再投问号哦 ~');
                    return;
                }

                const activeBvid = getBvid();
                if (!activeBvid) return;

                const userId = getUserId();
                if (!userId) {
                    alert('无法获取用户信息，请确认已登录');
                    return;
                }

                // 判断是投票还是取消投票
                const isVoting = !qBtn.classList.contains("voted");
                const endpoint = isVoting ? "vote" : "unvote";

                try {
                    qBtn.style.pointerEvents = 'none';
                    qBtn.style.opacity = '0.5';

                    let resData = await doVote(API_BASE, endpoint, activeBvid, userId);

                    // 处理频率限制，需要 CAPTCHA 验证
                    if (resData.requiresCaptcha) {
                        try {
                            const altchaSolution = await showAltchaCaptchaDialog(API_BASE);
                            resData = await doVote(API_BASE, endpoint, activeBvid, userId, altchaSolution);
                        } catch (captchaError) {
                            console.log('[B站问号榜] CAPTCHA 已取消');
                            return;
                        }
                    }

                    if (resData.success) {
                        console.log('[B站问号榜] 投票成功, isVoting:', isVoting);

                        // 只有当点亮时才发弹幕
                        if (isVoting) {
                            const preference = await getDanmakuPreference();

                            if (preference === null) {
                                // 首次使用，显示确认对话框
                                const choice = await showDanmakuConfirmDialog();
                                if (choice.sendDanmaku) {
                                    sendDanmaku('？');
                                }
                                if (choice.dontAskAgain) {
                                    await setDanmakuPreference(choice.sendDanmaku);
                                }
                            } else if (preference === true) {
                                sendDanmaku('？');
                            }
                        }
                        await syncButtonState();
                    } else {
                        alert('投票失败: ' + (resData.error || '未知错误'));
                    }
                } catch (err) {
                    console.error('[B站问号榜] 投票请求异常:', err);
                } finally {
                    qBtn.style.pointerEvents = 'auto';
                    qBtn.style.opacity = '1';
                }
            };

            isInjecting = false;
        }

        // 状态同步检查
        await syncButtonState();
    } catch (e) {
        isInjecting = false;
    }
}

// ==================== 核心注入逻辑 ====================

async function tryInject() {
    const bvid = getBvid();
    if (!bvid) return;

    // 避免重复注入
    if (document.getElementById(QUESTION_BTN.ID)) return;

    // 寻找挂载点
    const toolbarLeft = document.querySelector(SELECTORS.TOOLBAR_LEFT) ||
        document.querySelector(SELECTORS.TOOLBAR_LEFT_FALLBACK);

    if (!toolbarLeft) return;

    try {
        await injectQuestionButton();
    } catch (e) {
        console.error('[B站问号榜] 注入失败:', e);
    }
}

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
