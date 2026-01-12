// ==UserScript==
// @name         B站问号榜
// @namespace    https://github.com/bili-qml-team/bili-qml
// @version      1.2
// @description  在B站视频下方增加问号键，统计并展示抽象视频排行榜。油猴脚本版本。
// @author       bili-qml-team
// @homepage     https://github.com/bili-qml-team/bili-qml
// @match        *://*.bilibili.com/video/*
// @match        *://*.bilibili.com/list/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==

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
        API_ENDPOINT: 'apiEndpoint',
        THEME: 'theme',
        RANK1_SETTING: 'rank1Setting'
    };

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

    // 排行榜时间范围
    const LEADERBOARD_RANGES = ['realtime', 'daily', 'weekly', 'monthly'];

    // 排行榜时间范围显示名称
    const RANGE_LABELS = {
        realtime: '实时',
        daily: '日榜',
        weekly: '周榜',
        monthly: '月榜'
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
     * HTML 转义，防止 XSS
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的安全文本
     */
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
     * 获取排行榜数据
     * @param {string} apiBase - API 基础地址
     * @param {string} range - 时间范围 (realtime/daily/weekly/monthly)
     * @param {string|null} altchaSolution - CAPTCHA 解决方案
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<{success: boolean, list?: Array, requiresCaptcha?: boolean}>}
     */
    async function fetchLeaderboard(apiBase, range = 'realtime', altchaSolution = null, fetchImpl = fetch) {
        let url = `${apiBase}/leaderboard?range=${range}&type=2`;
        if (altchaSolution) {
            url += `&altcha=${encodeURIComponent(altchaSolution)}`;
        }
        const response = await fetchImpl(url);
        return response.json();
    }

    /**
     * 获取视频信息
     * @param {string} bvid - 视频 BVID
     * @param {Function} [fetchImpl=fetch] - fetch 实现
     * @returns {Promise<Object|null>}
     */
    async function fetchVideoInfo(bvid, fetchImpl = fetch) {
        try {
            const url = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
            const response = await fetchImpl(url);
            const json = await response.json();
            if (json && json.code === 0 && json.data) {
                return json.data;
            }
        } catch (e) {
            console.warn(`[B站问号榜] 获取视频信息失败: ${bvid}`, e);
        }
        return null;
    }

    /**
     * 排行榜渲染逻辑
     * @module shared/leaderboard
     */


    /**
     * 创建简化版排行榜列表项 HTML（用于弹窗面板）
     * @param {Object} item - 排行榜项目
     * @param {number} rank - 排名
     * @param {string} title - 视频标题
     * @param {boolean} rank1Custom - 是否使用自定义第一名显示
     * @returns {string} HTML 字符串
     */
    function createLeaderboardItemHTML(item, rank, title, rank1Custom = true) {
        let rankDisplay = rank;
        let rankClass = 'rank';

        if (rank === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankClass += ' rank-custom';
        }

        const safeTitle = escapeHtml(title);
        const safeBvid = escapeHtml(item.bvid);
        const safeCount = escapeHtml(String(item.count));

        return `
        <div class="item">
            <div class="${rankClass}">${rankDisplay}</div>
            <div class="info">
                <a href="https://www.bilibili.com/video/${safeBvid}" target="_blank" class="title" title="${safeTitle}">${safeTitle}</a>
                <div class="count">❓ 抽象指数: ${safeCount}</div>
            </div>
        </div>
    `;
    }

    /**
     * 创建视频卡片 HTML（用于独立排行榜页面）
     * @param {Object} item - 排行榜项目 {bvid, count}
     * @param {number} rank - 排名
     * @param {Object} details - 视频详情 {title, pic, ownerName, view, danmaku}
     * @param {boolean} rank1Custom - 是否使用自定义第一名显示
     * @returns {string} HTML 字符串
     */
    function createVideoCardHTML(item, rank, details, rank1Custom = true) {
        let rankDisplay = rank <= 3 ? rank : `#${rank}`;
        let rankClass = rank <= 3 ? `rank-${rank}` : '';

        if (rank === 1 && rank1Custom) {
            rankDisplay = '何一位';
            rankClass += ' rank-custom-text';
        }

        const safeTitle = escapeHtml(details.title || '未知标题');
        const picUrl = details.pic ? details.pic.replace('http:', 'https:') : '';
        const ownerName = escapeHtml(details.ownerName || '未知UP');
        const viewText = details.view != null ? formatCount(details.view) : '-';
        const danmakuText = details.danmaku != null ? formatCount(details.danmaku) : '-';

        return `
        <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="video-card">
            <div class="thumb-container">
                ${picUrl ? `<img src="${picUrl}" alt="${safeTitle}" class="thumb-img" loading="lazy" />` : ''}
                <span class="rank-badge ${rankClass}">${rankDisplay}</span>
                <div class="card-header-overlay">
                    <div class="score-tag">
                        <span class="qml-icon">❓</span> ${item.count}
                    </div>
                </div>
            </div>
            
            <div class="card-content">
                <h3 class="video-title" title="${safeTitle}">${safeTitle}</h3>
                
                <div class="video-info-row">
                    <div class="owner-info">
                        <span class="owner-icon">UP</span>
                        <span class="owner-name" title="${ownerName}">${ownerName}</span>
                    </div>
                </div>
                
                <div class="video-info-row" style="margin-top: 4px;">
                    <div class="stat-item" title="播放量">
                        <span>▶</span> ${viewText}
                    </div>
                    <div class="stat-item" title="弹幕数">
                        <span>💬</span> ${danmakuText}
                    </div>
                </div>
            </div>
        </a>
    `;
    }

    /**
     * 渲染简化版排行榜（用于弹窗面板）
     * @param {HTMLElement} container - 容器元素
     * @param {Array} list - 排行榜数据
     * @param {Object} options - 配置选项
     * @param {boolean} options.rank1Custom - 是否使用自定义第一名显示
     */
    async function renderSimpleLeaderboard(container, list, options = {}) {
        const { rank1Custom = true, fetchImpl = fetch } = options;

        container.innerHTML = '<div class="loading">加载中...</div>';

        try {
            const items = await Promise.all(list.map(async (item, index) => {
                let title = '加载中...';
                try {
                    const info = await fetchVideoInfo(item.bvid, fetchImpl);
                    if (info?.title) {
                        title = info.title;
                    }
                } catch (e) {
                    title = `Video ${item.bvid}`;
                }
                return createLeaderboardItemHTML(item, index + 1, title, rank1Custom);
            }));

            container.innerHTML = items.join('');
        } catch (e) {
            container.innerHTML = '<div class="loading">加载失败</div>';
        }
    }

    /**
     * 共享 CSS 样式
     * @module shared/styles
     */


    /**
     * 面板样式（统一为插件版样式）
     */
    const PANEL_STYLES = `
/* CSS 变量 */
#bili-qmr-panel {
    --primary-color: #00aeec;
    --primary-hover: #00a1d6;
    --bg-color: #f1f2f3;
    --card-bg: #ffffff;
    --text-main: #18191c;
    --text-secondary: #9499a0;
    --border-color: #e3e5e7;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 8px 16px rgba(0, 0, 0, 0.08);
    --radius-md: 12px;
    --font-stack: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 暗色模式 */
#bili-qmr-panel.dark-mode {
    --bg-color: #0f0f11;
    --card-bg: #1f2023;
    --text-main: #ffffff;
    --text-secondary: #a0a0a0;
    --border-color: #2f3035;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 8px 16px rgba(0, 0, 0, 0.4);
}

#bili-qmr-panel.dark-mode .qmr-header {
    background: rgba(31, 32, 35, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tabs {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tab-btn.active {
    background: #2a2b30;
    color: var(--primary-color);
}

#bili-qmr-panel.dark-mode .settings-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

#bili-qmr-panel.dark-mode .item:hover {
    border-color: rgba(0, 174, 236, 0.3);
}

#bili-qmr-panel.dark-mode .count {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .radio-item {
    background: #1f2023;
}

#bili-qmr-panel.dark-mode .radio-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .advanced-section,
#bili-qmr-panel.dark-mode .advanced-toggle {
    background: var(--card-bg);
    border-color: var(--border-color);
}

#bili-qmr-panel.dark-mode .endpoint-input {
    background: rgba(0, 0, 0, 0.2);
    border-color: var(--border-color);
    color: var(--text-main);
}

#bili-qmr-panel.dark-mode .reset-btn {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--border-color);
    color: var(--text-main);
}

#bili-qmr-panel.dark-mode .settings-footer {
    background: rgba(31, 32, 35, 0.9);
    border-top-color: rgba(255, 255, 255, 0.05);
}

/* 面板容器 */
#bili-qmr-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 360px;
    max-height: calc(100vh - 160px);
    background-color: var(--bg-color);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 100000;
    font-family: var(--font-stack);
    display: none;
    overflow: hidden;
    flex-direction: column;
    color: var(--text-main);
    animation: qmr-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

#bili-qmr-panel.show {
    display: flex;
}

@keyframes qmr-slideIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

#bili-qmr-panel.qmr-dragging,
#bili-qmr-panel.qmr-dragged {
    animation: none;
    transition: none;
}

/* Header */
#bili-qmr-panel .qmr-header {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
    user-select: none;
}

#bili-qmr-panel .qmr-header:active {
    cursor: grabbing;
}

#bili-qmr-panel .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

#bili-qmr-panel .qmr-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #00aeec 0%, #0077aa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

#bili-qmr-panel .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

#bili-qmr-panel .settings-btn {
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: none;
}

#bili-qmr-panel .settings-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    transform: rotate(90deg);
}

#bili-qmr-panel .qmr-close {
    cursor: pointer;
    font-size: 20px;
    color: var(--text-secondary);
    transition: all 0.2s;
    border: none;
    background: none;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

#bili-qmr-panel .qmr-close:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-main);
}

/* Tabs */
#bili-qmr-panel .tabs {
    display: flex;
    background: #f1f2f3;
    padding: 4px;
    margin: 0 16px;
    border-radius: 10px;
    gap: 4px;
}

#bili-qmr-panel .tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 6px 0;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.2s ease;
}

#bili-qmr-panel .tab-btn:hover {
    color: var(--text-main);
    background: rgba(0, 0, 0, 0.03);
}

#bili-qmr-panel .tab-btn.active {
    background: #fff;
    color: var(--primary-color);
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* Content */
#bili-qmr-panel .content-panel {
    padding: 16px;
    flex: 1;
    overflow-y: auto;
    max-height: 450px;
}

#bili-qmr-panel .content-panel::-webkit-scrollbar {
    width: 6px;
}

#bili-qmr-panel .content-panel::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 3px;
}

/* Item */
#bili-qmr-panel .item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--card-bg);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

#bili-qmr-panel .item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: rgba(0, 174, 236, 0.2);
}

#bili-qmr-panel .rank {
    font-size: 18px;
    font-weight: 800;
    color: #c0c4cc;
    width: 32px;
    font-style: italic;
    text-align: center;
}

#bili-qmr-panel .item:nth-child(1) .rank {
    color: #FF4D4F;
    text-shadow: 0 2px 4px rgba(255, 77, 79, 0.2);
}

#bili-qmr-panel .item:nth-child(2) .rank {
    color: #FF9500;
    text-shadow: 0 2px 4px rgba(255, 149, 0, 0.2);
}

#bili-qmr-panel .item:nth-child(3) .rank {
    color: #FFCC00;
    text-shadow: 0 2px 4px rgba(255, 204, 0, 0.2);
}

#bili-qmr-panel .rank.rank-custom {
    font-size: 18px;
    font-weight: 900;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 1px;
    transform: translateX(-2px);
}

#bili-qmr-panel .info {
    flex: 1;
    margin-left: 12px;
    overflow: hidden;
}

#bili-qmr-panel .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    text-decoration: none;
    margin-bottom: 4px;
    transition: color 0.2s;
}

#bili-qmr-panel .title:hover {
    color: var(--primary-color);
}

#bili-qmr-panel .count {
    font-size: 12px;
    color: var(--text-secondary);
    display: inline-block;
    background: #f6f7f8;
    padding: 2px 8px;
    border-radius: 4px;
}

#bili-qmr-panel .loading {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
    font-size: 14px;
}

/* Settings */
#bili-qmr-panel .settings-wrapper {
    display: none;
    flex-direction: column;
    max-height: 450px;
    flex: 1;
    padding-bottom: 70px;
}

#bili-qmr-panel .settings-wrapper.show {
    display: flex;
}

#bili-qmr-panel .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

#bili-qmr-panel .settings-section {
    background: var(--card-bg);
    border-radius: var(--radius-md);
    padding: 20px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 16px;
}

#bili-qmr-panel .settings-section h3 {
    font-size: 16px;
    color: var(--text-main);
    margin: 0 0 6px 0;
    font-weight: 600;
}

#bili-qmr-panel .settings-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
}

#bili-qmr-panel .radio-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#bili-qmr-panel .radio-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
    background: #fff;
}

#bili-qmr-panel .radio-item:hover {
    background-color: #fafafa;
    border-color: var(--primary-color);
}

#bili-qmr-panel .radio-item:has(input:checked) {
    background-color: rgba(0, 174, 236, 0.05);
    border-color: var(--primary-color);
}

#bili-qmr-panel .radio-item input[type="radio"] {
    margin: 0 12px 0 0;
    cursor: pointer;
    accent-color: var(--primary-color);
}

#bili-qmr-panel .radio-item span {
    font-size: 14px;
    color: var(--text-main);
}

/* Advanced Section */
#bili-qmr-panel .advanced-section {
    margin-top: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: #fff;
}

#bili-qmr-panel .advanced-toggle {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-main);
    user-select: none;
    list-style: none;
}

#bili-qmr-panel .advanced-toggle::-webkit-details-marker {
    display: none;
}

#bili-qmr-panel .advanced-toggle::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-right: 2px solid var(--text-secondary);
    border-bottom: 2px solid var(--text-secondary);
    transform: rotate(-45deg);
    margin-right: 12px;
    transition: transform 0.2s;
}

#bili-qmr-panel .advanced-section[open] .advanced-toggle::before {
    transform: rotate(45deg);
}

#bili-qmr-panel .endpoint-input-group {
    display: flex;
    gap: 10px;
    align-items: stretch;
}

#bili-qmr-panel .endpoint-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-main);
    outline: none;
    background: #fafafa;
}

#bili-qmr-panel .endpoint-input:focus {
    background: #fff;
    border-color: var(--primary-color);
}

#bili-qmr-panel .reset-btn {
    width: 40px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: #fff;
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Settings Footer */
#bili-qmr-panel .settings-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 16px;
    border-top: 1px solid var(--border-color);
}

#bili-qmr-panel .save-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #00aeec 0%, #009cd6 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}

#bili-qmr-panel .save-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 174, 236, 0.4);
}

#bili-qmr-panel .save-status {
    text-align: center;
    font-size: 13px;
    color: var(--primary-color);
    margin-top: 10px;
    opacity: 0;
    transition: opacity 0.3s;
}
`;

    /**
     * 独立排行榜页面的样式
     */
    const LEADERBOARD_PAGE_STYLES = `
:root {
    /* 默认浅色模式 */
    --bg-color: #f6f7f8;
    --card-bg: #ffffff;
    --card-border: rgba(0, 0, 0, 0.06);
    --card-hover-bg: #ffffff;
    --primary-color: #00aeec;
    --text-primary: #18191c;
    --text-secondary: #9499a0;
    --accent-glow: rgba(0, 174, 236, 0.15);
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

    --scroll-track: #f6f7f8;
    --scroll-thumb: #c1c1c1;
    --scroll-thumb-hover: #a8a8a8;

    --rank-badge-color: rgba(0, 0, 0, 0.05);
    --rank-badge-hover: rgba(0, 174, 236, 0.1);

    --mesh-color-1: rgba(0, 174, 236, 0.05);
    --mesh-color-2: rgba(255, 102, 153, 0.04);

    --tab-container-bg: rgba(0, 0, 0, 0.04);
    --tab-hover-bg: rgba(0, 0, 0, 0.05);
}

/* 黑暗模式 */
body.dark-mode {
    --bg-color: #0f0f11;
    --card-bg: rgba(255, 255, 255, 0.03);
    --card-border: rgba(255, 255, 255, 0.08);
    --card-hover-bg: rgba(255, 255, 255, 0.06);
    --primary-color: #00aeec;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --accent-glow: rgba(0, 174, 236, 0.3);

    --scroll-track: #0f0f11;
    --scroll-thumb: #333;
    --scroll-thumb-hover: #555;

    --rank-badge-color: rgba(255, 255, 255, 0.1);
    --rank-badge-hover: rgba(0, 174, 236, 0.15);

    --mesh-color-1: rgba(0, 174, 236, 0.08);
    --mesh-color-2: rgba(255, 102, 153, 0.06);

    --tab-container-bg: rgba(255, 255, 255, 0.05);
    --tab-hover-bg: rgba(255, 255, 255, 0.05);
}

/* 切换按钮 */
.theme-toggle-btn {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 20px;
}

.theme-toggle-btn:hover {
    background: var(--tab-hover-bg);
}

body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: var(--font-family);
    min-height: 100vh;
    overflow-x: hidden;
}

/* 背景网格 */
.background-mesh {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    background:
        radial-gradient(circle at 10% 20%, var(--mesh-color-1) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, var(--mesh-color-2) 0%, transparent 40%);
    pointer-events: none;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
}

/* Header */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 60px;
    flex-wrap: wrap;
    gap: 20px;
}

.logo-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.logo-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    animation: float 3s ease-in-out infinite;
}

.logo-section h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
}

.highlight {
    background: linear-gradient(135deg, #00aeec 0%, #ff6699 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0.9;
}

/* 选项卡 */
.time-range-tabs {
    display: flex;
    background: var(--tab-container-bg);
    padding: 4px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid var(--card-border);
}

.tab-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 10px 24px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s ease;
    font-family: var(--font-family);
}

.tab-btn:hover {
    color: var(--text-primary);
    background: var(--tab-hover-bg);
}

.tab-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}

/* 网格布局 */
.leaderboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    perspective: 1000px;
}

/* 卡片 */
.video-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-decoration: none;
    color: var(--text-primary);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(20px);
    cursor: pointer;
}

.video-card:hover {
    transform: translateY(-5px) scale(1.02);
    background: var(--card-hover-bg);
    border-color: rgba(0, 174, 236, 0.3);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
}

.video-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #00aeec, #ff6699);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.video-card:hover::before {
    opacity: 1;
}


.video-card {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.thumb-container {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    overflow: hidden;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.2);
}

.thumb-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.video-card:hover .thumb-img {
    transform: scale(1.05);
}

.card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow: hidden; /* 防止内容移除 */
}

.card-header-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    z-index: 2;
}

.score-tag {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.qml-icon {
    color: #4facfe;
}

.rank-badge {
    position: absolute;
    top: 4px;
    left: 8px;
    right: auto;
    font-size: 2.5rem;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 3;
    font-style: italic;
    font-family: 'Impact', sans-serif;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
}


.rank-1,
.rank-2,
.rank-3 {
    font-size: 1.8rem;
    font-style: normal;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    color: #fff;
    background-size: cover;
    background-position: center;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.4);
}

.rank-1 {
    background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%);
    /* Gold */
    font-size: 2rem;
}

.rank-2 {
    background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
    /* Silver */
}

.rank-3 {
    background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
    /* Bronze */
}

.rank-badge.rank-custom-text {
    font-size: 1rem;
    line-height: 1.1;
    letter-spacing: -1px;
    color: #FF4D4F;
    /* Red color for custom text */
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
    /* Lighter shadow for contrast against gold */
}

.rank-1::after {
    content: '👑';
    position: absolute;
    top: -16px;
    left: 30%;
    transform: translateX(-50%) rotate(-15deg);
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.video-title {
    font-size: 1rem;
    line-height: 1.4;
    margin-bottom: 4px;
    font-weight: 500;
}

.video-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: auto;
}

.owner-info {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
}

.owner-icon {
    font-size: 0.8rem;
    opacity: 0.8;
}

.owner-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 100px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.video-card:hover .video-title {
    color: var(--primary-color);
}


/* Loading & Animation */
.loading-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--text-secondary);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-5px);
    }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--scroll-track);
}

::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--scroll-thumb-hover);
}

/* Responsive */
@media (max-width: 768px) {
    header {
        flex-direction: column;
        align-items: flex-start;
    }

    .time-range-tabs {
        width: 100%;
        overflow-x: auto;
    }

    .tab-btn {
        flex: 1;
        white-space: nowrap;
    }
}
`;

    /**
     * B站问号榜 - 油猴脚本入口
     * 此文件通过 Rollup 打包，将共享模块内联到最终的 bili-qml.user.js
     */


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


    // ==================== 弹幕偏好功能 ====================

    function getDanmakuPreference() {
        return GM_getValue(STORAGE_KEYS.DANMAKU_PREF, null);
    }

    function setDanmakuPreference(preference) {
        GM_setValue(STORAGE_KEYS.DANMAKU_PREF, preference);
    }

    // ==================== 问号按钮逻辑 ====================

    let isInjecting = false;
    let isSyncing = false;
    let currentBvid = '';
    let lastSyncedUserId = null;

    // 同步按钮状态
    async function syncButtonState() {
        const qBtn = document.getElementById(QUESTION_BTN.ID);
        const qBtnInner = document.getElementById(QUESTION_BTN.INNER_ID);
        if (!qBtn || !qBtnInner || isSyncing) return;

        const bvid = getBvid();
        if (!bvid) return;

        try {
            isSyncing = true;
            const userId = getUserId();
            const statusData = await getVoteStatus(API_BASE, bvid, userId, gmFetch);

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

    // 注入问号按钮
    async function injectQuestionButton() {
        try {
            const bvid = getBvid();
            if (!bvid) return;

            const toolbarLeft = document.querySelector(SELECTORS.TOOLBAR_LEFT);
            const shareBtn = findFirst(SELECTORS.SHARE_BTN);

            if (!toolbarLeft || !shareBtn) return;

            let qBtn = document.getElementById(QUESTION_BTN.ID);

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

    // ==================== 核心注入逻辑 ====================

    async function tryInject() {
        const bvid = getBvid();
        if (!bvid) return;

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

    // ==================== 初始化 ====================

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
            if (getBvid() && !document.getElementById(QUESTION_BTN.ID)) {
                if (document.querySelector(SELECTORS.TOOLBAR_LEFT)) {
                    tryInject();
                }
            }
        }
    }, 1000);

    // 注册油猴菜单命令
    GM_registerMenuCommand('📊 打开问号榜', toggleLeaderboardPanel);

})();
