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
        DANMAKU_PREF: 'danmakuPreference',
        API_ENDPOINT: 'apiEndpoint'};

    // DOM 选择器
    const SELECTORS = {
        // 弹幕输入框
        DANMAKU_INPUT: [
            'input.bpx-player-dm-input',
            '.bilibili-player-video-danmaku-input',
            'textarea.bpx-player-dm-input',
            '.video-danmaku-input'
        ],
        // 弹幕发送按钮
        DANMAKU_SEND_BTN: [
            '.bpx-player-dm-btn-send',
            '.bilibili-player-video-danmaku-btn-send',
            '.video-danmaku-btn-send'
        ],
        // 工具栏
        TOOLBAR_LEFT: '.video-toolbar-left-main',
        TOOLBAR_LEFT_FALLBACK: '.toolbar-left',
        // 分享按钮
        SHARE_BTN: [
            '.video-toolbar-left-item.share',
            '.video-share',
            '.share-info'
        ],
        // 搜索框（用于判断页面加载完成）
        NAV_SEARCH: '.nav-search-input'
    };

    // 问号按钮相关
    const QUESTION_BTN = {
        ID: 'bili-qmr-btn',
        INNER_ID: 'bili-qmr-btn-inner',
        PANEL_ID: 'bili-qmr-panel',
        SVG_ICON: `<svg version="1.1" id="Layer_1" class="video-share-icon video-toolbar-item-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="20" viewBox="0 0 28 28" preserveAspectRatio="xMidYMid meet"> <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M 5.419 0.414 L 4.888 1.302 L 4.888 2.782 L 5.366 3.611 L 6.588 4.736 L 3.825 4.795 L 2.444 5.209 L 0.85 6.63 L 0 8.584 L 0 23.915 L 0.584 25.632 L 1.275 26.638 L 3.241 27.941 L 24.706 27.941 L 26.353 26.934 L 27.362 25.573 L 27.841 24.152 L 27.841 8.939 L 27.097 6.985 L 25.662 5.505 L 24.175 4.913 L 21.252 4.795 L 22.953 2.723 L 23.006 1.776 L 22.634 0.888 L 21.731 0.118 L 20.615 0 L 19.605 0.651 L 15.408 4.795 L 12.486 4.854 L 7.598 0.178 L 6.004 0 Z M 4.038 9.649 L 4.569 9.057 L 5.154 8.761 L 22.421 8.761 L 23.271 9.057 L 23.962 9.708 L 24.281 10.478 L 24.228 21.666 L 24.015 22.85 L 23.431 23.619 L 22.687 24.034 L 5.419 24.034 L 4.782 23.738 L 4.091 23.027 L 3.772 22.199 L 3.772 10.241 Z M 8.288 11.188 L 7.651 11.425 L 7.173 11.721 L 6.641 12.254 L 6.216 12.964 L 6.163 13.26 L 6.057 13.438 L 6.057 13.793 L 5.951 14.266 L 6.163 14.503 L 7.81 14.503 L 7.917 14.266 L 7.917 13.911 L 8.076 13.497 L 8.554 12.964 L 8.82 12.846 L 9.404 12.846 L 9.723 12.964 L 10.042 13.201 L 10.201 13.438 L 10.361 13.911 L 10.307 14.503 L 9.935 15.095 L 8.979 15.865 L 8.501 16.457 L 8.235 17.108 L 8.182 17.7 L 8.129 17.759 L 8.129 18.351 L 8.235 18.469 L 9.935 18.469 L 9.935 17.937 L 10.201 17.285 L 10.679 16.753 L 11.211 16.338 L 11.795 15.687 L 12.167 15.036 L 12.326 14.148 L 12.22 13.142 L 11.848 12.372 L 11.423 11.899 L 10.732 11.425 L 10.042 11.188 L 9.564 11.188 L 9.51 11.129 Z M 17.958 11.188 L 17.002 11.603 L 16.63 11.899 L 16.205 12.372 L 15.833 13.082 L 15.674 13.615 L 15.62 14.326 L 15.727 14.444 L 15.992 14.503 L 17.427 14.503 L 17.533 14.385 L 17.586 13.793 L 17.746 13.438 L 18.118 13.023 L 18.49 12.846 L 19.074 12.846 L 19.605 13.142 L 19.871 13.497 L 19.977 13.793 L 19.977 14.385 L 19.871 14.681 L 19.446 15.214 L 18.702 15.805 L 18.224 16.338 L 17.905 17.049 L 17.852 17.641 L 17.799 17.7 L 17.799 18.41 L 17.852 18.469 L 19.552 18.469 L 19.605 18.41 L 19.605 17.877 L 19.712 17.522 L 19.924 17.167 L 20.296 16.753 L 21.093 16.101 L 21.465 15.687 L 21.784 15.095 L 21.996 14.148 L 21.89 13.201 L 21.677 12.668 L 21.412 12.254 L 21.093 11.899 L 20.243 11.366 L 19.712 11.188 L 19.233 11.188 L 19.18 11.129 Z M 9.032 19.18 L 8.979 19.239 L 8.767 19.239 L 8.713 19.298 L 8.66 19.298 L 8.607 19.357 L 8.501 19.357 L 8.129 19.772 L 8.129 19.831 L 8.076 19.89 L 8.076 19.949 L 8.023 20.008 L 8.023 20.186 L 7.97 20.245 L 7.97 20.6 L 8.023 20.66 L 8.023 20.837 L 8.076 20.896 L 8.076 20.956 L 8.129 21.015 L 8.129 21.074 L 8.448 21.429 L 8.501 21.429 L 8.554 21.488 L 8.607 21.488 L 8.66 21.548 L 8.82 21.548 L 8.873 21.607 L 9.298 21.607 L 9.351 21.548 L 9.457 21.548 L 9.51 21.488 L 9.564 21.488 L 9.617 21.429 L 9.67 21.429 L 10.042 21.015 L 10.042 20.956 L 10.095 20.896 L 10.095 20.778 L 10.148 20.719 L 10.148 20.186 L 10.095 20.127 L 10.095 19.949 L 10.042 19.89 L 10.042 19.831 L 9.935 19.712 L 9.935 19.653 L 9.723 19.416 L 9.67 19.416 L 9.617 19.357 L 9.564 19.357 L 9.51 19.298 L 9.404 19.298 L 9.351 19.239 L 9.192 19.239 L 9.139 19.18 Z M 18.436 19.239 L 18.383 19.298 L 18.277 19.298 L 18.224 19.357 L 18.171 19.357 L 18.118 19.416 L 18.065 19.416 L 17.852 19.653 L 17.852 19.712 L 17.746 19.831 L 17.746 19.89 L 17.693 19.949 L 17.693 20.008 L 17.639 20.068 L 17.639 20.719 L 17.693 20.778 L 17.693 20.896 L 17.746 20.956 L 17.746 21.015 L 18.118 21.429 L 18.171 21.429 L 18.224 21.488 L 18.277 21.488 L 18.33 21.548 L 18.436 21.548 L 18.49 21.607 L 18.915 21.607 L 18.968 21.548 L 19.074 21.548 L 19.127 21.488 L 19.18 21.488 L 19.233 21.429 L 19.287 21.429 L 19.393 21.311 L 19.446 21.311 L 19.446 21.252 L 19.499 21.192 L 19.552 21.192 L 19.552 21.133 L 19.712 20.956 L 19.712 20.837 L 19.765 20.778 L 19.765 20.719 L 19.818 20.66 L 19.818 20.186 L 19.765 20.127 L 19.765 20.008 L 19.712 19.949 L 19.712 19.89 L 19.658 19.831 L 19.658 19.772 L 19.34 19.416 L 19.287 19.416 L 19.18 19.298 L 19.074 19.298 L 19.021 19.239 Z"/></svg>`
    };

    /**
     * 通用工具函数
     * @module shared/utils
     */

    /**
     * 获取用户 ID (B站 DedeUserID cookie)
     * @returns {string|null} 用户ID，未登录返回 null
     */
    function getUserId() {
        const match = document.cookie.match(/DedeUserID=([^;]+)/);
        return match?.[1] || null;
    }

    /**
     * 获取当前视频的 BVID
     * @returns {string|null} BVID，非视频页返回 null
     */
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
     * 等待元素出现
     * @param {string} selector - CSS 选择器
     * @param {number} [ms] - 超时时间（毫秒），不传则无限等待
     * @returns {Promise<Element>} 找到的元素
     */
    function waitFor(selector, ms = undefined) {
        return new Promise((resolve, reject) => {
            const target = document.querySelector(selector);
            if (target) {
                resolve(target);
                return;
            }

            let timeoutId;
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve(element);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            if (ms) {
                timeoutId = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element not found: "${selector}" within ${ms}ms`));
                }, ms);
            }
        });
    }

    /**
     * 延迟等待
     * @param {number} ms - 等待时间（毫秒）
     * @returns {Promise<void>}
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 查找第一个匹配的元素
     * @param {string[]} selectors - 选择器数组
     * @returns {Element|null} 找到的元素
     */
    function findFirst(selectors) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
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
     * 显示弹幕发送确认对话框
     * @returns {Promise<{sendDanmaku: boolean, dontAskAgain: boolean}>}
     */
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

            // 悬停效果
            btnNo.addEventListener('mouseenter', () => btnNo.style.background = '#f4f5f7');
            btnNo.addEventListener('mouseleave', () => btnNo.style.background = 'white');
            btnYes.addEventListener('mouseenter', () => btnYes.style.background = '#00a1d6');
            btnYes.addEventListener('mouseleave', () => btnYes.style.background = '#00aeec');

            const cleanup = () => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            };

            const handleChoice = (sendDanmaku) => {
                const dontAsk = dialog.querySelector('#qmr-dont-ask').checked;
                cleanup();
                resolve({ sendDanmaku, dontAskAgain: dontAsk });
            };

            btnNo.addEventListener('click', () => handleChoice(false));
            btnYes.addEventListener('click', () => handleChoice(true));

            // ESC 键关闭（默认不发送）
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve({ sendDanmaku: false, dontAskAgain: false });
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * 弹幕发送功能
     * @module shared/danmaku
     */


    /**
     * 模拟发送弹幕
     * @param {string} text - 弹幕文本
     * @returns {Promise<boolean>} 是否发送成功
     */
    async function sendDanmaku(text) {
        console.log('[B站问号榜] 尝试发送弹幕:', text);

        // 1. 寻找弹幕输入框和发送按钮
        const dmInput = findFirst(SELECTORS.DANMAKU_INPUT);
        const dmSendBtn = findFirst(SELECTORS.DANMAKU_SEND_BTN);

        if (!dmInput || !dmSendBtn) {
            console.error('[B站问号榜] 未找到弹幕输入框或发送按钮');
            return false;
        }

        try {
            // 2. 聚焦输入框
            dmInput.focus();
            dmInput.click();

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
            dmInput.dispatchEvent(new Event('input', { bubbles: true }));
            dmInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 模拟中文输入法结束事件
            dmInput.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
            dmInput.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));

            // 5. 顺序尝试发送方案
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

            await wait(1000);

            if (dmInput.value !== text) {
                console.log('[B站问号榜] 方案1生效，发送成功');
                dmInput.blur();
                return true;
            }

            // --- 方案2: 点击发送按钮 ---
            console.log('[B站问号榜] 方案1未奏效，尝试方案2: 点击按钮');
            dmSendBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            dmSendBtn.click();
            dmSendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

            await wait(1000);

            if (dmInput.value !== text) {
                console.log('[B站问号榜] 方案2生效，发送成功');
                dmInput.blur();
                return true;
            }

            // --- 方案3: 强制点击 ---
            console.log('[B站问号榜] 方案2未奏效，尝试方案3: 强制点击');
            dmSendBtn.click();

            // 6. 清理
            setTimeout(() => {
                if (dmInput.value === text) {
                    console.warn('[B站问号榜] 所有方案尝试完毕，似乎仍未发送成功');
                }
                dmInput.blur();
            }, 200);

            return dmInput.value !== text;
        } catch (e) {
            console.error('[B站问号榜] 弹幕发送异常:', e);
            return false;
        }
    }

    /**
     * API 调用封装
     * @module shared/api
     */

    /**
     * 获取投票状态
     * @param {string} apiBase - API 基础地址
     * @param {string} bvid - 视频 BVID
     * @param {string|null} userId - 用户 ID
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<{active: boolean, count: number}>}
     */
    async function getVoteStatus(apiBase, bvid, userId, fetchImpl = fetch) {
        const url = `${apiBase}/status?bvid=${bvid}&userId=${userId || ''}&_t=${Date.now()}`;
        const response = await fetchImpl(url);
        return response.json();
    }

    /**
     * 执行投票/取消投票
     * @param {string} apiBase - API 基础地址
     * @param {'vote'|'unvote'} endpoint - 端点
     * @param {string} bvid - 视频 BVID
     * @param {string} userId - 用户 ID
     * @param {string|null} altchaSolution - CAPTCHA 解决方案
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<{success: boolean, requiresCaptcha?: boolean, error?: string}>}
     */
    async function doVote(apiBase, endpoint, bvid, userId, altchaSolution = null, fetchImpl = fetch) {
        const requestBody = { bvid, userId };
        if (altchaSolution) {
            requestBody.altcha = altchaSolution;
        }

        const response = await fetchImpl(`${apiBase}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        return response.json();
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
     * B站问号榜 - 浏览器扩展 Content Script
     */


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

})();
