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

    const DEFAULT_API_BASE = 'https://bili-qml.bydfk.com/api';
    // for debug
    //const DEFAULT_API_BASE = 'http://localhost:3000/api'

    // 当前 API_BASE
    const STORAGE_KEY_API_ENDPOINT = 'apiEndpoint';
    let API_BASE = GM_getValue(STORAGE_KEY_API_ENDPOINT, null) || DEFAULT_API_BASE;

    // ==================== Altcha CAPTCHA 功能 ====================

    // 获取 Altcha 挑战
    async function fetchAltchaChallenge() {
        const response = await fetch(`${API_BASE}/altcha/challenge`);
        if (!response.ok) throw new Error('Failed to fetch challenge');
        return response.json();
    }

    // 解决 Altcha 挑战 (Proof-of-Work)
    async function solveAltchaChallenge(challenge) {
        const { algorithm, challenge: challengeHash, salt, maxnumber, signature } = challenge;

        // 使用 Web Crypto API 进行 SHA-256 哈希
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

    // 显示 Altcha CAPTCHA 对话框
    function showAltchaCaptchaDialog() {
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
                    <button id="qmr-captcha-start" style="
                        padding: 10px 32px; border: none; border-radius: 6px;
                        background: #00aeec; color: white; cursor: pointer;
                        font-size: 14px; transition: all 0.2s;
                    ">
                        开始验证
                    </button>
                    <button id="qmr-captcha-cancel" style="
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

            startBtn.addEventListener('mouseenter', () => startBtn.style.background = '#00a1d6');
            startBtn.addEventListener('mouseleave', () => startBtn.style.background = '#00aeec');

            cancelBtn.onclick = () => {
                overlay.remove();
                reject(new Error('CAPTCHA cancelled'));
            };

            startBtn.onclick = async () => {
                try {
                    buttonsDiv.style.display = 'none';
                    progressDiv.style.display = 'block';
                    statusDiv.textContent = '正在获取验证挑战...';

                    const challenge = await fetchAltchaChallenge();
                    statusDiv.textContent = '正在计算验证...';

                    // 模拟进度（实际进度难以精确计算）
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
                        overlay.remove();
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
                    overlay.remove();
                    reject(new Error('CAPTCHA cancelled'));
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

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
            max-height: calc(100vh - 160px);
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 100000;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            display: none;
            overflow: hidden;
            flex-direction: column;
        }

        #bili-qmr-panel.show {
            display: flex;
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

        /* 设置按钮 */
        #bili-qmr-panel .qmr-settings-btn {
            cursor: pointer;
            font-size: 18px;
            margin-right: 12px;
            transition: transform 0.2s;
        }

        #bili-qmr-panel .qmr-settings-btn:hover {
            transform: rotate(30deg);
        }

        /* 独立页面按钮 */
        #bili-qmr-panel .qmr-page-btn {
            cursor: pointer;
            height: 28px;
            padding: 0 10px;
            border: 1px solid #e3e5e7;
            border-radius: 6px;
            background: #fff;
            color: #61666d;
            font-size: 13px;
            margin-right: 10px;
            transition: background-color 0.2s, border-color 0.2s;
        }

        #bili-qmr-panel .qmr-page-btn:hover {
            background: #f4f5f7;
            border-color: #d1d4d7;
        }

        /* 设置面板 */
        #bili-qmr-panel .qmr-settings {
            padding: 20px;
            display: none;
            overflow-y: auto;
            flex: 1;
        }

        #bili-qmr-panel .qmr-settings.show {
            display: block;
        }

        #bili-qmr-panel .qmr-settings h3 {
            font-size: 16px;
            color: #18191c;
            margin: 0 0 8px 0;
        }

        #bili-qmr-panel .qmr-settings-desc {
            font-size: 13px;
            color: #9499a0;
            margin: 0 0 20px 0;
        }

        #bili-qmr-panel .qmr-radio-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }

        #bili-qmr-panel .qmr-radio-item {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 10px;
            border-radius: 6px;
            background: #f4f5f7;
            transition: background-color 0.2s;
        }

        #bili-qmr-panel .qmr-radio-item:hover {
            background-color: #e3e5e7;
        }

        #bili-qmr-panel .qmr-radio-item input[type="radio"] {
            margin: 0 10px 0 0;
            cursor: pointer;
            accent-color: #00aeec;
        }

        #bili-qmr-panel .qmr-radio-item span {
            font-size: 14px;
            color: #18191c;
            user-select: none;
        }

        #bili-qmr-panel .qmr-save-btn {
            width: 100%;
            padding: 10px;
            background: #00aeec;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        #bili-qmr-panel .qmr-save-btn:hover {
            background: #00a1d6;
        }

        #bili-qmr-panel .qmr-save-status {
            text-align: center;
            margin-top: 12px;
            font-size: 13px;
            color: #00aeec;
            opacity: 0;
            transition: opacity 0.3s;
        }

        /* Endpoint 设置样式 */
        #bili-qmr-panel .qmr-endpoint-group {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 20px;
        }

        #bili-qmr-panel .qmr-endpoint-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #e3e5e7;
            border-radius: 6px;
            font-size: 13px;
            color: #18191c;
            transition: border-color 0.2s, box-shadow 0.2s;
            outline: none;
        }

        #bili-qmr-panel .qmr-endpoint-input:focus {
            border-color: #00aeec;
            box-shadow: 0 0 0 2px rgba(0, 174, 236, 0.1);
        }

        #bili-qmr-panel .qmr-endpoint-input::placeholder {
            color: #9499a0;
        }

        #bili-qmr-panel .qmr-reset-btn {
            width: 36px;
            height: 36px;
            border: 1px solid #e3e5e7;
            border-radius: 6px;
            background: #fff;
            color: #61666d;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s, border-color 0.2s, color 0.2s;
            flex-shrink: 0;
        }

        #bili-qmr-panel .qmr-reset-btn:hover {
            background: #f4f5f7;
            border-color: #d1d4d7;
            color: #18191c;
        }

        #bili-qmr-panel .qmr-settings-divider {
            margin: 20px 0;
            border: none;
            border-top: 1px solid #e3e5e7;
        }

        /* 高级选项折叠区域 */
        #bili-qmr-panel .qmr-advanced-section {
            margin-top: 15px;
            border: 1px solid #e3e5e7;
            border-radius: 8px;
            overflow: hidden;
        }

        #bili-qmr-panel .qmr-advanced-toggle {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            background: #f4f5f7;
            cursor: pointer;
            font-size: 14px;
            color: #61666d;
            user-select: none;
            transition: background-color 0.2s, color 0.2s;
            list-style: none;
        }

        #bili-qmr-panel .qmr-advanced-toggle::-webkit-details-marker {
            display: none;
        }

        #bili-qmr-panel .qmr-advanced-toggle::before {
            content: '▶';
            font-size: 10px;
            margin-right: 8px;
            transition: transform 0.2s;
        }

        #bili-qmr-panel .qmr-advanced-section[open] .qmr-advanced-toggle::before {
            transform: rotate(90deg);
        }

        #bili-qmr-panel .qmr-advanced-toggle:hover {
            background: #e3e5e7;
            color: #18191c;
        }

        #bili-qmr-panel .qmr-advanced-content {
            padding: 15px;
            background: #fff;
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
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            setter?.call(dmInput, text);
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
                    if (!activeBvid) return;

                    const userId = getUserId();
                    if (!userId) {
                        alert('无法获取用户信息，请确认已登录');
                        return;
                    }

                    // 内部函数：执行投票请求
                    const doVote = async (altchaSolution = null) => {
                        const endpoint = qBtn.classList.contains("voted") == true ? "unvote" : "vote";
                        const requestBody = { bvid: activeBvid, userId };
                        if (altchaSolution) {
                            requestBody.altcha = altchaSolution;
                        }

                        const response = await fetch(`${API_BASE}/${endpoint}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(requestBody)
                        });
                        return response.json();
                    };

                    try {
                        qBtn.style.pointerEvents = 'none';
                        qBtn.style.opacity = '0.5';

                        let resData = await doVote();

                        // 处理频率限制，需要 CAPTCHA 验证
                        if (resData.requiresCaptcha) {
                            try {
                                const altchaSolution = await showAltchaCaptchaDialog();
                                resData = await doVote(altchaSolution);
                            } catch (captchaError) {
                                // 用户取消了 CAPTCHA
                                console.log('[B站问号榜] CAPTCHA 已取消');
                                return;
                            }
                        }

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
            await syncButtonState();
        } catch (e) {
            isInjecting = false;
        }
    }

    // ==================== 排行榜面板逻辑 ====================

    let panelCreated = false;

    function openStandaloneLeaderboardPage(initialRange = 'realtime') {
        const win = window.open('about:blank', '_blank');
        if (!win) {
            alert('[B站问号榜] 打开新页面失败：可能被浏览器拦截了弹窗');
            return;
        }

        const safeRange = ['realtime', 'daily', 'weekly', 'monthly'].includes(initialRange) ? initialRange : 'realtime';
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>B站问号榜</title>
    <style>
        body{width:auto;font-family:"PingFang SC","Microsoft YaHei",sans-serif;margin:0;padding:16px;background-color:#f4f5f7;}
        .container{display:flex;flex-direction:column;max-width:920px;margin:0 auto;}
        header{text-align:center;border-bottom:1px solid #e3e5e7;padding-bottom:10px;}
        h1{font-size:18px;color:#18191c;margin:10px 0;}
        .tabs{display:flex;justify-content:space-around;margin-top:10px;}
        .tab-btn{border:none;background:none;padding:5px 10px;cursor:pointer;font-size:14px;color:#61666d;border-bottom:2px solid transparent;}
        .tab-btn.active{color:#00aeec;border-bottom-color:#00aeec;font-weight:bold;}
        #leaderboard{margin-top:15px;}
        .loading{text-align:center;padding:20px;color:#9499a0;}

        .item{display:flex;align-items:flex-start;padding:10px;background:#fff;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 2px rgba(0,0,0,0.05);}
        .rank{font-size:16px;font-weight:bold;color:#9499a0;width:30px;flex:0 0 30px;line-height:1.2;}
        .item:nth-child(1) .rank{color:#fe2c55;}
        .item:nth-child(2) .rank{color:#ff9500;}
        .item:nth-child(3) .rank{color:#ffcc00;}

        .thumb{display:block;width:160px;height:100px;border-radius:8px;overflow:hidden;flex:0 0 160px;background:#f4f5f7;text-decoration:none;}
        .thumb img{width:100%;height:100%;object-fit:cover;display:block;}

        .info{flex:1;margin-left:10px;overflow:hidden;display:flex;flex-direction:column;min-height:100px;}
        .title{font-size:14px;color:#18191c;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-decoration:none;}
        .title:hover{color:#00aeec;}
        .qml{font-size:12px;color:#61666d;margin-top:6px;}

        .bottom{display:flex;flex-direction:column;gap:8px;margin-top:auto;padding-top:10px;font-size:12px;color:#9499a0;}
        .bottom-row{display:flex;align-items:center;gap:12px;min-width:0;}
        .bottom-item{display:inline-flex;align-items:center;gap:6px;min-width:0;}
        .icon{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid #e3e5e7;border-radius:4px;color:#61666d;background:#fff;font-size:11px;line-height:1;flex:0 0 20px;}
        .text{color:#9499a0;line-height:1.2;}
        .text.up{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>B站问号榜 ❓</h1>
            <div class="tabs">
                <button class="tab-btn" data-range="realtime">实时</button>
                <button class="tab-btn" data-range="daily">日榜</button>
                <button class="tab-btn" data-range="weekly">周榜</button>
                <button class="tab-btn" data-range="monthly">月榜</button>
            </div>
        </header>
        <main id="leaderboard"><div class="loading">加载中...</div></main>
    </div>

    <script>
        (function(){
            const API_BASE = ${JSON.stringify(API_BASE)};
            const initialRange = ${JSON.stringify(safeRange)};
            const leaderboard = document.getElementById('leaderboard');
            const tabs = Array.from(document.querySelectorAll('.tab-btn'));
            const videoInfoCache = new Map();

            function formatCount(num){
                const n = Number(num) || 0;
                if(n >= 100000000){const v=n/100000000;return (v>=10?Math.round(v):v.toFixed(1))+'亿';}
                if(n >= 10000){const v=n/10000;return (v>=10?Math.round(v):v.toFixed(1))+'万';}
                return String(n);
            }

            async function tryFetchJson(url){
                const resp = await fetch(url, { credentials: 'include' });
                const json = await resp.json();
                if(json && json.code === 0 && json.data) return json.data;
                return null;
            }

            async function fetchVideoInfo(bvid){
                // Prefer wbi/view (needs SESSDATA); fallback to view.
                try{
                    return (await tryFetchJson('https://api.bilibili.com/x/web-interface/wbi/view?bvid='+encodeURIComponent(bvid)))
                            || (await tryFetchJson('https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(bvid)));
                }catch(e){
                    return null;
                }
            }

            function setActiveTab(range){
                tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.range === range));
            }

            function renderList(list){
                leaderboard.innerHTML = '';
                list.forEach((item, index) => {
                    const bvid = item && item.bvid ? item.bvid : '';
                    const title = item && item.title ? item.title : '未知标题';
                    const pic = item && item.pic ? item.pic : '';
                    const ownerName = item && item.ownerName ? item.ownerName : '';
                    const viewText = item && item.view != null ? formatCount(item.view) : '';
                    const danmakuText = item && item.danmaku != null ? formatCount(item.danmaku) : '';

                    const root = document.createElement('div');
                    root.className = 'item';

                    const rank = document.createElement('div');
                    rank.className = 'rank';
                    rank.textContent = String(index + 1);
                    root.appendChild(rank);

                    const thumbLink = document.createElement('a');
                    thumbLink.className = 'thumb';
                    thumbLink.href = 'https://www.bilibili.com/video/' + bvid;
                    thumbLink.target = '_blank';
                    thumbLink.setAttribute('aria-label', '打开视频');
                    if(pic){
                        const img = document.createElement('img');
                        img.src = pic;
                        img.alt = title;
                        img.loading = 'lazy';
                        thumbLink.appendChild(img);
                    }
                    root.appendChild(thumbLink);

                    const info = document.createElement('div');
                    info.className = 'info';

                    const titleLink = document.createElement('a');
                    titleLink.className = 'title';
                    titleLink.href = 'https://www.bilibili.com/video/' + bvid;
                    titleLink.target = '_blank';
                    titleLink.title = title;
                    titleLink.textContent = title;
                    info.appendChild(titleLink);

                    const qml = document.createElement('div');
                    qml.className = 'qml';
                    qml.textContent = '抽象指数：' + (item && item.count != null ? item.count : '');
                    info.appendChild(qml);

                    const bottom = document.createElement('div');
                    bottom.className = 'bottom';

                    const row1 = document.createElement('div');
                    row1.className = 'bottom-row';
                    if(ownerName){
                        const wrap = document.createElement('span');
                        wrap.className = 'bottom-item';
                        const icon = document.createElement('span');
                        icon.className = 'icon';
                        icon.textContent = 'UP';
                        const text = document.createElement('span');
                        text.className = 'text up';
                        text.title = ownerName;
                        text.textContent = ownerName;
                        wrap.appendChild(icon);
                        wrap.appendChild(text);
                        row1.appendChild(wrap);
                    }
                    bottom.appendChild(row1);

                    const row2 = document.createElement('div');
                    row2.className = 'bottom-row';
                    if(viewText){
                        const wrap = document.createElement('span');
                        wrap.className = 'bottom-item';
                        const icon = document.createElement('span');
                        icon.className = 'icon';
                        icon.textContent = '▶';
                        const text = document.createElement('span');
                        text.className = 'text';
                        text.textContent = viewText;
                        wrap.appendChild(icon);
                        wrap.appendChild(text);
                        row2.appendChild(wrap);
                    }
                    if(danmakuText){
                        const wrap = document.createElement('span');
                        wrap.className = 'bottom-item';
                        const icon = document.createElement('span');
                        icon.className = 'icon';
                        icon.textContent = '弹';
                        const text = document.createElement('span');
                        text.className = 'text';
                        text.textContent = danmakuText;
                        wrap.appendChild(icon);
                        wrap.appendChild(text);
                        row2.appendChild(wrap);
                    }
                    bottom.appendChild(row2);

                    info.appendChild(bottom);
                    root.appendChild(info);
                    leaderboard.appendChild(root);
                });
            }

            async function fetchLeaderboard(range){
                leaderboard.innerHTML = '<div class="loading">加载中...</div>';
                try{
                    const resp = await fetch(API_BASE + '/leaderboard?range=' + encodeURIComponent(range) + '&_t=' + Date.now());
                    const data = await resp.json();
                    if(!data || !data.success || !data.list || data.list.length === 0){
                        leaderboard.innerHTML = '<div class="loading">暂无数据</div>';
                        return;
                    }

                    // Best-effort enrich.
                    await Promise.all(data.list.map(async (it, idx) => {
                        const bvid = it && it.bvid;
                        if(!bvid) return;
                        try{
                            if(!videoInfoCache.has(bvid)) videoInfoCache.set(bvid, fetchVideoInfo(bvid));
                            const info = await videoInfoCache.get(bvid);
                            if(info){
                                data.list[idx].title = info.title || data.list[idx].title;
                                data.list[idx].pic = info.pic;
                                data.list[idx].ownerName = info.owner && info.owner.name;
                                data.list[idx].view = info.stat && info.stat.view;
                                data.list[idx].danmaku = info.stat && info.stat.danmaku;
                            }
                        }catch(e){}
                    }));

                    renderList(data.list);
                }catch(e){
                    console.error('[B站问号榜] 独立页面获取排行榜失败:', e);
                    leaderboard.innerHTML = '<div class="loading">获取失败（可能未登录或接口被拦截）</div>';
                }
            }

            tabs.forEach(btn => {
                btn.addEventListener('click', () => {
                    const r = btn.dataset.range;
                    if(!r) return;
                    setActiveTab(r);
                    fetchLeaderboard(r);
                });
            });

            setActiveTab(initialRange);
            fetchLeaderboard(initialRange);
        })();
    </script>
</body>
</html>`;

        win.document.open();
        win.document.write(html);
        win.document.close();
    }

    function createLeaderboardPanel() {
        if (panelCreated) return;

        const panel = document.createElement('div');
        panel.id = 'bili-qmr-panel';
        panel.innerHTML = `
            <div class="qmr-header">
                <h2 class="qmr-title">B站问号榜 ❓</h2>
                <div style="display: flex; align-items: center;">
                    <button class="qmr-page-btn" title="打开独立页面">页面</button>
                    <span class="qmr-settings-btn" title="设置">⚙️</span>
                    <button class="qmr-close">×</button>
                </div>
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
            <div class="qmr-settings">
                <h3>弹幕发送设置</h3>
                <p class="qmr-settings-desc">点亮问号后，是否自动发送"?"弹幕</p>
                <div class="qmr-radio-group">
                    <label class="qmr-radio-item">
                        <input type="radio" name="qmr-danmaku-pref" value="ask">
                        <span>每次询问</span>
                    </label>
                    <label class="qmr-radio-item">
                        <input type="radio" name="qmr-danmaku-pref" value="always">
                        <span>总是发送</span>
                    </label>
                    <label class="qmr-radio-item">
                        <input type="radio" name="qmr-danmaku-pref" value="never">
                        <span>总是不发送</span>
                    </label>
                </div>
                <details class="qmr-advanced-section">
                    <summary class="qmr-advanced-toggle">高级选项</summary>
                    <div class="qmr-advanced-content">
                        <h3>API 服务器设置</h3>
                        <p class="qmr-settings-desc">自定义问号榜服务器地址</p>
                        <div class="qmr-endpoint-group">
                            <input type="text" class="qmr-endpoint-input" placeholder="https://bili-qml.bydfk.com/api">
                            <button class="qmr-reset-btn" title="恢复默认">↺</button>
                        </div>
                    </div>
                </details>
                <button class="qmr-save-btn">保存设置</button>
                <div class="qmr-save-status"></div>
            </div>
        `;
        document.body.appendChild(panel);

        // 关闭按钮
        const closeBtn = panel.querySelector('.qmr-close');
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            panel.classList.remove('show');
        });

        // 设置按钮
        panel.querySelector('.qmr-settings-btn').onclick = () => {
            const leaderboard = panel.querySelector('.qmr-leaderboard');
            const settings = panel.querySelector('.qmr-settings');
            const tabs = panel.querySelector('.qmr-tabs');

            if (settings.classList.contains('show')) {
                // 返回排行榜
                settings.classList.remove('show');
                leaderboard.style.display = 'block';
                tabs.style.display = 'flex';
            } else {
                // 显示设置
                settings.classList.add('show');
                leaderboard.style.display = 'none';
                tabs.style.display = 'none';
                loadSettingsUI();
            }
        };

        // 页面按钮：打开独立榜单页
        panel.querySelector('.qmr-page-btn').onclick = () => {
            const active = panel.querySelector('.qmr-tab-btn.active');
            const range = active?.dataset?.range || 'realtime';
            openStandaloneLeaderboardPage(range);
        };

        // 重置 Endpoint 按钮
        panel.querySelector('.qmr-reset-btn').onclick = () => {
            const endpointInput = panel.querySelector('.qmr-endpoint-input');
            if (endpointInput) {
                endpointInput.value = DEFAULT_API_BASE;
            }
        };

        // 保存按钮
        panel.querySelector('.qmr-save-btn').onclick = () => {
            const selectedRadio = panel.querySelector('input[name="qmr-danmaku-pref"]:checked');
            const endpointInput = panel.querySelector('.qmr-endpoint-input');
            const endpointValue = endpointInput ? endpointInput.value.trim() : '';

            // 弹幕偏好
            if (selectedRadio) {
                const value = selectedRadio.value;
                let preference;

                if (value === 'always') {
                    preference = true;
                } else if (value === 'never') {
                    preference = false;
                } else {
                    preference = null;
                }

                if (preference === null) {
                    GM_setValue(STORAGE_KEY_DANMAKU_PREF, null);
                } else {
                    setDanmakuPreference(preference);
                }
            }

            // Endpoint 设置
            if (endpointValue && endpointValue !== DEFAULT_API_BASE) {
                GM_setValue(STORAGE_KEY_API_ENDPOINT, endpointValue);
                API_BASE = endpointValue;
            } else {
                GM_setValue(STORAGE_KEY_API_ENDPOINT, null);
                API_BASE = DEFAULT_API_BASE;
            }

            const statusDiv = panel.querySelector('.qmr-save-status');
            statusDiv.textContent = '设置已保存';
            statusDiv.style.opacity = '1';

            setTimeout(() => {
                statusDiv.style.opacity = '0';
                // 返回排行榜
                const leaderboard = panel.querySelector('.qmr-leaderboard');
                const settings = panel.querySelector('.qmr-settings');
                const tabs = panel.querySelector('.qmr-tabs');
                settings.classList.remove('show');
                leaderboard.style.display = 'block';
                tabs.style.display = 'flex';
            }, 500);
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

    // 加载设置界面
    function loadSettingsUI() {
        const panel = document.getElementById('bili-qmr-panel');
        if (!panel) return;

        // 弹幕偏好
        const preference = getDanmakuPreference();
        let value = 'ask';

        if (preference === true) {
            value = 'always';
        } else if (preference === false) {
            value = 'never';
        }

        const radio = panel.querySelector(`input[name="qmr-danmaku-pref"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }

        // Endpoint 设置
        const endpointInput = panel.querySelector('.qmr-endpoint-input');
        if (endpointInput) {
            const savedEndpoint = GM_getValue(STORAGE_KEY_API_ENDPOINT, null);
            endpointInput.value = savedEndpoint || '';
        }
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

    function observeDomStabilization(callback, { delay = 1000, maxWait = 10000 } = {}) {
        let debounceTimeout;
        let maxWaitTimeout;
        let disconnected = false;

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimeout);
            if (!disconnected) {
                debounceTimeout = setTimeout(done, delay);
            }
        });

        const done = () => {
            if (disconnected) return;
            disconnected = true;
            observer.disconnect();
            clearTimeout(maxWaitTimeout);
            callback();
        };

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        maxWaitTimeout = setTimeout(() => {
            console.log('[B站问号榜] 最长等待时间到了，强制注入');
            done();
        }, maxWait);

        debounceTimeout = setTimeout(done, delay);
    }

    // 核心注入逻辑
    async function tryInject() {
        // 再次检查 BVID
        const bvid = getBvid();
        if (!bvid) return;

        // 避免重复注入
        if (document.getElementById('bili-qmr-btn')) return;

        // 寻找挂载点
        const toolbarLeft = document.querySelector('.video-toolbar-left-main') ||
            document.querySelector('.toolbar-left'); // 兼容旧版

        // 如果找不到工具栏，可能还在加载，或者是不支持的页面
        if (!toolbarLeft) {
            // console.log('[B站问号榜] 未找到工具栏，跳过注入');
            return;
        }

        try {
            await injectQuestionButton();
        } catch (e) {
            console.error('[B站问号榜] 注入失败:', e);
        }
    }

    // ==================== 初始化 ====================

    // 初始加载：等待 DOM 稳定
    observeDomStabilization(() => {
        tryInject();
    });

    // 处理 SPA 软导航 (URL 变化)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // URL 变化后，重新等待稳定再注入
            observeDomStabilization(() => {
                tryInject();
            }, { delay: 500 });
        } else {
            // 简单的保底检查：如果当前应该是视频页但按钮丢了
            if (getBvid() && !document.getElementById('bili-qmr-btn')) {
                // 不使用 observer，直接尝试一下，避免死循环
                if (document.querySelector('.video-toolbar-left-main')) {
                    tryInject();
                }
            }
        }
    }, 1000);

    // 注册油猴菜单命令
    GM_registerMenuCommand('📊 打开问号榜', toggleLeaderboardPanel);

})();
