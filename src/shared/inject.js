import {
    DEFAULT_API_BASE,
    STORAGE_KEYS,
    SELECTORS,
    QUESTION_BTN,
    LEADERBOARD_RANGES,
    RANGE_LABELS
} from './constants.js'

import {
    getVoteStatus,
    doVote,
    fetchLeaderboard,
    fetchVideoInfo
} from './api.js';

import {
    getUserId,
    getBvid,
    formatCount,
    waitFor,
    findFirst
} from '.utils.js';

import { sendDanmaku } from './danmaku.js';

import { showAltchaCaptchaDialog, showDanmakuConfirmDialog } from './dialogs.js';

/**
 * 尝试注入问号榜按钮到页面中
 * 此函数会检查必要的条件，并在满足条件时注入按钮
 */
export async function tryInject() {
    // 获取当前页面的bvid（视频ID）
    const bvid = getBvid();
    // 如果没有获取到bvid，则直接返回
    if (!bvid) return;

    // 检查推荐列表是否为空，如果为空则不进行注入
    if (document.querySelector('.rec-list').children.length === 0) return;

    if (document.getElementById(QUESTION_BTN.ID)) return;

    const toolbarLeft = document.querySelector(SELECTORS.TOOLBAR_LEFT) ||
        document.querySelector(SELECTORS.TOOLBAR_LEFT_FALLBACK);

    if (!toolbarLeft) return;

    try {
        await injectQuestionButton();
    } catch (e) {
        console.error('[B站问号榜] 注入失败:', e);
    }
}

// 同步按钮状态
export async function syncButtonState() {
    const qBtn = document.getElementById(QUESTION_BTN.ID);
    const qBtnInner = document.getElementById(QUESTION_BTN.INNER_ID);
    if (!qBtn || !qBtnInner || globalThis.isSyncing) return;

    const bvid = getBvid();
    if (!bvid) return;

    try {
        globalThis.isSyncing = true;
        const userId = getUserId();
        const statusData = await getVoteStatus(API_BASE, bvid, userId, gmFetch);

        globalThis.currentBvid = bvid;
        globalThis.lastSyncedUserId = userId;

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
        globalThis.isSyncing = false;
    }
}


// 问号按钮注入
async function injectQuestionButton() {
    try {
        const toolbarLeft = document.querySelector(SELECTORS.TOOLBAR_LEFT);
        const shareBtn = findFirst(SELECTORS.SHARE_BTN);

        if (!toolbarLeft || !shareBtn) return;

        let qBtn = document.getElementById(QUESTION_BTN.ID);

        if (!qBtn) {
            if (globalThis.isInjecting) return;
            globalThis.isInjecting = true;

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

                    let resData = await doVote(API_BASE, endpoint, activeBvid, userId, null, gmFetch);

                    // 处理频率限制，需要 CAPTCHA 验证
                    if (resData.requiresCaptcha) {
                        try {
                            const altchaSolution = await showAltchaCaptchaDialog(API_BASE, gmFetch);
                            resData = await doVote(API_BASE, endpoint, activeBvid, userId, altchaSolution, gmFetch);
                        } catch (captchaError) {
                            console.log('[B站问号榜] CAPTCHA 已取消');
                            return;
                        }
                    }

                    if (resData.success) {
                        console.log('[B站问号榜] 投票成功, isVoting:', isVoting);

                        // 只有当点亮时才发弹幕
                        if (isVoting) {
                            const preference = getDanmakuPreference();

                            if (preference === null) {
                                const choice = await showDanmakuConfirmDialog();
                                if (choice.sendDanmaku) {
                                    sendDanmaku('？');
                                }
                                if (choice.dontAskAgain) {
                                    setDanmakuPreference(choice.sendDanmaku);
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

            // 右键点击：显示排行榜面板
            qBtn.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleLeaderboardPanel();
            };

            globalThis.isInjecting = false;
        }

        // 状态同步检查
        await syncButtonState();
    } catch (e) {
        globalThis.isInjecting = false;
    }
}

// ==================== 弹幕偏好功能 ====================

async function getDanmakuPreference() {
    const result = await storageGet([STORAGE_KEYS.DANMAKU_PREF]);
    return result[STORAGE_KEYS.DANMAKU_PREF] !== undefined ? result[STORAGE_KEYS.DANMAKU_PREF] : null;
}

async function setDanmakuPreference(preference) {
    await storageSet({ [STORAGE_KEYS.DANMAKU_PREF]: preference });
}