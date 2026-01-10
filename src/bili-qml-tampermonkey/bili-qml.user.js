// ==UserScript==
// @name         B站问号榜
// @namespace    https://github.com/bili-qml-team/bili-qml
// @version      1.2
// @description  在B站视频下方增加问号键，统计并展示抽象视频排行榜。油猴脚本版本。
// @author       bili-qml-team
// @match        https://www.bilibili.com/video/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      bili-qml.top
// @run-at       document-idle
// @license      AGPL-3.0
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE = 'https://www.bili-qml.top/api';

    // ==================== CSS 样式 ====================
    GM_addStyle(`
        /* 问号按钮样式 */
        #bili-qmr-btn {
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            margin-right: 20px;
            color: #61666d;
            transition: color 0.3s;
            user-select: none;
        }

        #bili-qmr-btn:hover {
            color: #00aeec;
        }

        #bili-qmr-btn.voted {
            color: #00aeec;
        }

        .qmr-icon-wrap {
            display: flex;
            align-items: center;
        }

        .qmr-icon {
            font-size: 20px;
            font-weight: bold;
            margin-right: 4px;
            width: 28px;
            height: 28px;
            line-height: 28px;
            text-align: center;
            border: 1.5px solid currentColor;
            border-radius: 50%;
        }

        .qmr-text {
            font-size: 13px;
        }

        /* 排行榜面板样式 */
        #bili-qmr-panel {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 100000;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            display: none;
            overflow: hidden;
        }

        #bili-qmr-panel.show {
            display: block;
            animation: qmr-fadeIn 0.2s ease-out;
        }

        @keyframes qmr-fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        #bili-qmr-panel .qmr-header {
            padding: 15px;
            border-bottom: 1px solid #e3e5e7;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #bili-qmr-panel .qmr-title {
            font-size: 18px;
            font-weight: bold;
            color: #18191c;
            margin: 0;
        }

        #bili-qmr-panel .qmr-close {
            cursor: pointer;
            font-size: 20px;
            color: #9499a0;
            transition: color 0.2s;
            border: none;
            background: none;
            padding: 0;
            line-height: 1;
        }

        #bili-qmr-panel .qmr-close:hover {
            color: #18191c;
        }

        #bili-qmr-panel .qmr-tabs {
            display: flex;
            justify-content: space-around;
            padding: 10px 15px;
            border-bottom: 1px solid #e3e5e7;
        }

        #bili-qmr-panel .qmr-tab-btn {
            border: none;
            background: none;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            color: #61666d;
            border-radius: 20px;
            transition: all 0.2s;
        }

        #bili-qmr-panel .qmr-tab-btn:hover {
            background: #f4f5f7;
        }

        #bili-qmr-panel .qmr-tab-btn.active {
            color: #fff;
            background: #00aeec;
            font-weight: bold;
        }

        #bili-qmr-panel .qmr-leaderboard {
            padding: 10px 15px;
            max-height: 350px;
            overflow-y: auto;
        }

        #bili-qmr-panel .qmr-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f4f5f7;
            border-radius: 8px;
            margin-bottom: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        #bili-qmr-panel .qmr-item:hover {
            transform: translateX(5px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        #bili-qmr-panel .qmr-rank {
            font-size: 18px;
            font-weight: bold;
            color: #9499a0;
            width: 35px;
            text-align: center;
        }

        #bili-qmr-panel .qmr-item:nth-child(1) .qmr-rank { color: #fe2c55; }
        #bili-qmr-panel .qmr-item:nth-child(2) .qmr-rank { color: #ff9500; }
        #bili-qmr-panel .qmr-item:nth-child(3) .qmr-rank { color: #ffcc00; }

        #bili-qmr-panel .qmr-info {
            flex: 1;
            margin-left: 10px;
            overflow: hidden;
        }

        #bili-qmr-panel .qmr-video-title {
            font-size: 14px;
            color: #18191c;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
            text-decoration: none;
        }

        #bili-qmr-panel .qmr-video-title:hover {
            color: #00aeec;
        }

        #bili-qmr-panel .qmr-count {
            font-size: 12px;
            color: #9499a0;
            margin-top: 4px;
        }

        #bili-qmr-panel .qmr-loading {
            text-align: center;
            padding: 30px;
            color: #9499a0;
        }

        #bili-qmr-panel .qmr-empty {
            text-align: center;
            padding: 30px;
            color: #9499a0;
        }
    `);

    // ==================== 工具函数 ====================

    // 获取用户 ID (直接绑定 B 站 DedeUserID)
    function getUserId() {
        const match = document.cookie.match(/DedeUserID=([^;]+)/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }

    // 获取当前视频的 BVID
    function getBvid() {
        // 1. 从 URL 路径获取
        const pathParts = window.location.pathname.split('/');
        const bvidFromPath = pathParts.find(p => p.startsWith('BV'));
        if (bvidFromPath) return bvidFromPath;

        // 2. 从 URL 参数获取
        const urlParams = new URLSearchParams(window.location.search);
        const bvidFromParam = urlParams.get('bvid');
        if (bvidFromParam) return bvidFromParam;

        // 3. 从 B站原生变量获取
        const bvidFromWindow = window.__INITIAL_STATE__?.bvid || window.p_bvid;
        if (bvidFromWindow) return bvidFromWindow;

        return null;
    }

    // 格式化数字显示
    function formatCount(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }

    // 防抖函数
    function debounce(fn, delay) {
        let timer = null;
        return function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, arguments), delay);
        };
    }

    // ==================== 弹幕确认功能 ====================

    const STORAGE_KEY_DANMAKU_PREF = 'danmakuPreference';

    // 获取弹幕发送偏好
    function getDanmakuPreference() {
        return GM_getValue(STORAGE_KEY_DANMAKU_PREF, null);
    }

    // 设置弹幕发送偏好
    function setDanmakuPreference(preference) {
        GM_setValue(STORAGE_KEY_DANMAKU_PREF, preference);
    }

    // 显示弹幕发送确认对话框
    function showDanmakuConfirmDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 999999;
                display: flex; align-items: center; justify-content: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; border-radius: 8px; padding: 24px;
                width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            `;

            dialog.innerHTML = `
                <div style="font-size: 18px; font-weight: bold; color: #18191c; margin-bottom: 16px;">
                    发送弹幕确认
                </div>
                <div style="font-size: 14px; color: #61666d; margin-bottom: 20px;">
                    点亮问号后是否自动发送"?"弹幕？
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="qmr-dont-ask" style="margin-right: 8px;">
                        <span style="font-size: 14px; color: #61666d;">不再询问（记住我的选择）</span>
                    </label>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="qmr-btn-no" style="
                        padding: 8px 20px; border: 1px solid #e3e5e7; border-radius: 4px;
                        background: white; color: #61666d; cursor: pointer;
                        font-size: 14px; transition: all 0.2s;
                    ">
                        不发送
                    </button>
                    <button id="qmr-btn-yes" style="
                        padding: 8px 20px; border: none; border-radius: 4px;
                        background: #00aeec; color: white; cursor: pointer;
                        font-size: 14px; transition: all 0.2s;
                    ">
                        发送弹幕
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const btnNo = dialog.querySelector('#qmr-btn-no');
            const btnYes = dialog.querySelector('#qmr-btn-yes');

            btnNo.addEventListener('mouseenter', () => { btnNo.style.background = '#f4f5f7'; });
            btnNo.addEventListener('mouseleave', () => { btnNo.style.background = 'white'; });
            btnYes.addEventListener('mouseenter', () => { btnYes.style.background = '#00a1d6'; });
            btnYes.addEventListener('mouseleave', () => { btnYes.style.background = '#00aeec'; });

            const handleChoice = (sendDanmaku) => {
                const dontAsk = dialog.querySelector('#qmr-dont-ask').checked;
                overlay.remove();
                resolve({ sendDanmaku, dontAskAgain: dontAsk });
            };

            btnNo.addEventListener('click', () => handleChoice(false));
            btnYes.addEventListener('click', () => handleChoice(true));

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    resolve({ sendDanmaku: false, dontAskAgain: false });
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    // ==================== 问号按钮逻辑 ====================

    let isInjecting = false;
    let isSyncing = false;
    let currentBvid = '';
    let lastSyncedUserId = null;

    // 同步按钮状态
    async function syncButtonState() {
        const qBtn = document.getElementById('bili-qmr-btn');
        if (!qBtn) return;

        const bvid = getBvid();
        if (!bvid) return;

        if (isSyncing) return;

        try {
            isSyncing = true;
            const userId = getUserId();
            const statusRes = await fetch(`${API_BASE}/status?bvid=${bvid}&userId=${userId || ''}&_t=${Date.now()}`);
            const statusData = await statusRes.json();

            currentBvid = bvid;
            lastSyncedUserId = userId;

            const isLoggedIn = !!userId;
            if (statusData.active && isLoggedIn) {
                qBtn.classList.add('voted');
                document.getElementById('bili-qmr-btn-inner').classList.add('on');
            } else {
                qBtn.classList.remove('voted');
                document.getElementById('bili-qmr-btn-inner').classList.remove('on');
            }

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

    // 模拟发送弹幕
    function sendDanmaku(text) {
        try {
            const dmInput = document.querySelector('input.bpx-player-dm-input');
            const dmSendBtn = document.querySelector('.bpx-player-dm-btn-send');
            if (!dmInput || !dmSendBtn) return;

            dmInput.focus();
            document.execCommand('insertText', false, text);
            dmInput.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                const events = ['keydown', 'keyup'];
                events.forEach(type => {
                    dmInput.dispatchEvent(new KeyboardEvent(type, {
                        bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
                    }));
                });

                dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                dmSendBtn.click();

                setTimeout(() => {
                    dmInput.blur();
                    if (dmInput.value !== '') {
                        dmSendBtn.click();
                    }
                }, 100);
            }, 150);
        } catch (e) {
            console.error('[B站问号榜] 弹幕发送失败:', e);
        }
    }

    // 注入问号按钮
    async function injectQuestionButton() {
        try {
            const bvid = getBvid();
            if (!bvid) return;

            const toolbarLeft = document.querySelector('.video-toolbar-left-main');
            const shareBtn = document.querySelector('.video-toolbar-left-item.share') ||
                document.querySelector('.video-share') ||
                document.querySelector('.share-info');

            if (!toolbarLeft || !shareBtn) return;

            let qBtn = document.getElementById('bili-qmr-btn');

            if (!qBtn) {
                if (isInjecting) return;
                isInjecting = true;

                qBtn = document.createElement('div');
                qBtn.id = 'bili-qmr-btn';
                qBtn.className = 'toolbar-left-item-wrap';

                const qBtnInner = document.createElement('div');
                qBtnInner.id = 'bili-qmr-btn-inner';
                qBtnInner.className = 'qmr-icon-wrap video-toolbar-left-item';
                qBtnInner.innerHTML = `<svg version="1.1" id="Layer_1" class="video-share-icon video-toolbar-item-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="20" viewBox="0 0 28 28" preserveAspectRatio="xMidYMid meet"> <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M 5.419 0.414 L 4.888 1.302 L 4.888 2.782 L 5.366 3.611 L 6.588 4.736 L 3.825 4.795 L 2.444 5.209 L 0.85 6.63 L 0 8.584 L 0 23.915 L 0.584 25.632 L 1.275 26.638 L 3.241 27.941 L 24.706 27.941 L 26.353 26.934 L 27.362 25.573 L 27.841 24.152 L 27.841 8.939 L 27.097 6.985 L 25.662 5.505 L 24.175 4.913 L 21.252 4.795 L 22.953 2.723 L 23.006 1.776 L 22.634 0.888 L 21.731 0.118 L 20.615 0 L 19.605 0.651 L 15.408 4.795 L 12.486 4.854 L 7.598 0.178 L 6.004 0 Z M 4.038 9.649 L 4.569 9.057 L 5.154 8.761 L 22.421 8.761 L 23.271 9.057 L 23.962 9.708 L 24.281 10.478 L 24.228 21.666 L 24.015 22.85 L 23.431 23.619 L 22.687 24.034 L 5.419 24.034 L 4.782 23.738 L 4.091 23.027 L 3.772 22.199 L 3.772 10.241 Z M 8.288 11.188 L 7.651 11.425 L 7.173 11.721 L 6.641 12.254 L 6.216 12.964 L 6.163 13.26 L 6.057 13.438 L 6.057 13.793 L 5.951 14.266 L 6.163 14.503 L 7.81 14.503 L 7.917 14.266 L 7.917 13.911 L 8.076 13.497 L 8.554 12.964 L 8.82 12.846 L 9.404 12.846 L 9.723 12.964 L 10.042 13.201 L 10.201 13.438 L 10.361 13.911 L 10.307 14.503 L 9.935 15.095 L 8.979 15.865 L 8.501 16.457 L 8.235 17.108 L 8.182 17.7 L 8.129 17.759 L 8.129 18.351 L 8.235 18.469 L 9.935 18.469 L 9.935 17.937 L 10.201 17.285 L 10.679 16.753 L 11.211 16.338 L 11.795 15.687 L 12.167 15.036 L 12.326 14.148 L 12.22 13.142 L 11.848 12.372 L 11.423 11.899 L 10.732 11.425 L 10.042 11.188 L 9.564 11.188 L 9.51 11.129 Z M 17.958 11.188 L 17.002 11.603 L 16.63 11.899 L 16.205 12.372 L 15.833 13.082 L 15.674 13.615 L 15.62 14.326 L 15.727 14.444 L 15.992 14.503 L 17.427 14.503 L 17.533 14.385 L 17.586 13.793 L 17.746 13.438 L 18.118 13.023 L 18.49 12.846 L 19.074 12.846 L 19.605 13.142 L 19.871 13.497 L 19.977 13.793 L 19.977 14.385 L 19.871 14.681 L 19.446 15.214 L 18.702 15.805 L 18.224 16.338 L 17.905 17.049 L 17.852 17.641 L 17.799 17.7 L 17.799 18.41 L 17.852 18.469 L 19.552 18.469 L 19.605 18.41 L 19.605 17.877 L 19.712 17.522 L 19.924 17.167 L 20.296 16.753 L 21.093 16.101 L 21.465 15.687 L 21.784 15.095 L 21.996 14.148 L 21.89 13.201 L 21.677 12.668 L 21.412 12.254 L 21.093 11.899 L 20.243 11.366 L 19.712 11.188 L 19.233 11.188 L 19.18 11.129 Z M 9.032 19.18 L 8.979 19.239 L 8.767 19.239 L 8.713 19.298 L 8.66 19.298 L 8.607 19.357 L 8.501 19.357 L 8.129 19.772 L 8.129 19.831 L 8.076 19.89 L 8.076 19.949 L 8.023 20.008 L 8.023 20.186 L 7.97 20.245 L 7.97 20.6 L 8.023 20.66 L 8.023 20.837 L 8.076 20.896 L 8.076 20.956 L 8.129 21.015 L 8.129 21.074 L 8.448 21.429 L 8.501 21.429 L 8.554 21.488 L 8.607 21.488 L 8.66 21.548 L 8.82 21.548 L 8.873 21.607 L 9.298 21.607 L 9.351 21.548 L 9.457 21.548 L 9.51 21.488 L 9.564 21.488 L 9.617 21.429 L 9.67 21.429 L 10.042 21.015 L 10.042 20.956 L 10.095 20.896 L 10.095 20.778 L 10.148 20.719 L 10.148 20.186 L 10.095 20.127 L 10.095 19.949 L 10.042 19.89 L 10.042 19.831 L 9.935 19.712 L 9.935 19.653 L 9.723 19.416 L 9.67 19.416 L 9.617 19.357 L 9.564 19.357 L 9.51 19.298 L 9.404 19.298 L 9.351 19.239 L 9.192 19.239 L 9.139 19.18 Z M 18.436 19.239 L 18.383 19.298 L 18.277 19.298 L 18.224 19.357 L 18.171 19.357 L 18.118 19.416 L 18.065 19.416 L 17.852 19.653 L 17.852 19.712 L 17.746 19.831 L 17.746 19.89 L 17.693 19.949 L 17.693 20.008 L 17.639 20.068 L 17.639 20.719 L 17.693 20.778 L 17.693 20.896 L 17.746 20.956 L 17.746 21.015 L 18.118 21.429 L 18.171 21.429 L 18.224 21.488 L 18.277 21.488 L 18.33 21.548 L 18.436 21.548 L 18.49 21.607 L 18.915 21.607 L 18.968 21.548 L 19.074 21.548 L 19.127 21.488 L 19.18 21.488 L 19.233 21.429 L 19.287 21.429 L 19.393 21.311 L 19.446 21.311 L 19.446 21.252 L 19.499 21.192 L 19.552 21.192 L 19.552 21.133 L 19.712 20.956 L 19.712 20.837 L 19.765 20.778 L 19.765 20.719 L 19.818 20.66 L 19.818 20.186 L 19.765 20.127 L 19.765 20.008 L 19.712 19.949 L 19.712 19.89 L 19.658 19.831 L 19.658 19.772 L 19.34 19.416 L 19.287 19.416 L 19.18 19.298 L 19.074 19.298 L 19.021 19.239 Z"/></svg>
                    <span class="qmr-text">...</span>`;
                qBtn.appendChild(qBtnInner);

                toolbarLeft.style.position = 'relative';
                toolbarLeft.appendChild(qBtn);

                // 阻止悬停事件冒泡
                ['mouseenter', 'mouseover'].forEach(type => {
                    qBtn.addEventListener(type, (e) => e.stopPropagation());
                });

                // 左键点击：投票
                qBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!document.cookie.includes('DedeUserID')) {
                        alert('请先登录 B 站后再投问号哦 ~');
                        return;
                    }

                    const activeBvid = getBvid();
                    const title = document.querySelector('.video-title')?.innerText || document.title;
                    if (!activeBvid) return;

                    const userId = getUserId();
                    if (!userId) {
                        alert('无法获取用户信息，请确认已登录');
                        return;
                    }

                    try {
                        qBtn.style.pointerEvents = 'none';
                        qBtn.style.opacity = '0.5';
                        const response = await fetch(`${API_BASE}/vote`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ bvid: activeBvid, title, userId })
                        });

                        const resData = await response.json();
                        if (resData.success) {
                            syncButtonState();
                            if (resData.active) {
                                const preference = getDanmakuPreference();

                                if (preference === null) {
                                    // 首次使用，显示确认对话框
                                    const choice = await showDanmakuConfirmDialog();
                                    if (choice.sendDanmaku) {
                                        sendDanmaku('？');
                                    }
                                    if (choice.dontAskAgain) {
                                        setDanmakuPreference(choice.sendDanmaku);
                                    }
                                } else if (preference === true) {
                                    // 用户选择了总是发送
                                    sendDanmaku('？');
                                }
                                // preference === false 时不发送
                            }
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

                isInjecting = false;
            }

            // 状态同步检查
            const currentUserId = getUserId();
            if (bvid !== currentBvid || currentUserId !== lastSyncedUserId) {
                syncButtonState();
            }
        } catch (e) {
            isInjecting = false;
        }
    }

    // ==================== 排行榜面板逻辑 ====================

    let panelCreated = false;

    function createLeaderboardPanel() {
        if (panelCreated) return;

        const panel = document.createElement('div');
        panel.id = 'bili-qmr-panel';
        panel.innerHTML = `
            <div class="qmr-header">
                <h2 class="qmr-title">B站问号榜 ❓</h2>
                <button class="qmr-close">×</button>
            </div>
            <div class="qmr-tabs">
                <button class="qmr-tab-btn active" data-range="realtime">实时</button>
                <button class="qmr-tab-btn" data-range="daily">日榜</button>
                <button class="qmr-tab-btn" data-range="weekly">周榜</button>
                <button class="qmr-tab-btn" data-range="monthly">月榜</button>
            </div>
            <div class="qmr-leaderboard">
                <div class="qmr-loading">加载中...</div>
            </div>
        `;
        document.body.appendChild(panel);

        // 关闭按钮
        panel.querySelector('.qmr-close').onclick = () => {
            panel.classList.remove('show');
        };

        // Tab 切换
        const tabs = panel.querySelectorAll('.qmr-tab-btn');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                fetchLeaderboard(tab.dataset.range);
            };
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target.id !== 'bili-qmr-btn' && !e.target.closest('#bili-qmr-btn')) {
                panel.classList.remove('show');
            }
        });

        panelCreated = true;
    }

    function toggleLeaderboardPanel() {
        createLeaderboardPanel();
        const panel = document.getElementById('bili-qmr-panel');
        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
        } else {
            panel.classList.add('show');
            fetchLeaderboard('realtime');
        }
    }

    async function fetchLeaderboard(range = 'realtime') {
        const leaderboard = document.querySelector('#bili-qmr-panel .qmr-leaderboard');
        if (!leaderboard) return;

        leaderboard.innerHTML = '<div class="qmr-loading">加载中...</div>';

        try {
            const response = await fetch(`${API_BASE}/leaderboard?range=${range}&_t=${Date.now()}`);
            const data = await response.json();

            if (data.success && data.list.length > 0) {
                renderLeaderboard(data.list);
            } else {
                leaderboard.innerHTML = '<div class="qmr-empty">暂无数据</div>';
            }
        } catch (error) {
            console.error('[B站问号榜] 获取排行榜失败:', error);
            leaderboard.innerHTML = '<div class="qmr-empty">获取排行榜失败</div>';
        }
    }

    function renderLeaderboard(list) {
        const leaderboard = document.querySelector('#bili-qmr-panel .qmr-leaderboard');
        if (!leaderboard) return;

        leaderboard.innerHTML = '';
        list.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'qmr-item';
            div.innerHTML = `
                <div class="qmr-rank">${index + 1}</div>
                <div class="qmr-info">
                    <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="qmr-video-title" title="${item.title}">${item.title}</a>
                    <div class="qmr-count">❓ 抽象指数: ${item.count}</div>
                </div>
            `;
            leaderboard.appendChild(div);
        });
    }

    // ==================== 初始化 ====================

    const debouncedInject = debounce(injectQuestionButton, 500);

    // DOM 变化监听
    const observer = new MutationObserver(debounce(() => {
        injectQuestionButton();
    }, 1000));

    let lastUrl = location.href;

    // 延迟启动
    setTimeout(() => {
        const mainApp = document.getElementById('app') || document.body;
        observer.observe(mainApp, { childList: true, subtree: true });
        injectQuestionButton();

        // 心跳检测
        setInterval(() => {
            const urlChanged = location.href !== lastUrl;
            if (urlChanged) {
                lastUrl = location.href;
                injectQuestionButton();
            } else {
                const btn = document.getElementById('bili-qmr-btn');
                const toolbar = document.querySelector('.video-toolbar-left-main') ||
                    document.querySelector('.toolbar-left') ||
                    document.querySelector('.video-toolbar-container .left-operations');

                if (toolbar && (!btn || !toolbar.contains(btn))) {
                    injectQuestionButton();
                }
            }

            // 视频事件绑定
            const video = document.querySelector('video');
            if (video && !video.dataset.qmrListen) {
                video.dataset.qmrListen = 'true';
                video.addEventListener('play', () => setTimeout(injectQuestionButton, 500));
                video.addEventListener('pause', () => setTimeout(injectQuestionButton, 500));
            }
        }, 2000);
    }, 2500);

    // 滚动和缩放监听
    window.addEventListener('scroll', debouncedInject, { passive: true });
    window.addEventListener('resize', debouncedInject, { passive: true });

    // 注册油猴菜单命令
    GM_registerMenuCommand('📊 打开问号榜', toggleLeaderboardPanel);

})();
