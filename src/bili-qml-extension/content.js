// content.js

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

// ==================== 弹幕偏好功能 ====================


// 获取弹幕发送偏好
// 返回: null (未设置), true (总是发送), false (总是不发送)
/**
 * 获取弹幕偏好设置的异步函数
 * 该函数会从浏览器存储中读取弹幕相关的配置信息
 * @returns {Promise} 返回一个Promise对象，解析后得到弹幕偏好设置
 */
async function getDanmakuPreference() {
    // 创建一个新的Promise对象，用于异步获取弹幕偏好设置
    return new Promise((resolve) => {
        // 从浏览器同步存储中获取指定键的值
        // STORAGE_KEY_DANMAKU_PREF 是存储弹幕偏好设置的键名
        browserStorage.sync.get([STORAGE_KEY_DANMAKU_PREF], (result) => {
            // 检查结果中是否包含该键的值
            // 如果存在则返回该值，否则返回null
            resolve(result[STORAGE_KEY_DANMAKU_PREF] !== undefined ? result[STORAGE_KEY_DANMAKU_PREF] : null);
        });
    });
}

// 设置弹幕发送偏好
async function setDanmakuPreference(preference) {
    return new Promise((resolve) => {
        browserStorage.sync.set({ [STORAGE_KEY_DANMAKU_PREF]: preference }, () => {
            resolve();
        });
    });
}

// 显示弹幕发送确认对话框
function showDanmakuConfirmDialog() {
    return new Promise((resolve) => {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex; align-items: center; justify-content: center;
        `;

        // 创建对话框
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

        // 按钮悬停效果
        const btnNo = dialog.querySelector('#qmr-btn-no');
        const btnYes = dialog.querySelector('#qmr-btn-yes');

        btnNo.addEventListener('mouseenter', () => {
            btnNo.style.background = 'var(--bg3)';
        });
        btnNo.addEventListener('mouseleave', () => {
            btnNo.style.background = 'var(--bg1_float)';
        });

        btnYes.addEventListener('mouseenter', () => {
            btnYes.style.background = '#00a1d6';
        });
        btnYes.addEventListener('mouseleave', () => {
            btnYes.style.background = '#00aeec';
        });

        // 处理选择
        const handleChoice = (sendDanmaku) => {
            const dontAsk = dialog.querySelector('#qmr-dont-ask').checked;
            overlay.remove();
            resolve({ sendDanmaku, dontAskAgain: dontAsk });
        };

        btnNo.addEventListener('click', () => handleChoice(false));
        btnYes.addEventListener('click', () => handleChoice(true));

        // ESC 键关闭
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

// 注入 B 站风格的 CSS
// const style = document.createElement('style');
// style.innerHTML = `
//     /* 问号键样式 */
//     #bili-qmr-btn {
//         position: absolute;
//         display: flex;
//         align-items: center;
//         width: 92px;
//         height: 28px;
//         white-space: nowrap;
//         font-size: 13px;
//         color: #61666d;
//         font-weight: 500;
//         cursor: pointer;
//         user-select: none;
//         transition: color .3s, opacity .3s;
//         z-index: 10;
//         pointer-events: auto;
//         /* 默认定位：先放在一个安全的位置，后续靠 JS 微调 */
//         right: -100px; 
//         top: 0;
//     }
//     #bili-qmr-btn .qmr-icon-wrap {
//         display: flex;
//         align-items: center;
//         width: 100%;
//         height: 100%;
//         transition: color .3s;
//     }
//     #bili-qmr-btn .qmr-icon-img {
//         width: 20px;
//         height: 20px;
//         margin-right: 6px;
//         transition: transform 0.3s, filter 0.3s;
//         display: block;
//         object-fit: contain;
//     }
//     /* 未点亮且未悬停时：灰色 */
//     #bili-qmr-btn:not(.voted) .qmr-icon-img {
//         filter: grayscale(1) opacity(0.6);
//     }
//     /* 悬停或已点亮时：变蓝色 */
//     /* 技巧：通过 drop-shadow 创建一个偏移的蓝色投影，并隐藏原图 */
//     #bili-qmr-btn:hover .qmr-icon-img,
//     #bili-qmr-btn.voted .qmr-icon-img {
//         filter: drop-shadow(0 0 0 #00aeec);
//     }
//     #bili-qmr-btn .qmr-text {
//         overflow: hidden;
//         text-overflow: ellipsis;
//         word-break: break-word;
//         white-space: nowrap;
//     }
//     /* 悬停与点亮状态 */
//     #bili-qmr-btn:hover, #bili-qmr-btn.voted {
//         color: #00aeec !important; /* 对应 var(--brand_blue) */
//     }
//     #bili-qmr-btn:hover .qmr-icon-img {
//         transform: scale(0.85);
//     }
//     #bili-qmr-btn:active .qmr-icon-img {
//         transform: scale(0.7);
//     }
//     /* 大屏适配 (min-width: 1681px) */
//     @media (min-width: 1681px) {
//         #bili-qmr-btn {
//             width: 100px;
//             font-size: 14px;
//         }
//         #bili-qmr-btn .qmr-icon-img {
//             width: 24px;
//             height: 24px;
//         }
//     }
// `;
// document.head.appendChild(style);

// 获取用户 ID (直接绑定 B 站 DedeUserID)
function getUserId() {
    const match = document.cookie.match(/DedeUserID=([^;]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return null; // 未登录返回 null
}

// 获取当前视频的 BVID
function getBvid() {
    // 1. 从 URL 路径获取
    const pathParts = window.location.pathname.split('/');
    const bvidFromPath = pathParts.find(p => p.startsWith('BV'));
    if (bvidFromPath) return bvidFromPath;

    // 2. 从 URL 参数获取 (有些特殊页面)
    const urlParams = new URLSearchParams(window.location.search);
    const bvidFromParam = urlParams.get('bvid');
    if (bvidFromParam) return bvidFromParam;

    // 3. 从 B站原生变量获取 (最准确)
    const bvidFromWindow = window.__INITIAL_STATE__?.bvid || window.p_bvid;
    if (bvidFromWindow) return bvidFromWindow;

    return null;
}

let isInjecting = false;
let isSyncing = false; // 新增：正在同步状态的锁
let currentBvid = ''; // 记录当前页面正在处理的 BVID
let lastSyncedUserId = null;

// 同步按钮状态（亮或灭）及计数
async function syncButtonState() {
    const qBtn = document.getElementById('bili-qmr-btn');
    const qBtnInner = document.getElementById('bili-qmr-btn-inner');
    if (!qBtn || !qBtnInner || isSyncing) return;

    const bvid = getBvid();
    if (!bvid) return;

    try {
        isSyncing = true;
        const userId = getUserId();
        // 增加 _t 参数防止浏览器缓存 GET 请求
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

// 格式化数字显示（参考B站风格，如 1.2w）
function formatCount(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
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

async function injectQuestionButton() {
    try {
        const bvid = getBvid();
        if (!bvid) return;

        // 排除私密视频
        if (document.querySelector('.rec-list').children.length == 0) return;

        // 1. 寻找工具栏左侧容器作为真正的父壳子
        const toolbarLeft = document.querySelector('.video-toolbar-left-main');
        const shareBtn = document.querySelector('.video-toolbar-left-item.share') ||
            document.querySelector('.video-share') ||
            document.querySelector('.share-info');

        if (!toolbarLeft || !shareBtn) return;

        let qBtn = document.getElementById('bili-qmr-btn');

        // 2. 如果按钮不存在，创建并挂载
        if (!qBtn) {
            if (isInjecting) return;
            isInjecting = true;

            qBtn = document.createElement('div');
            qBtn.id = 'bili-qmr-btn';
            qBtn.className = 'toolbar-left-item-wrap';
            const qBtnInner = document.createElement('div');
            qBtnInner.id = 'bili-qmr-btn-inner';
            qBtnInner.className = 'qmr-icon-wrap video-toolbar-left-item';
            qBtnInner.innerHTML = `<svg version="1.1" id="Layer_1" class="video-share-icon video-toolbar-item-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="20" viewBox="0 0 28 28" preserveAspectRatio="xMidYMid meet"> <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M 5.419 0.414 L 4.888 1.302 L 4.888 2.782 L 5.366 3.611 L 6.588 4.736 L 3.825 4.795 L 2.444 5.209 L 0.85 6.63 L 0 8.584 L 0 23.915 L 0.584 25.632 L 1.275 26.638 L 3.241 27.941 L 24.706 27.941 L 26.353 26.934 L 27.362 25.573 L 27.841 24.152 L 27.841 8.939 L 27.097 6.985 L 25.662 5.505 L 24.175 4.913 L 21.252 4.795 L 22.953 2.723 L 23.006 1.776 L 22.634 0.888 L 21.731 0.118 L 20.615 0 L 19.605 0.651 L 15.408 4.795 L 12.486 4.854 L 7.598 0.178 L 6.004 0 Z M 4.038 9.649 L 4.569 9.057 L 5.154 8.761 L 22.421 8.761 L 23.271 9.057 L 23.962 9.708 L 24.281 10.478 L 24.228 21.666 L 24.015 22.85 L 23.431 23.619 L 22.687 24.034 L 5.419 24.034 L 4.782 23.738 L 4.091 23.027 L 3.772 22.199 L 3.772 10.241 Z M 8.288 11.188 L 7.651 11.425 L 7.173 11.721 L 6.641 12.254 L 6.216 12.964 L 6.163 13.26 L 6.057 13.438 L 6.057 13.793 L 5.951 14.266 L 6.163 14.503 L 7.81 14.503 L 7.917 14.266 L 7.917 13.911 L 8.076 13.497 L 8.554 12.964 L 8.82 12.846 L 9.404 12.846 L 9.723 12.964 L 10.042 13.201 L 10.201 13.438 L 10.361 13.911 L 10.307 14.503 L 9.935 15.095 L 8.979 15.865 L 8.501 16.457 L 8.235 17.108 L 8.182 17.7 L 8.129 17.759 L 8.129 18.351 L 8.235 18.469 L 9.935 18.469 L 9.935 17.937 L 10.201 17.285 L 10.679 16.753 L 11.211 16.338 L 11.795 15.687 L 12.167 15.036 L 12.326 14.148 L 12.22 13.142 L 11.848 12.372 L 11.423 11.899 L 10.732 11.425 L 10.042 11.188 L 9.564 11.188 L 9.51 11.129 Z M 17.958 11.188 L 17.002 11.603 L 16.63 11.899 L 16.205 12.372 L 15.833 13.082 L 15.674 13.615 L 15.62 14.326 L 15.727 14.444 L 15.992 14.503 L 17.427 14.503 L 17.533 14.385 L 17.586 13.793 L 17.746 13.438 L 18.118 13.023 L 18.49 12.846 L 19.074 12.846 L 19.605 13.142 L 19.871 13.497 L 19.977 13.793 L 19.977 14.385 L 19.871 14.681 L 19.446 15.214 L 18.702 15.805 L 18.224 16.338 L 17.905 17.049 L 17.852 17.641 L 17.799 17.7 L 17.799 18.41 L 17.852 18.469 L 19.552 18.469 L 19.605 18.41 L 19.605 17.877 L 19.712 17.522 L 19.924 17.167 L 20.296 16.753 L 21.093 16.101 L 21.465 15.687 L 21.784 15.095 L 21.996 14.148 L 21.89 13.201 L 21.677 12.668 L 21.412 12.254 L 21.093 11.899 L 20.243 11.366 L 19.712 11.188 L 19.233 11.188 L 19.18 11.129 Z M 9.032 19.18 L 8.979 19.239 L 8.767 19.239 L 8.713 19.298 L 8.66 19.298 L 8.607 19.357 L 8.501 19.357 L 8.129 19.772 L 8.129 19.831 L 8.076 19.89 L 8.076 19.949 L 8.023 20.008 L 8.023 20.186 L 7.97 20.245 L 7.97 20.6 L 8.023 20.66 L 8.023 20.837 L 8.076 20.896 L 8.076 20.956 L 8.129 21.015 L 8.129 21.074 L 8.448 21.429 L 8.501 21.429 L 8.554 21.488 L 8.607 21.488 L 8.66 21.548 L 8.82 21.548 L 8.873 21.607 L 9.298 21.607 L 9.351 21.548 L 9.457 21.548 L 9.51 21.488 L 9.564 21.488 L 9.617 21.429 L 9.67 21.429 L 10.042 21.015 L 10.042 20.956 L 10.095 20.896 L 10.095 20.778 L 10.148 20.719 L 10.148 20.186 L 10.095 20.127 L 10.095 19.949 L 10.042 19.89 L 10.042 19.831 L 9.935 19.712 L 9.935 19.653 L 9.723 19.416 L 9.67 19.416 L 9.617 19.357 L 9.564 19.357 L 9.51 19.298 L 9.404 19.298 L 9.351 19.239 L 9.192 19.239 L 9.139 19.18 Z M 18.436 19.239 L 18.383 19.298 L 18.277 19.298 L 18.224 19.357 L 18.171 19.357 L 18.118 19.416 L 18.065 19.416 L 17.852 19.653 L 17.852 19.712 L 17.746 19.831 L 17.746 19.89 L 17.693 19.949 L 17.693 20.008 L 17.639 20.068 L 17.639 20.719 L 17.693 20.778 L 17.693 20.896 L 17.746 20.956 L 17.746 21.015 L 18.118 21.429 L 18.171 21.429 L 18.224 21.488 L 18.277 21.488 L 18.33 21.548 L 18.436 21.548 L 18.49 21.607 L 18.915 21.607 L 18.968 21.548 L 19.074 21.548 L 19.127 21.488 L 19.18 21.488 L 19.233 21.429 L 19.287 21.429 L 19.393 21.311 L 19.446 21.311 L 19.446 21.252 L 19.499 21.192 L 19.552 21.192 L 19.552 21.133 L 19.712 20.956 L 19.712 20.837 L 19.765 20.778 L 19.765 20.719 L 19.818 20.66 L 19.818 20.186 L 19.765 20.127 L 19.765 20.008 L 19.712 19.949 L 19.712 19.89 L 19.658 19.831 L 19.658 19.772 L 19.34 19.416 L 19.287 19.416 L 19.18 19.298 L 19.074 19.298 L 19.021 19.239 Z"/></svg><span class="qmr-text">...</span>`;
            qBtn.appendChild(qBtnInner);

            // 关键：挂载到 toolbarLeft，确保它和分享按钮是“远房亲戚”，互不干扰悬停
            toolbarLeft.style.position = 'relative'; // 确保父容器有定位基准
            toolbarLeft.appendChild(qBtn);

            // // 定位同步函数
            // const syncPos = () => {
            //     if (!qBtn || !shareBtn || !toolbarLeft) return;
            //     const sRect = shareBtn.getBoundingClientRect();
            //     const pRect = toolbarLeft.getBoundingClientRect();
            //     // 计算相对于 toolbarLeft 的偏移量
            //     qBtn.style.left = (sRect.right - pRect.left + 12) + 'px';
            //     qBtn.style.top = (sRect.top - pRect.top + (sRect.height - 28) / 2) + 'px';
            // };

            // // 立即同步并开启监听
            // syncPos();
            // const posTimer = setInterval(syncPos, 500); // 较低频率的兜底同步
            // window.addEventListener('resize', syncPos);
            // document.addEventListener('fullscreenchange', () => setTimeout(syncPos, 200));

            // 拦截悬停事件，双重保险
            // ['mouseenter', 'mouseover'].forEach(type => {
            //     qBtn.addEventListener(type, (e) => e.stopPropagation());
            // });

            qBtn.onclick = async (e) => {
                e.preventDefault();
                // e.stopPropagation(); // 依然保留，防止点击事件向上冒泡干扰 B 站

                // 只有登录用户才能投票
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
                const doVote = async (altchaSolution = null) => {
                    const endpoint = isVoting ? "vote" : "unvote";
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
                        console.log('[B站问号榜] 投票成功, isVoting:', isVoting);
                        // 只有当点亮（isVoting 为 true）时才发弹幕
                        if (isVoting) {
                            console.log('[B站问号榜] 获取弹幕偏好...');
                            const preference = await getDanmakuPreference();
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
                                    await setDanmakuPreference(choice.sendDanmaku);
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

            isInjecting = false;
        }

        // 3. 状态同步检查
        await syncButtonState();
    } catch (e) {
        isInjecting = false;
    }
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
// Main Entry Point
initApiBase().then(async () => {
    // 初始加载：等待 Vue 加载时须:搜索框应该是最后进行load
    function insertPromise(selector) {
        return new Promise((resolve) => {
            waitFor(selector).then((ele) => {
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
});
