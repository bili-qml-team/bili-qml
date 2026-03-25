// ==UserScript==
// @name         B站问号榜
// @namespace    https://github.com/bili-qml-team/bili-qml
// @version      1.3
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

(async function () {
    'use strict';

    const DEFAULT_API_BASE = 'https://bili-qml.bydfk.com/api';
    const DEFAULT_WEB_BASE = 'https://web.bili-qml.com/';
    // for debug
    //const DEFAULT_API_BASE = 'http://localhost:3000/api'

    // 当前 API_BASE
    const STORAGE_KEY_API_ENDPOINT = 'apiEndpoint';
    const STORAGE_KEY_WEB_ENDPOINT = 'webEndpoint';
    const STORAGE_KEY_VOTE_TOKEN = 'voteToken';
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
                background: var(--bg-color); border-radius: 12px; padding: 24px;
                width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
                text-align: center;
            `;

            dialog.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--text-main); margin-bottom: 12px;">
                    人机验证
                </div>
                <div id="qmr-captcha-status" style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                    检测到频繁操作，请完成验证
                </div>
                <div id="qmr-captcha-progress" style="display: none; margin-bottom: 20px;">
                    <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div id="qmr-captcha-bar" style="width: 0%; height: 100%; background: #00aeec; transition: width 0.3s;"></div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">正在验证中...</div>
                </div>
                <div id="qmr-captcha-buttons">
                    <button id="qmr-captcha-start" style="
                        padding: 10px 32px; border: none; border-radius: 6px;
                        background: var(--primary-color); color: white; cursor: pointer;
                        font-size: 14px; transition: all 0.2s;
                    ">
                        开始验证
                    </button>
                    <button id="qmr-captcha-cancel" style="
                        padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 6px;
                        background: var(--card-bg); color: var(--text-main); cursor: pointer;
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

            startBtn.addEventListener('mouseenter', () => startBtn.style.background = 'var(--primary-hover)');
            startBtn.addEventListener('mouseleave', () => startBtn.style.background = 'var(--primary-color)');

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
        :root {
            --qmr-primary: #00aeec;
            --qmr-primary-hover: #00a1d6;
            --qmr-bg: rgba(255, 255, 255, 0.95);
            --qmr-card-bg: #ffffff;
            --qmr-text-main: #18191c;
            --qmr-text-sec: #9499a0;
            --qmr-border: #e3e5e7;
            --qmr-count-bg: #f6f7f8;
            --qmr-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
            --qmr-shadow-md: 0 8px 16px rgba(0, 0, 0, 0.08);
            --qmr-radius: 12px;
        }
        
        #bili-qmr-panel.qmr-dark {
            --qmr-bg: rgba(31, 32, 35, 0.95);
            --qmr-card-bg: #2a2b30;
            --qmr-text-main: #ffffff;
            --qmr-text-sec: #a0a0a0;
            --qmr-border: #3f4045;
            --qmr-count-bg: rgba(255,255,255,0.1);
            --qmr-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        #bili-qmr-panel.qmr-dark .qmr-header {
            background: rgba(40, 41, 45, 0.5);
            border-bottom-color: rgba(255,255,255,0.05);
        }

        #bili-qmr-panel.qmr-dark :is(.qmr-tab-btn, .qmr-page-btn, .qmr-settings-btn, .qmr-close):hover {
            background: rgba(255, 255, 255, 0.1);
        }

        #bili-qmr-panel.qmr-dark .qmr-tab-btn.active {
            background: #3f4045;
            color: var(--qmr-primary);
        }

        #bili-qmr-panel.qmr-dark .qmr-settings-desc {
            color: #888;
        }

        #bili-qmr-panel.qmr-dark .qmr-radio-item {
            background: #2a2b30;
            border-color: #3f4045;
        }

        #bili-qmr-panel.qmr-dark .qmr-radio-item:hover {
            background: rgba(255,255,255,0.05);
        }

        #bili-qmr-panel.qmr-dark :is(.qmr-advanced-section, .qmr-advanced-toggle, .qmr-advanced-content, .qmr-settings) {
            background-color: var(--qmr-card-bg);
            border-color: #3f4045;
        }
        
        #bili-qmr-panel.qmr-dark .qmr-endpoint-input {
            background: #1f2023;
            border-color: #3f4045;
            color: #eee;
        }
        
        #bili-qmr-panel.qmr-dark .qmr-reset-btn {
            background: rgba(255, 255, 255, 0.05);
            border-color: #3f4045;
            color: #eee;
        }

        #bili-qmr-panel.qmr-dark .qmr-reset-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        #bili-qmr-panel.qmr-dark .qmr-tabs {
            background: rgba(255, 255, 255, 0.05);
        }

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
            color: var(--qmr-primary);
            transform: translateY(-1px);
        }

        #bili-qmr-btn.voted {
            color: var(--qmr-primary);
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
            width: 360px;
            max-height: calc(100vh - 160px);
            background: var(--qmr-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            z-index: 100000;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            display: none;
            overflow: hidden;
            flex-direction: column;
            border: 1px solid rgba(255, 255, 255, 0.6);
            animation: qmr-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #bili-qmr-panel.show {
            display: flex;
        }

        @keyframes qmr-slideIn {
            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        #bili-qmr-panel .qmr-header {
            padding: 16px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.5);
            border-radius: 16px 16px 0 0;
            cursor: grab;
            user-select: none;
        }

        #bili-qmr-panel .qmr-header:active {
            cursor: grabbing;
        }

        #bili-qmr-panel :is(.qmr-dragging, .qmr-dragged) {
            animation: none;
            transition: none;
        }

        #bili-qmr-panel .qmr-title {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #00aeec 0%, #0077aa 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
        }

        #bili-qmr-panel .qmr-close {
            cursor: pointer;
            font-size: 20px;
            color: var(--qmr-text-sec);
            transition: all 0.2s;
            border: none;
            background: none;
            padding: 0;
            line-height: 1;
        }
        
        #bili-qmr-panel.light .qmr-close {
            color: var(--qmr-text-sec);
        }
        
        #bili-qmr-panel .qmr-close:hover {
            color: var(--qmr-text-main);
            transform: rotate(90deg);
        }

        #bili-qmr-panel .qmr-tabs {
            display: flex;
            justify-content: space-around;
            padding: 8px 16px;
            background: rgba(255,255,255,0.3);
            gap: 8px;
        }

        #bili-qmr-panel .qmr-tab-btn {
            border: none;
            background: rgba(0,0,0,0.02);
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: var(--qmr-text-sec);
            border-radius: 8px;
            transition: all 0.2s;
            flex: 1;
        }

        #bili-qmr-panel .qmr-tab-btn:hover {
            background: rgba(0,0,0,0.05);
            color: var(--qmr-text-main);
        }

        #bili-qmr-panel .qmr-tab-btn.active {
            color: var(--qmr-primary);
            background: #fff;
            font-weight: 600;
            box-shadow: var(--qmr-shadow-sm);
        }

        #bili-qmr-panel .qmr-leaderboard {
            padding: 10px 16px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        #bili-qmr-panel .qmr-leaderboard::-webkit-scrollbar {
            width: 4px;
        }
        #bili-qmr-panel .qmr-leaderboard::-webkit-scrollbar-thumb {
            background: #ddd; 
            border-radius: 2px;
        }

        #bili-qmr-panel .qmr-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: var(--qmr-card-bg);
            border-radius: var(--qmr-radius);
            margin-bottom: 10px;
            box-shadow: var(--qmr-shadow-sm);
            transition: all 0.2s ease;
            cursor: default;
            border: 1px solid transparent;
        }

        #bili-qmr-panel .qmr-item:hover {
            transform: translateY(-2px);
            box-shadow: var(--qmr-shadow-md);
            border-color: rgba(0, 174, 236, 0.2);
        }

        #bili-qmr-panel .qmr-rank {
            font-size: 18px;
            font-weight: 800;
            color: #d0d0d0;
            width: 36px;
            text-align: center;
            font-style: italic;
        }

        #bili-qmr-panel .qmr-item:nth-child(1) .qmr-rank { color: #fe2c55; text-shadow: 0 2px 4px rgba(254,44,85,0.2); }
        #bili-qmr-panel .qmr-item:nth-child(2) .qmr-rank { color: #ff9500; text-shadow: 0 2px 4px rgba(255,149,0,0.2); }
        #bili-qmr-panel .qmr-item:nth-child(3) .qmr-rank { color: #ffcc00; text-shadow: 0 2px 4px rgba(255,204,0,0.2); }

        #bili-qmr-panel .qmr-rank-custom {
            font-size: 18px;
            font-weight: 900;
            line-height: normal;
            writing-mode: vertical-rl;
            text-orientation: upright;
            margin: 0 auto;
            display: inline-block;
            letter-spacing: 1px;
            transform: translateX(4px);
            width: auto;
            color: #fe2c55;
            text-shadow: 0 2px 4px rgba(254,44,85,0.2);
        }

        #bili-qmr-panel .qmr-info {
            flex: 1;
            margin-left: 10px;
            overflow: hidden;
        }

        #bili-qmr-panel .qmr-video-title {
            font-size: 14px;
            color: var(--qmr-text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
            text-decoration: none;
            margin-bottom: 6px;
            font-weight: 500;
        }

        #bili-qmr-panel .qmr-video-title:hover {
            color: var(--qmr-primary);
        }

        #bili-qmr-panel .qmr-count {
            font-size: 12px;
            color: var(--qmr-text-sec);
            background: var(--qmr-count-bg);
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
        }

        #bili-qmr-panel .qmr-loading, #bili-qmr-panel .qmr-empty {
            text-align: center;
            padding: 40px;
            color: var(--qmr-text-sec);
        }

        /* 设置按钮 */
        #bili-qmr-panel .qmr-settings-btn {
            cursor: pointer;
            font-size: 18px;
            margin-right: 8px;
            transition: all 0.2s;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }

        #bili-qmr-panel .qmr-settings-btn:hover {
            background: rgba(0,0,0,0.05);
            transform: rotate(45deg);
        }

        /* 独立页面按钮 */
        #bili-qmr-panel .qmr-page-btn {
            cursor: pointer;
            border: none;
            background: transparent;
            font-size: 18px;
            margin-right: 0;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }

        #bili-qmr-panel .qmr-page-btn:hover {
            transform: scale(1.1);
            background: rgba(0,0,0,0.05);
        }

        /* 设置面板 */
        #bili-qmr-panel .qmr-settings {
            padding: 20px;
            display: none;
            overflow-y: auto;
            flex: 1;
            background: #f9f9f9;
        }

        #bili-qmr-panel .qmr-settings.show {
            display: block;
        }

        #bili-qmr-panel .qmr-settings h3 {
            font-size: 15px;
            color: var(--qmr-text-main);
            margin: 0 0 8px 0;
            font-weight: 600;
        }

        #bili-qmr-panel .qmr-settings-desc {
            font-size: 13px;
            color: var(--qmr-text-sec);
            margin: 0 0 16px 0;
        }

        #bili-qmr-panel .qmr-radio-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
        }

        #bili-qmr-panel .qmr-radio-item {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 12px;
            border-radius: 8px;
            background: #fff;
            border: 1px solid var(--qmr-border);
            transition: all 0.2s;
        }

        #bili-qmr-panel .qmr-radio-item:hover {
            border-color: var(--qmr-primary);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        #bili-qmr-panel .qmr-radio-item:has(input:checked) {
             border-color: var(--qmr-primary);
             background: rgba(0, 174, 236, 0.05);
        }

        #bili-qmr-panel .qmr-radio-item input[type="radio"] {
            margin: 0 12px 0 0;
            cursor: pointer;
            accent-color: var(--qmr-primary);
        }

        #bili-qmr-panel .qmr-radio-item span {
            font-size: 14px;
            color: var(--qmr-text-main);
        }

        #bili-qmr-panel .qmr-save-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #00aeec 0%, #009cd6 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
            margin-top: 10px;
        }

        #bili-qmr-panel .qmr-save-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0, 174, 236, 0.4);
        }

        #bili-qmr-panel .qmr-save-btn:active {
            transform: translateY(1px);
        }

        #bili-qmr-panel .qmr-save-status {
            text-align: center;
            margin-top: 12px;
            font-size: 13px;
            color: var(--qmr-primary);
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
            border: 1px solid var(--qmr-border);
            border-radius: 8px;
            font-size: 13px;
            color: var(--qmr-text-main);
            transition: all 0.2s;
            outline: none;
        }

        #bili-qmr-panel .qmr-endpoint-input:focus {
            border-color: var(--qmr-primary);
            box-shadow: 0 0 0 3px rgba(0, 174, 236, 0.1);
        }

        #bili-qmr-panel .qmr-endpoint-input::placeholder {
            color: #9499a0;
        }

        #bili-qmr-panel .qmr-reset-btn {
            width: 36px;
            height: 36px;
            border: 1px solid var(--qmr-border);
            border-radius: 8px;
            background: #fff;
            color: var(--qmr-text-sec);
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        #bili-qmr-panel .qmr-reset-btn:hover {
            border-color: var(--qmr-text-sec);
            color: var(--qmr-text-main);
        }

        #bili-qmr-panel .qmr-settings-divider {
            margin: 20px 0;
            border: none;
            border-top: 1px solid var(--qmr-border);
        }

        /* 高级选项折叠区域 */
        #bili-qmr-panel .qmr-advanced-section {
            margin-top: 15px;
            border: 1px solid var(--qmr-border);
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
        }

        #bili-qmr-panel .qmr-advanced-toggle {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            background: #f4f5f7;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: var(--qmr-text-main);
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

        /* Loading Spinner */
        #bili-qmr-panel .qmr-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(0, 174, 236, 0.1);
            border-radius: 50%;
            border-top-color: var(--qmr-primary);
            animation: qmr-spin 1s ease-in-out infinite;
            margin: 0 auto 10px;
        }

        @keyframes qmr-spin {
            to { transform: rotate(360deg); }
        }
        
        @media (prefers-color-scheme: dark) {
            :root {
            --qmr-bg: rgba(31, 32, 35, 0.95);
            --qmr-card-bg: #2a2b30;
            --qmr-text-main: #ffffff;
            --qmr-text-sec: #a0a0a0;
            --qmr-border: #3f4045;
            --qmr-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            #bili-qmr-panel {
            --qmr-bg: rgba(31, 32, 35, 0.95);
            --qmr-card-bg: #2a2b30;
            --qmr-text-main: #ffffff;
            --qmr-text-sec: #a0a0a0;
            --qmr-border: #3f4045;
            --qmr-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            #bili-qmr-panel .qmr-header {
            background: rgba(40, 41, 45, 0.5);
            border-bottom-color: rgba(255,255,255,0.05);
            }
            
            #bili-qmr-panel :is(.qmr-tab-btn:hover, .qmr-page-btn:hover, .qmr-settings-btn:hover, .qmr-close:hover) {
                background: rgba(255,255,255,0.1);
            }
            
            #bili-qmr-panel .qmr-tab-btn.active {
                background: #3f4045;
                color: var(--qmr-primary);
            }
            
            #bili-qmr-panel .qmr-count {
                background: rgba(255,255,255,0.1);
            }

            #bili-qmr-panel .qmr-settings-desc {
                color: #888;
            }
            
            #bili-qmr-panel .qmr-radio-item {
                background: #2a2b30;
                border-color: #3f4045;
            }
            
            #bili-qmr-panel .qmr-radio-item:hover {
                background: rgba(255,255,255,0.05);
            }
            
            #bili-qmr-panel :is(.qmr-advanced-section, .qmr-advanced-toggle, .qmr-advanced-content, .qmr-settings) {
                background-color: var(--qmr-card-bg);
                border-color: #3f4045;
            }
            
            #bili-qmr-panel .qmr-reset-btn {
                background: rgba(255, 255, 255, 0.05);
                border-color: #3f4045;
                color: #eee;
            }

            #bili-qmr-panel .qmr-reset-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            #bili-qmr-panel .qmr-tabs {
                background: rgba(255, 255, 255, 0.05);
            }
        }
        
         #bili-qmr-panel.qmr-light {
            --qmr-bg: rgba(255, 255, 255, 0.95);
            --qmr-card-bg: #ffffff;
            --qmr-text-main: #18191c;
            --qmr-text-sec: #9499a0;
            --qmr-border: #e3e5e7;
            --qmr-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
            
            
            .qmr-tab-btn.active {
                background: #fff;
                color: var(--qmr-primary);
            }
            
            .qmr-radio-item {
                background: #fff;
            }
            
            .qmr-header {
                background: rgba(255,255,255,0.5);
            }
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

    function getCookie(name) {
        const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
        return match && match[1] ? match[1] : null;
    }

    async function acquireVoteToken(forceRenew = false) {
        const cachedToken = forceRenew ? null : GM_getValue(STORAGE_KEY_VOTE_TOKEN, null);
        if (cachedToken) {
            return cachedToken;
        }

        if (!confirm('投票需要一次性验证，将在你的 B 站账号创建一个公开收藏夹用于验证。是否继续？')) {
            return null;
        }

        const userId = getCookie('DedeUserID');
        const csrf = getCookie('bili_jct');

        if (!userId || !csrf) {
            alert('请先登录 B 站。');
            return null;
        }

        try {
            // 1. 获取挑战名称
            const nameResp = await fetch(`${API_BASE}/token/fav-name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const nameJson = await nameResp.json();
            if (!nameResp.ok || !nameJson?.success || !nameJson?.name) {
                throw new Error(nameJson?.error || '获取验证信息失败');
            }

            // 2. 创建收藏夹
            const params = new URLSearchParams();
            params.append('title', nameJson.name);
            params.append('privacy', '0');
            params.append('csrf', csrf);

            const createResp = await fetch('https://api.bilibili.com/x/v3/fav/folder/add', {
                method: 'POST',
                body: params,
                credentials: 'include'
            });
            const createJson = await createResp.json();
            if (createJson.code !== 0) {
                throw new Error(`创建收藏夹失败: ${createJson.message}`);
            }

            const mediaId = createJson.data.id;

            // 3. 校验并获取 Token
            const verifyResp = await fetch(`${API_BASE}/token/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, mediaId })
            });
            const verifyJson = await verifyResp.json();
            if (!verifyResp.ok || !verifyJson?.success || !verifyJson?.token) {
                throw new Error(verifyJson?.error || '服务器校验失败');
            }

            // 删除验证用收藏夹（仅删除本次创建的 ID）
            try {
                const deleteParams = new URLSearchParams();
                deleteParams.append('media_ids', String(mediaId));
                deleteParams.append('csrf', csrf);
                deleteParams.append('csrf_token', csrf);

                const deleteResp = await fetch('https://api.bilibili.com/x/v3/fav/folder/del', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: deleteParams,
                    credentials: 'include'
                });
                const deleteJson = await deleteResp.json();
                if (deleteJson.code !== 0) {
                    console.warn('[B站问号榜] 删除验证收藏夹失败:', deleteJson.message || deleteJson.code);
                }
            } catch (deleteError) {
                console.warn('[B站问号榜] 删除验证收藏夹异常:', deleteError);
            }

            GM_setValue(STORAGE_KEY_VOTE_TOKEN, verifyJson.token);
            alert('验证成功，现在可以投票了。');
            return verifyJson.token;
        } catch (e) {
            console.error(e);
            alert(`验证失败: ${e.message}`);
            return null;
        }
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

    // HTML 转义函数，防止特殊字符导致 HTML 属性被截断
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

    function normalizeWebEndpoint(value) {
        const trimmed = (value || '').trim();
        if (!trimmed) return '';
        let candidate = trimmed;
        if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
            candidate = `https://${candidate}`;
        }
        try {
            const url = new URL(candidate);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return null;
            }
            return url.toString();
        } catch (error) {
            return null;
        }
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
            background: var(--bg1); border-radius: 8px; padding: 24px;
            width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            `;

            dialog.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; color: var(--text1); margin-bottom: 16px;">
                发送弹幕确认
            </div>
            <div style="font-size: 14px; color: var(--text1); margin-bottom: 20px;">
                点亮问号后是否自动发送"?"弹幕？
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="qmr-dont-ask" style="margin-right: 8px;">
                    <span style="font-size: 14px; color: var(--text3);">不再询问（记住我的选择）</span>
                </label>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="qmr-btn-no" style="
                    padding: 8px 20px; border: 1px solid var(--line_regular); border-radius: 4px;
                    background: var(--bg1_float); color: var(--text1); cursor: pointer;
                    font-size: 14px; transition: all 0.2s;
                ">
                    不发送
                </button>
                <button id="qmr-btn-yes" style="
                    padding: 8px 20px; border: none; border-radius: 4px;
                    background: var(--brand_blue); color: white; cursor: pointer;
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

            btnNo.addEventListener('mouseenter', () => { btnNo.style.background = 'var(--bg3)'; });
            btnNo.addEventListener('mouseleave', () => { btnNo.style.background = 'var(--bg1_float)'; });
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
        const qBtnInner = document.getElementById('bili-qmr-btn-inner');
        if (!qBtn || !qBtnInner || isSyncing) return;

        const bvid = getBvid();
        if (!bvid) return;

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

    // 模拟发送弹幕功能
    async function sendDanmaku(text) {
        console.log('[B站问号榜] 尝试发送弹幕:', text);

        // 1. 寻找弹幕输入框和发送按钮
        // 尝试多种选择器以增强兼容性
        const inputSelectors = [
            'input.bpx-player-dm-input', // 新版
            '.bilibili-player-video-danmaku-input', // 旧版
            'textarea.bpx-player-dm-input', // 可能的变体
            '.video-danmaku-input'
        ];

        const btnSelectors = [
            '.bpx-player-dm-btn-send', // 新版
            '.bilibili-player-video-danmaku-btn-send', // 旧版
            '.video-danmaku-btn-send'
        ];

        let dmInput = null;
        let dmSendBtn = null;

        for (const sel of inputSelectors) {
            dmInput = document.querySelector(sel);
            if (dmInput) break;
        }

        for (const sel of btnSelectors) {
            dmSendBtn = document.querySelector(sel);
            if (dmSendBtn) break;
        }

        if (!dmInput || !dmSendBtn) {
            console.error('[B站问号榜] 未找到弹幕输入框或发送按钮');
            return;
        }

        try {
            // 2. 聚焦输入框
            dmInput.focus();
            dmInput.click(); // 确保激活

            // 3. 填入内容并让 React 感知
            // React 重写了 value setter，必须获取原始 setter
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set || Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;

            if (setter) {
                setter.call(dmInput, text);
            } else {
                dmInput.value = text;
            }

            // 4. 模拟完整输入事件链
            // React often needs 'input' and 'change' bubbles
            dmInput.dispatchEvent(new Event('input', { bubbles: true }));
            dmInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 模拟中文输入法结束事件（有时对React组件很重要）
            dmInput.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
            dmInput.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));

            // 辅助等待函数
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // 5. 顺序尝试发送方案
            // 稍微延迟，确保状态同步
            await wait(100);

            // --- 方案1: 回车键 ---
            console.log('[B站问号榜] 尝试方案1: 回车发送');
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13
            });
            dmInput.dispatchEvent(enterEvent);

            // 等待观察结果
            await wait(1000);

            // 检查是否发送成功（发送成功通常会清空输入框）
            // 如果输入框内容变了（比如变空），说明发送成功
            if (dmInput.value !== text) {
                console.log('[B站问号榜] 方案1生效，发送成功');
                dmInput.blur();
                return;
            }

            // --- 方案2: 点击发送按钮 ---
            console.log('[B站问号榜] 方案1未奏效，尝试方案2: 点击按钮');
            // 模拟鼠标交互
            dmSendBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            dmSendBtn.click();
            dmSendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

            // 等待观察结果
            await wait(1000);

            if (dmInput.value !== text) {
                console.log('[B站问号榜] 方案2生效，发送成功');
                dmInput.blur();
                return;
            }

            // --- 方案3: 强制点击 (Fallback) ---
            console.log('[B站问号榜] 方案2未奏效，尝试方案3: 强制点击');
            dmSendBtn.click();

            // 6. 清理
            setTimeout(() => {
                if (dmInput.value === text) {
                    console.warn('[B站问号榜] 所有方案尝试完毕，似乎仍未发送成功');
                }
                dmInput.blur();
            }, 200);

        } catch (e) {
            console.error('[B站问号榜] 弹幕发送异常:', e);
        }
    }

    // 注入问号按钮
    async function injectQuestionButton() {
        try {
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

                qBtn.onclick = async (e) => {
                    e.preventDefault();
                    // e.stopPropagation(); // 依然保留，防止点击事件向上冒泡干扰 B 站

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

                    // 内部函数：执行投票请求
                    const doVote = async (token, altchaSolution = null) => {
                        const endpoint = isVoting ? "vote" : "unvote";
                        const requestBody = { bvid: activeBvid, userId };
                        if (altchaSolution) {
                            requestBody.altcha = altchaSolution;
                        }

                        const response = await fetch(`${API_BASE}/${endpoint}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(requestBody)
                        });
                        return { status: response.status, data: await response.json() };
                    };

                    try {
                        qBtn.style.pointerEvents = 'none';
                        qBtn.style.opacity = '0.5';

                        let token = await acquireVoteToken();
                        if (!token) {
                            return;
                        }

                        let res = await doVote(token);
                        if (res.status === 401) {
                            GM_setValue(STORAGE_KEY_VOTE_TOKEN, null);
                            token = await acquireVoteToken(true);
                            if (!token) {
                                return;
                            }
                            res = await doVote(token);
                        }
                        let resData = res.data;

                        // 处理频率限制，需要 CAPTCHA 验证
                        if (resData.requiresCaptcha) {
                            try {
                                const altchaSolution = await showAltchaCaptchaDialog();
                                const captchaRes = await doVote(token, altchaSolution);
                                resData = captchaRes.data;
                            } catch (captchaError) {
                                // 用户取消了 CAPTCHA
                                console.log('[B站问号榜] CAPTCHA 已取消');
                                return;
                            }
                        }

                        if (resData.success) {
                            console.log('[B站问号榜] 投票成功, isVoting:', isVoting);
                            // 只有当点亮（isVoting 为 true）时才发弹幕
                            if (isVoting) {
                                console.log('[B站问号榜] 获取弹幕偏好...');
                                const preference = getDanmakuPreference();
                                console.log('[B站问号榜] 弹幕偏好:', preference);

                                if (preference === null) {
                                    console.log('[B站问号榜] 首次使用，显示确认对话框');
                                    // 首次使用，显示确认对话框
                                    const choice = await showDanmakuConfirmDialog();
                                    console.log('[B站问号榜] 用户选择:', choice);
                                    if (choice.sendDanmaku) {
                                        sendDanmaku('？');
                                    }
                                    if (choice.dontAskAgain) {
                                        setDanmakuPreference(choice.sendDanmaku);
                                    }
                                } else if (preference === true) {
                                    // 用户选择了总是发送
                                    console.log('[B站问号榜] 偏好为总是发送，直接发弹幕');
                                    sendDanmaku('？');
                                }
                                // preference === false 时不发送
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

    function openWebLeaderboard() {
        const rawBase = GM_getValue(STORAGE_KEY_WEB_ENDPOINT, null) || DEFAULT_WEB_BASE;
        const normalizedBase = normalizeWebEndpoint(rawBase) || DEFAULT_WEB_BASE;
        const voteToken = String(GM_getValue(STORAGE_KEY_VOTE_TOKEN, '') || '').trim();
        let targetUrl;
        try {
            const url = new URL(normalizedBase);
            const uid = getUserId();
            if (uid) {
                url.searchParams.set('uid', uid);
            }
            url.searchParams.set('from', 'extension');
            if (voteToken) {
                url.searchParams.set('token', voteToken);
            }
            targetUrl = url.toString();
        } catch (error) {
            const fallbackUrl = new URL(DEFAULT_WEB_BASE);
            const uid = getUserId();
            if (uid) {
                fallbackUrl.searchParams.set('uid', uid);
            }
            fallbackUrl.searchParams.set('from', 'extension');
            if (voteToken) {
                fallbackUrl.searchParams.set('token', voteToken);
            }
            targetUrl = fallbackUrl.toString();
        }
        const win = window.open(targetUrl, '_blank');
        if (!win) {
            alert('[B站问号榜] 打开新页面失败：可能被浏览器拦截了弹窗');
        }
    }

    function createLeaderboardPanel() {
        if (panelCreated) return;

        const panel = document.createElement('div');
        panel.id = 'bili-qmr-panel';
        panel.innerHTML = `
            <div class="qmr-header">
                <button class="qmr-page-btn" title="打开web页面">📊</button>
                <h2 class="qmr-title" style="flex:1; margin-left: 12px;">B站问号榜 ❓</h2>
                <div style="display: flex; align-items: center;">
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
                <hr class="qmr-settings-divider">
                <h3>第一名显示设置</h3>
                <p class="qmr-settings-desc">自定义排行榜第一名的显示文本</p>
                <div class="qmr-radio-group">
                    <label class="qmr-radio-item">
                        <input type="radio" name="qmr-rank1-pref" value="default">
                        <span>正常 (1)</span>
                    </label>
                    <label class="qmr-radio-item">
                        <input type="radio" name="qmr-rank1-pref" value="custom">
                        <span>抽象 (何一位)</span>
                    </label>
                </div>
                <div class="settings-section" style="margin-top: 15px;">
                    <h3>主题色设置</h3>
                    <div class="qmr-radio-group">
                        <label class="qmr-radio-item">
                            <input type="radio" name="qmr-theme-pref" value="system" checked>
                            <span>跟随系统主题</span>
                        </label>
                        <label class="qmr-radio-item">
                            <input type="radio" name="qmr-theme-pref" value="light">
                            <span>浅色模式</span>
                        </label>
                        <label class="qmr-radio-item">
                            <input type="radio" name="qmr-theme-pref" value="dark">
                            <span>深色模式</span>
                        </label>
                    </div>
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
                        <h3>Web 端网址设置</h3>
                        <p class="qmr-settings-desc">自定义 Web 端跳转地址</p>
                        <div class="qmr-endpoint-group">
                            <input type="text" class="qmr-endpoint-input" data-role="web-endpoint" placeholder="https://web.bili-qml.com/">
                            <button class="qmr-reset-btn" data-role="reset-web-endpoint" title="恢复默认">↺</button>
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

        // 拖拽功能
        const header = panel.querySelector('.qmr-header');
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let panelStartX = 0;
        let panelStartY = 0;

        header.addEventListener('mousedown', (e) => {
            // 排除点击按钮等交互元素
            if (e.target.closest('.qmr-close') ||
                e.target.closest('.qmr-settings-btn') ||
                e.target.closest('.qmr-page-btn') ||
                e.target.closest('#qmr-theme-btn')) {
                return;
            }

            isDragging = true;
            panel.classList.add('qmr-dragging');
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            // 获取当前面板位置
            const rect = panel.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;

            // 改为使用 left/top 定位以便拖拽
            panel.style.right = 'auto';
            panel.style.left = panelStartX + 'px';
            panel.style.top = panelStartY + 'px';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;

            let newX = panelStartX + deltaX;
            let newY = panelStartY + deltaY;

            // 边界限制
            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            newX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
            newY = Math.max(0, Math.min(newY, windowHeight - panelHeight));

            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('qmr-dragging');
                panel.classList.add('qmr-dragged');
            }
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

        // 页面按钮：打开web页面
        panel.querySelector('.qmr-page-btn').onclick = () => {
            openWebLeaderboard();
        };

        // 重置 Endpoint 按钮
        const resetEndpointBtn = panel.querySelector('.qmr-endpoint-group .qmr-reset-btn');
        if (resetEndpointBtn) {
            resetEndpointBtn.onclick = () => {
                const endpointInput = panel.querySelector('.qmr-endpoint-input');
                if (endpointInput) {
                    endpointInput.value = DEFAULT_API_BASE;
                }
            };
        }

        const resetWebEndpointBtn = panel.querySelector('[data-role="reset-web-endpoint"]');
        if (resetWebEndpointBtn) {
            resetWebEndpointBtn.onclick = () => {
                const webEndpointInput = panel.querySelector('[data-role="web-endpoint"]');
                if (webEndpointInput) {
                    webEndpointInput.value = DEFAULT_WEB_BASE;
                }
            };
        }

        // 主题切换
        const themeBtnSystem = panel.querySelector('input[name="qmr-theme-pref"][value="system"]');
        const themeBtnLight = panel.querySelector('input[name="qmr-theme-pref"][value="light"]');
        const themeBtnDark = panel.querySelector('input[name="qmr-theme-pref"][value="dark"]');
        if (themeBtnSystem) {
            themeBtnSystem.addEventListener('change', () => {
                panel.classList.remove('qmr-light', 'qmr-dark');
            });
        }
        if (themeBtnLight) {
            themeBtnLight.addEventListener('change', () => {
                panel.classList.remove('qmr-dark');
                panel.classList.add('qmr-light');
            })
        }
        if (themeBtnDark) {
            themeBtnDark.addEventListener('change', () => {
                panel.classList.remove('qmr-light');
                panel.classList.add('qmr-dark');
            })
        }

        const applyTheme = () => {
            const value = GM_getValue('theme');
            switch (value) {
                case 'system':
                    panel.classList.remove('qmr-dark', 'qmr-light');
                    break;
                case 'light':
                    panel.classList.remove('qmr-dark');
                    panel.classList.add('qmr-light');
                    break;
                case 'dark':
                    panel.classList.remove('qmr-light');
                    panel.classList.add('qmr-dark');
                    break;
                default:
                    break;
            }
        };
        applyTheme();

        // 保存按钮
        panel.querySelector('.qmr-save-btn').onclick = () => {
            const selectedRadio = panel.querySelector('input[name="qmr-danmaku-pref"]:checked');
            const rank1Radio = panel.querySelector('input[name="qmr-rank1-pref"]:checked');
            const endpointInput = panel.querySelector('.qmr-endpoint-input');
            const endpointValue = endpointInput ? endpointInput.value.trim() : '';
            const webEndpointInput = panel.querySelector('[data-role="web-endpoint"]');
            const webEndpointValue = webEndpointInput ? webEndpointInput.value.trim() : '';
            const normalizedWebEndpoint = normalizeWebEndpoint(webEndpointValue);
            const statusDiv = panel.querySelector('.qmr-save-status');

            if (normalizedWebEndpoint === null) {
                if (statusDiv) {
                    statusDiv.textContent = 'Web 端地址格式不正确';
                    statusDiv.style.opacity = '1';
                }
                return;
            }
            if (webEndpointInput && normalizedWebEndpoint && webEndpointInput.value !== normalizedWebEndpoint) {
                webEndpointInput.value = normalizedWebEndpoint;
            }

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

            // 第一名显示设置
            if (rank1Radio) {
                GM_setValue('rank1Setting', rank1Radio.value);
            }

            // 主题设置
            const themeRadio = panel.querySelector('input[name="qmr-theme-pref"]:checked');
            if (themeRadio) {
                GM_setValue('theme', themeRadio.value);
                applyTheme();
            }

            // Endpoint 设置
            if (endpointValue && endpointValue !== DEFAULT_API_BASE) {
                GM_setValue(STORAGE_KEY_API_ENDPOINT, endpointValue);
                API_BASE = endpointValue;
            } else {
                GM_setValue(STORAGE_KEY_API_ENDPOINT, null);
                API_BASE = DEFAULT_API_BASE;
            }

            // Web Endpoint 设置
            if (normalizedWebEndpoint && normalizedWebEndpoint !== DEFAULT_WEB_BASE) {
                GM_setValue(STORAGE_KEY_WEB_ENDPOINT, normalizedWebEndpoint);
            } else {
                GM_setValue(STORAGE_KEY_WEB_ENDPOINT, null);
            }

            if (statusDiv) {
                statusDiv.textContent = '设置已保存';
                statusDiv.style.opacity = '1';
            }

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

        const themeValue = GM_getValue('theme', null);
        const themeRadio = document.querySelector(`input[name="qmr-theme-pref"][value="${themeValue}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }

        // 第一名显示设置
        const rank1Setting = GM_getValue('rank1Setting', 'custom');
        const rank1Radio = panel.querySelector(`input[name="qmr-rank1-pref"][value="${rank1Setting}"]`);
        if (rank1Radio) {
            rank1Radio.checked = true;
        }

        // Endpoint 设置
        const endpointInput = panel.querySelector('.qmr-endpoint-input');
        if (endpointInput) {
            const savedEndpoint = GM_getValue(STORAGE_KEY_API_ENDPOINT, null);
            endpointInput.value = savedEndpoint || '';
        }

        const webEndpointInput = panel.querySelector('[data-role="web-endpoint"]');
        if (webEndpointInput) {
            const savedWebEndpoint = GM_getValue(STORAGE_KEY_WEB_ENDPOINT, null);
            webEndpointInput.value = savedWebEndpoint || DEFAULT_WEB_BASE;
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

    async function fetchLeaderboard(range = 'realtime', altchaSolution = null) {
        const leaderboard = document.querySelector('#bili-qmr-panel .qmr-leaderboard');
        if (!leaderboard) return;

        leaderboard.innerHTML = '<div class="qmr-loading"><div class="qmr-spinner"></div>加载中...</div>';

        try {
            let url = `${API_BASE}/leaderboard?range=${range}&_t=${Date.now()}`;
            if (altchaSolution) {
                url += `&altcha=${encodeURIComponent(altchaSolution)}`;
            }
            const response = await fetch(url);
            const data = await response.json();

            // 处理频率限制，需要 CAPTCHA 验证
            if (data.requiresCaptcha) {
                leaderboard.innerHTML = '<div class="qmr-loading"><div class="qmr-spinner"></div>需要人机验证...</div>';
                try {
                    const solution = await showAltchaCaptchaDialog();
                    return fetchLeaderboard(range, solution);
                } catch (captchaError) {
                    leaderboard.innerHTML = '<div class="qmr-empty">验证已取消</div>';
                    return;
                }
            }

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

    async function renderLeaderboard(list) {
        const leaderboard = document.querySelector('#bili-qmr-panel .qmr-leaderboard');
        if (!leaderboard) return;

        const rank1Custom = GM_getValue('rank1Setting', 'custom') === 'custom';

        leaderboard.innerHTML = '';
        // 获取设置
        await Promise.all(list.map(async (item, index) => {
            try {
                let cache = {};
                const conn = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${item.bvid}`);
                const json = await conn.json();
                if (json.code === 0 && json.data?.title) {
                    cache.title = json.data.title;
                } else {
                    cache.title = '未知标题';
                }
                cache.bvid = item.bvid;
                cache.count = item.count;
                renderEntry(cache, index + 1, rank1Custom);
            } catch (err) {
                console.error(`获取标题失败 ${item.bvid}:`, err);
                cache.title = '加载失败';
                cache.bvid = item.bvid;
                cache.count = item.count;
                renderEntry(cache, index + 1, rank1Custom);
            }
        }));
    }

    function renderEntry(item, index, rank1Custom) {
        const leaderboard = document.querySelector('#bili-qmr-panel .qmr-leaderboard');
        if (!leaderboard) return;

        const div = document.createElement('div');
        div.className = 'qmr-item';

        let rankDisplay = index;
        let rankClass = 'qmr-rank';
        if (index === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankClass += ' qmr-rank-custom';
        }

        // 对数据进行HTML转义，防止特殊字符破坏HTML结构
        const escapedTitle = escapeHtml(item.title);
        const escapedBvid = escapeHtml(item.bvid);
        const escapedCount = escapeHtml(String(item.count));

        div.innerHTML = `
            <div class="${rankClass}">${rankDisplay}</div>
            <div class="qmr-info">
                <a href="https://www.bilibili.com/video/${escapedBvid}" target="_blank" class="qmr-video-title" title="${escapedTitle}">${escapedTitle}</a>
                <div class="qmr-count">❓ 抽象指数: ${escapedCount}</div>
            </div>
        `;
        
        // 找到正确的插入位置以维持排行顺序
        const allItems = Array.from(leaderboard.querySelectorAll('.qmr-item'));
        const nextItem = allItems.find(el => {
            // 需要处理 '何一位' 这种非数字的情况，确保排序正确
            const rankText = el.querySelector('.qmr-rank')?.textContent || '999999';
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

    function waitFor(selector, ms = undefined) {
        return new Promise((resolve, reject) => {
            const target = document.querySelector(selector);
            if (target) {
                resolve(target);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            if (ms) {
                const timeoutId = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element not found: "${selector}" within ${ms}ms`));
                }, ms);

                // 清理：如果元素提前找到了，清除定时器
                const originalResolve = resolve;
                resolve = (value) => {
                    clearTimeout(timeoutId);
                    originalResolve(value);
                };
            }
        });
    }

    // 核心注入逻辑
    async function tryInject() {
        // 再次检查 BVID
        const bvid = getBvid();
        if (!bvid) return;

        const recList = document.querySelector('.rec-list');
        if (!recList || recList.children.length === 0) return;

        // 避免重复注入
        if (document.getElementById('bili-qmr-btn')) return;

        // 寻找挂载点
        const toolbarLeft = document.querySelector('.video-toolbar-left-main') ||
            document.querySelector('.toolbar-left'); // 兼容旧版

        // 如果找不到工具栏，可能还在加载，或者是不支持的页面
        if (!toolbarLeft) {
            return;
        }

        try {
            await injectQuestionButton();
        } catch (e) {
            console.error('[B站问号榜] 注入失败:', e);
        }
    }

    // ==================== 初始化 ====================

    // 初始加载：等待 Vue 加载完成，搜索框应该是最后进行 load 的元素
    function insertPromise(selector) {
        return new Promise((resolve) => {
            waitFor(selector).then(() => {
                resolve();
            });
        });
    }
    await Promise.all([insertPromise('.nav-search-input[maxlength]'), insertPromise('.view-icon[width]')]);
    tryInject()

    // 处理 SPA 软导航 (URL 变化)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // URL 变化后，重新等待稳定再注入
            syncButtonState();
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
