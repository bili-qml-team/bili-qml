// content.js
const API_BASE = 'https://www.bili-qml.top/api';
// for debug
//const API_BASE = 'http://localhost:3000/api'

// 注入 B 站风格的 CSS
const style = document.createElement('style');
style.innerHTML = `
    /* 问号键样式 */
    #bili-qmr-btn {
        position: absolute;
        display: flex;
        align-items: center;
        width: 92px;
        height: 28px;
        white-space: nowrap;
        font-size: 13px;
        color: #61666d;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        transition: color .3s, opacity .3s;
        z-index: 10;
        pointer-events: auto;
        /* 默认定位：先放在一个安全的位置，后续靠 JS 微调 */
        right: -100px; 
        top: 0;
    }
    #bili-qmr-btn .qmr-icon-wrap {
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
        transition: color .3s;
    }
    #bili-qmr-btn .qmr-icon-img {
        width: 20px;
        height: 20px;
        margin-right: 6px;
        transition: transform 0.3s, filter 0.3s;
        display: block;
        object-fit: contain;
    }
    /* 未点亮且未悬停时：灰色 */
    #bili-qmr-btn:not(.voted) .qmr-icon-img {
        filter: grayscale(1) opacity(0.6);
    }
    /* 悬停或已点亮时：变蓝色 */
    /* 技巧：通过 drop-shadow 创建一个偏移的蓝色投影，并隐藏原图 */
    #bili-qmr-btn:hover .qmr-icon-img,
    #bili-qmr-btn.voted .qmr-icon-img {
        filter: drop-shadow(0 0 0 #00aeec);
    }
    #bili-qmr-btn .qmr-text {
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-word;
        white-space: nowrap;
    }
    /* 悬停与点亮状态 */
    #bili-qmr-btn:hover, #bili-qmr-btn.voted {
        color: #00aeec !important; /* 对应 var(--brand_blue) */
    }
    #bili-qmr-btn:hover .qmr-icon-img {
        transform: scale(0.85);
    }
    #bili-qmr-btn:active .qmr-icon-img {
        transform: scale(0.7);
    }
    /* 大屏适配 (min-width: 1681px) */
    @media (min-width: 1681px) {
        #bili-qmr-btn {
            width: 100px;
            font-size: 14px;
        }
        #bili-qmr-btn .qmr-icon-img {
            width: 24px;
            height: 24px;
        }
    }
`;
document.head.appendChild(style);

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
        const toolbarLeft = document.querySelector('.video-toolbar-left') || 
                           document.querySelector('.toolbar-left');
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
            const iconUrl = chrome.runtime.getURL('icons/button-icon.png');
            qBtn.innerHTML = `
                <div class="qmr-icon-wrap">
                    <img class="qmr-icon-img" src="${iconUrl}" />
                    <span class="qmr-text">...</span>
                </div>
            `;
            
            // 关键：挂载到 toolbarLeft，确保它和分享按钮是“远房亲戚”，互不干扰悬停
            toolbarLeft.style.position = 'relative'; // 确保父容器有定位基准
            toolbarLeft.appendChild(qBtn);

            // 定位同步函数
            const syncPos = () => {
                if (!qBtn || !shareBtn || !toolbarLeft) return;
                const sRect = shareBtn.getBoundingClientRect();
                const pRect = toolbarLeft.getBoundingClientRect();
                // 计算相对于 toolbarLeft 的偏移量
                qBtn.style.left = (sRect.right - pRect.left + 12) + 'px';
                qBtn.style.top = (sRect.top - pRect.top + (sRect.height - 28) / 2) + 'px';
            };

            // 立即同步并开启监听
            syncPos();
            const posTimer = setInterval(syncPos, 500); // 较低频率的兜底同步
            window.addEventListener('resize', syncPos);
            document.addEventListener('fullscreenchange', () => setTimeout(syncPos, 200));

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
                    let endpoint=qBtn.classList.contains("voted")==true?"unvote":"vote";
                    const response = await fetch(`${API_BASE}/${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ bvid: activeBvid, title, userId })
                    });
                    
                    const resData = await response.json();
                    if (resData.success) {
                        syncButtonState();
                        // 只有当点亮（active 为 true）时才发弹幕
                        if (resData.active) {
                            sendDanmaku('？');
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
    return function() {
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
            const toolbar = document.querySelector('.video-toolbar-left') || 
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
