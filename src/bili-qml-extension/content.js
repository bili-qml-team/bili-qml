// content.js
const API_BASE = 'https://www.bili-qml.top/api';

// 动态加载 Altcha Widget
let altchaLoaded = false;
function loadAltchaWidget() {
    return new Promise((resolve) => {
        if (altchaLoaded || document.querySelector('script[src*="altcha"]')) {
            altchaLoaded = true;
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/altcha@latest/dist/altcha.min.js';
        script.type = 'module';
        script.async = true;
        script.onload = () => {
            altchaLoaded = true;
            resolve();
        };
        document.head.appendChild(script);
    });
}

// 注入 Altcha 弹窗样式
function injectAltchaStyles() {
    if (document.getElementById('altcha-styles')) return;
    const style = document.createElement('style');
    style.id = 'altcha-styles';
    style.textContent = `
        #altcha-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: altcha-fade-in 0.2s ease-out;
        }
        @keyframes altcha-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .altcha-modal {
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            min-width: 320px;
            max-width: 90vw;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: altcha-slide-up 0.3s ease-out;
        }
        @keyframes altcha-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .altcha-header {
            font-size: 18px;
            font-weight: 600;
            color: #18191c;
            margin-bottom: 16px;
            text-align: center;
        }
        .altcha-content p {
            color: #61666d;
            margin-bottom: 16px;
            text-align: center;
            font-size: 14px;
        }
        .altcha-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 24px;
            height: 24px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 18px;
            color: #999;
        }
        .altcha-close:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);
}

// 显示 Altcha 验证弹窗
async function showAltchaChallenge() {
    await loadAltchaWidget();
    injectAltchaStyles();

    return new Promise((resolve, reject) => {
        const overlay = document.createElement('div');
        overlay.id = 'altcha-overlay';
        overlay.innerHTML = `
            <div class="altcha-modal" style="position: relative;">
                <button class="altcha-close" title="关闭">×</button>
                <div class="altcha-header">🤖 人机验证</div>
                <div class="altcha-content">
                    <p>检测到频繁操作，请完成验证后继续</p>
                    <altcha-widget 
                        challengeurl="${API_BASE}/altcha/challenge"
                        hidelogo
                        hidefooter
                    ></altcha-widget>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 监听验证完成事件
        const widget = overlay.querySelector('altcha-widget');
        widget.addEventListener('verified', (e) => {
            const payload = e.detail.payload;
            overlay.remove();
            resolve(payload);
        });

        // 关闭按钮
        overlay.querySelector('.altcha-close').addEventListener('click', () => {
            overlay.remove();
            reject(new Error('用户取消验证'));
        });

        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                reject(new Error('用户取消验证'));
            }
        });
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
    if (!qBtn) return;

    const bvid = getBvid();
    if (!bvid) return;

    if (isSyncing) return;

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
        } else {
            qBtn.classList.remove('voted');
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
function sendDanmaku(text) {
    // 1. 寻找弹幕输入框和发送按钮
    const showNotice = (msg, isError = false) => {
        if (!isError) return; // 正常情况下不显示提示
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            padding: 10px 20px; border-radius: 4px; z-index: 100000;
            background: #ff4d4f; color: white;
            font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: opacity 0.5s;
        `;
        notice.innerText = `[问号榜提示] ${msg}`;
        document.body.appendChild(notice);
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => notice.remove(), 500);
        }, 3000);
    };

    try {
        const dmInput = document.querySelector('input.bpx-player-dm-input');
        const dmSendBtn = document.querySelector('.bpx-player-dm-btn-send');
        if (!dmInput || !dmSendBtn) return;

        // 1. 填入内容并让 React 感知
        dmInput.focus();
        document.execCommand('insertText', false, text);
        dmInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 2. 增加一个适中的延时（150ms），避开 B 站的频率检测和 React 渲染冲突
        setTimeout(() => {
            // 3. 模拟按键和点击
            const events = ['keydown', 'keyup']; // 移除冗余的 keypress
            events.forEach(type => {
                dmInput.dispatchEvent(new KeyboardEvent(type, {
                    bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
                }));
            });

            dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            dmSendBtn.click();

            // 4. 发送后稍微等一下再失焦，确保 B 站逻辑执行完
            setTimeout(() => {
                dmInput.blur();
                // 如果还有残留，最后补一刀
                if (dmInput.value !== '') {
                    dmSendBtn.click();
                }
            }, 100);
        }, 150);

    } catch (e) {
        console.error('[B站问号榜] 弹幕瞬发失败:', e);
    }
}

async function injectQuestionButton() {
    try {
        const bvid = getBvid();
        if (!bvid) return;

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
            qBtnInner = document.createElement('div');
            qBtnInner.id = 'bili-qmr-btn-inner';
            qBtnInner.className = 'qmr-icon-wrap video-toolbar-left-item';
            qBtnInner.innerHTML = `<svg version="1.1" id="Layer_1" class="video-share-icon video-toolbar-item-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="20" viewBox="0 0 28 28" preserveAspectRatio="xMidYMid meet"> <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M 5.419 0.414 L 4.888 1.302 L 4.888 2.782 L 5.366 3.611 L 6.588 4.736 L 3.825 4.795 L 2.444 5.209 L 0.85 6.63 L 0 8.584 L 0 23.915 L 0.584 25.632 L 1.275 26.638 L 3.241 27.941 L 24.706 27.941 L 26.353 26.934 L 27.362 25.573 L 27.841 24.152 L 27.841 8.939 L 27.097 6.985 L 25.662 5.505 L 24.175 4.913 L 21.252 4.795 L 22.953 2.723 L 23.006 1.776 L 22.634 0.888 L 21.731 0.118 L 20.615 0 L 19.605 0.651 L 15.408 4.795 L 12.486 4.854 L 7.598 0.178 L 6.004 0 Z M 4.038 9.649 L 4.569 9.057 L 5.154 8.761 L 22.421 8.761 L 23.271 9.057 L 23.962 9.708 L 24.281 10.478 L 24.228 21.666 L 24.015 22.85 L 23.431 23.619 L 22.687 24.034 L 5.419 24.034 L 4.782 23.738 L 4.091 23.027 L 3.772 22.199 L 3.772 10.241 Z M 8.288 11.188 L 7.651 11.425 L 7.173 11.721 L 6.641 12.254 L 6.216 12.964 L 6.163 13.26 L 6.057 13.438 L 6.057 13.793 L 5.951 14.266 L 6.163 14.503 L 7.81 14.503 L 7.917 14.266 L 7.917 13.911 L 8.076 13.497 L 8.554 12.964 L 8.82 12.846 L 9.404 12.846 L 9.723 12.964 L 10.042 13.201 L 10.201 13.438 L 10.361 13.911 L 10.307 14.503 L 9.935 15.095 L 8.979 15.865 L 8.501 16.457 L 8.235 17.108 L 8.182 17.7 L 8.129 17.759 L 8.129 18.351 L 8.235 18.469 L 9.935 18.469 L 9.935 17.937 L 10.201 17.285 L 10.679 16.753 L 11.211 16.338 L 11.795 15.687 L 12.167 15.036 L 12.326 14.148 L 12.22 13.142 L 11.848 12.372 L 11.423 11.899 L 10.732 11.425 L 10.042 11.188 L 9.564 11.188 L 9.51 11.129 Z M 17.958 11.188 L 17.002 11.603 L 16.63 11.899 L 16.205 12.372 L 15.833 13.082 L 15.674 13.615 L 15.62 14.326 L 15.727 14.444 L 15.992 14.503 L 17.427 14.503 L 17.533 14.385 L 17.586 13.793 L 17.746 13.438 L 18.118 13.023 L 18.49 12.846 L 19.074 12.846 L 19.605 13.142 L 19.871 13.497 L 19.977 13.793 L 19.977 14.385 L 19.871 14.681 L 19.446 15.214 L 18.702 15.805 L 18.224 16.338 L 17.905 17.049 L 17.852 17.641 L 17.799 17.7 L 17.799 18.41 L 17.852 18.469 L 19.552 18.469 L 19.605 18.41 L 19.605 17.877 L 19.712 17.522 L 19.924 17.167 L 20.296 16.753 L 21.093 16.101 L 21.465 15.687 L 21.784 15.095 L 21.996 14.148 L 21.89 13.201 L 21.677 12.668 L 21.412 12.254 L 21.093 11.899 L 20.243 11.366 L 19.712 11.188 L 19.233 11.188 L 19.18 11.129 Z M 9.032 19.18 L 8.979 19.239 L 8.767 19.239 L 8.713 19.298 L 8.66 19.298 L 8.607 19.357 L 8.501 19.357 L 8.129 19.772 L 8.129 19.831 L 8.076 19.89 L 8.076 19.949 L 8.023 20.008 L 8.023 20.186 L 7.97 20.245 L 7.97 20.6 L 8.023 20.66 L 8.023 20.837 L 8.076 20.896 L 8.076 20.956 L 8.129 21.015 L 8.129 21.074 L 8.448 21.429 L 8.501 21.429 L 8.554 21.488 L 8.607 21.488 L 8.66 21.548 L 8.82 21.548 L 8.873 21.607 L 9.298 21.607 L 9.351 21.548 L 9.457 21.548 L 9.51 21.488 L 9.564 21.488 L 9.617 21.429 L 9.67 21.429 L 10.042 21.015 L 10.042 20.956 L 10.095 20.896 L 10.095 20.778 L 10.148 20.719 L 10.148 20.186 L 10.095 20.127 L 10.095 19.949 L 10.042 19.89 L 10.042 19.831 L 9.935 19.712 L 9.935 19.653 L 9.723 19.416 L 9.67 19.416 L 9.617 19.357 L 9.564 19.357 L 9.51 19.298 L 9.404 19.298 L 9.351 19.239 L 9.192 19.239 L 9.139 19.18 Z M 18.436 19.239 L 18.383 19.298 L 18.277 19.298 L 18.224 19.357 L 18.171 19.357 L 18.118 19.416 L 18.065 19.416 L 17.852 19.653 L 17.852 19.712 L 17.746 19.831 L 17.746 19.89 L 17.693 19.949 L 17.693 20.008 L 17.639 20.068 L 17.639 20.719 L 17.693 20.778 L 17.693 20.896 L 17.746 20.956 L 17.746 21.015 L 18.118 21.429 L 18.171 21.429 L 18.224 21.488 L 18.277 21.488 L 18.33 21.548 L 18.436 21.548 L 18.49 21.607 L 18.915 21.607 L 18.968 21.548 L 19.074 21.548 L 19.127 21.488 L 19.18 21.488 L 19.233 21.429 L 19.287 21.429 L 19.393 21.311 L 19.446 21.311 L 19.446 21.252 L 19.499 21.192 L 19.552 21.192 L 19.552 21.133 L 19.712 20.956 L 19.712 20.837 L 19.765 20.778 L 19.765 20.719 L 19.818 20.66 L 19.818 20.186 L 19.765 20.127 L 19.765 20.008 L 19.712 19.949 L 19.712 19.89 L 19.658 19.831 L 19.658 19.772 L 19.34 19.416 L 19.287 19.416 L 19.18 19.298 L 19.074 19.298 L 19.021 19.239 Z"/>
                    </svg>
                    <span class="qmr-text">...</span>`;
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
            ['mouseenter', 'mouseover'].forEach(type => {
                qBtn.addEventListener(type, (e) => e.stopPropagation());
            });

            qBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation(); // 依然保留，防止点击事件向上冒泡干扰 B 站

                // 只有登录用户才能投票
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

                    // 投票请求函数（支持重试携带验证 payload）
                    const doVote = async (altchaPayload = null) => {
                        const voteData = { bvid: activeBvid, title, userId };
                        if (altchaPayload) {
                            voteData.altcha = altchaPayload;
                        }

                        const response = await fetch(`${API_BASE}/vote`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(voteData)
                        });
                        return response.json();
                    };

                    let resData = await doVote();

                    // 检查是否需要人机验证
                    if (resData.requiresCaptcha) {
                        try {
                            const altchaPayload = await showAltchaChallenge();
                            // 验证成功，携带 payload 重新投票
                            resData = await doVote(altchaPayload);
                        } catch (captchaError) {
                            console.log('[B站问号榜] 用户取消验证');
                            return; // 用户取消，直接返回
                        }
                    }

                    if (resData.success) {
                        syncButtonState();
                        // 只有当点亮（active 为 true）时才发弹幕
                        if (resData.active) {
                            sendDanmaku('？');
                        }
                    } else if (!resData.requiresCaptcha) {
                        alert('投票失败: ' + (resData.error || resData.message || '未知错误'));
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
        const currentUserId = getUserId();
        if (bvid !== currentBvid || currentUserId !== lastSyncedUserId) {
            syncButtonState();
        }
    } catch (e) {
        isInjecting = false;
    }
}

// 增加滚动和缩放监听以保持位置同步
window.addEventListener('scroll', injectQuestionButton, { passive: true });
window.addEventListener('resize', injectQuestionButton, { passive: true });

// 防抖函数
function debounce(fn, delay) {
    let timer = null;
    return function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, arguments), delay);
    }
}

function getCachedUserId() {
    return getUserId();
}

const debouncedInject = debounce(injectQuestionButton, 500);

// 降低监听频率和范围，保护 B 站顶栏
const observer = new MutationObserver(debounce(() => {
    injectQuestionButton();
}, 1000)); // 进一步放慢频率

let lastUrl = location.href;

// 初始尝试 - 增加延迟，等 B 站顶栏加载完再动
setTimeout(() => {
    const mainApp = document.getElementById('app') || document.body;
    observer.observe(mainApp, { childList: true, subtree: true });
    injectQuestionButton();

    // 合并后的心跳检测
    setInterval(() => {
        const urlChanged = location.href !== lastUrl;
        if (urlChanged) {
            lastUrl = location.href;
            injectQuestionButton();
        } else {
            // 心跳检测：强制检查
            const btn = document.getElementById('bili-qmr-btn');
            const toolbar = document.querySelector('.video-toolbar-left-main') ||
                document.querySelector('.toolbar-left') ||
                document.querySelector('.video-toolbar-container .left-operations');

            if (toolbar && (!btn || !toolbar.contains(btn))) {
                injectQuestionButton();
            }
        }

        // 检查视频事件绑定
        const video = document.querySelector('video');
        if (video && !video.dataset.qmrListen) {
            video.dataset.qmrListen = 'true';
            video.addEventListener('play', () => setTimeout(injectQuestionButton, 500));
            video.addEventListener('pause', () => setTimeout(injectQuestionButton, 500));
        }
    }, 2000); // 心跳频率也降低
}, 2500); // 延迟 2.5 秒启动，避开顶栏渲染高峰期