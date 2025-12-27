// content.js
const API_BASE = 'https://www.bili-qml.top/api';

// 注入 B 站风格的 CSS
const style = document.createElement('style');
style.innerHTML = `
    #bili-qmr-btn {
        position: absolute;
        display: flex;
        align-items: center;
        width: 92px;
        height: 28px;
        white-space: nowrap;
        transition: all .3s;
        font-size: 13px;
        color: #61666d; /* 对应 var(--text2) */
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        z-index: 10000;
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

// 获取或生成模拟用户 ID
async function getUserId() {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(['userId'], (result) => {
                let userId = result.userId;
                if (!userId) {
                    userId = 'user_' + Math.random().toString(36).substr(2, 9);
                    chrome.storage.local.set({ userId }, () => {
                        console.log('[B站问号榜] 已生成新用户ID:', userId);
                        resolve(userId);
                    });
                } else {
                    resolve(userId);
                }
            });
        } catch (e) {
            console.error('[B站问号榜] 存储访问失败，使用临时ID', e);
            resolve('temp_' + Date.now());
        }
    });
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

// 同步按钮状态（亮或灭）及计数
async function syncButtonState() {
    const qBtn = document.getElementById('bili-qmr-btn');
    if (!qBtn) return;

    const bvid = getBvid();
    if (!bvid) return;

    if (isSyncing) return;
    
    try {
        isSyncing = true;
        const userId = await getUserId();
        // 增加 _t 参数防止浏览器缓存 GET 请求
        const statusRes = await fetch(`${API_BASE}/status?bvid=${bvid}&userId=${userId}&_t=${Date.now()}`);
        const statusData = await statusRes.json();
        
        console.log(`[B站问号榜] 状态同步 | BVID: ${bvid} | UserID: ${userId} | 已点亮: ${statusData.active}`);
        
        const isLoggedIn = document.cookie.includes('DedeUserID');
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

        currentBvid = bvid;
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
    console.log('%c[B站问号榜] 🚀 开始执行弹幕发送流程...', 'color: #00a1d6; font-weight: bold;');
    
    // 创建一个临时的可视化提示浮层（显示在网页左上角，方便用户直接看到）
    const showNotice = (msg, isError = false) => {
        /* 调试用：发布版已注释
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            padding: 10px 20px; border-radius: 4px; z-index: 100000;
            background: ${isError ? '#ff4d4f' : '#00a1d6'}; color: white;
            font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: opacity 0.5s;
        `;
        notice.innerText = `[问号榜提示] ${msg}`;
        document.body.appendChild(notice);
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => notice.remove(), 500);
        }, 2000);
        */
    };

    try {
        const dmInput = document.querySelector('input.bpx-player-dm-input');
        const dmSendBtn = document.querySelector('.bpx-player-dm-btn-send');

        if (!dmInput) {
            console.error('[B站问号榜] ❌ 失败：找不到输入框 input.bpx-player-dm-input');
            showNotice('找不到弹幕输入框，请确认弹幕开关已打开', true);
            return;
        }
        if (!dmSendBtn) {
            console.error('[B站问号榜] ❌ 失败：找不到发送按钮 .bpx-player-dm-btn-send');
            showNotice('找不到发送按钮', true);
            return;
        }

        console.log('[B站问号榜] ✅ 找到元素，准备填入内容...');
        dmInput.focus();
        dmInput.click();
        
        // 执行插入
        const insertSuccess = document.execCommand('insertText', false, text);
        console.log('[B站问号榜] 执行 insertText 结果:', insertSuccess);
        
        dmInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[B站问号榜] 当前输入框值:', dmInput.value);

        if (dmInput.value !== text) {
            console.warn('[B站问号榜] ⚠️ 警告：输入框内容未改变，React 状态可能被拦截');
        }

        setTimeout(() => {
            console.log('[B站问号榜] 正在模拟按下回车键...');
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
            });
            dmInput.dispatchEvent(enterEvent);

            setTimeout(() => {
                // 检查内容是否消失（消失代表发送成功）
                if (dmInput.value === '') {
                    console.log('%c[B站问号榜] 🎉 发送成功！(输入框已清空)', 'color: #52c41a; font-weight: bold;');
                    showNotice('弹幕“？”同步发送成功！');
                } else {
                    console.log('[B站问号榜] 尝试手动点击发送按钮补刀...');
                    
                    // 深度模拟点击：先触发 mousedown，再触发 click
                    dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    dmSendBtn.click();
                    
                    setTimeout(() => {
                        if (dmInput.value === '') {
                            console.log('%c[B站问号榜] 🎉 发送成功！(手动点击生效)', 'color: #52c41a; font-weight: bold;');
                            showNotice('弹幕“？”同步发送成功！');
                        } else {
                            // 如果还是没发出去，尝试最后的大招：直接在输入框按一下回车键的 keyup
                            const upEvent = new KeyboardEvent('keyup', {
                                bubbles: true, cancelable: true, key: 'Enter', keyCode: 13
                            });
                            dmInput.dispatchEvent(upEvent);
                            
                            setTimeout(() => {
                                if (dmInput.value === '') {
                                    showNotice('弹幕“？”同步发送成功！');
                                } else {
                                    console.error('[B站问号榜] ❌ 最终发送失败：内容仍残留在输入框');
                                    showNotice('弹幕发送失败，请手动检查弹幕栏', true);
                                }
                            }, 200);
                        }
                    }, 500);
                }
                dmInput.blur();
            }, 500);
        }, 300);

    } catch (e) {
        console.error('[B站问号榜] 💥 程序运行崩溃:', e);
        showNotice('程序运行异常: ' + e.message, true);
    }
}

async function injectQuestionButton() {
    try {
        const bvid = getBvid();
        if (!bvid) return;

        // 1. 寻找精准参考位置：分享按钮或包含“复制链接”的区域
        let anchor = document.querySelector('.video-share') || 
                     document.querySelector('.share-info') ||
                     document.querySelector('.video-toolbar-share') ||
                     document.querySelector('.video-toolbar-left-item.share');

        // 如果没找到具体的分享按钮，再退而求其次找左侧工具栏
        if (!anchor) {
            anchor = document.querySelector('.video-toolbar-left') || 
                     document.querySelector('.toolbar-left') ||
                     document.querySelector('.video-toolbar-container .left-operations');
        }

        if (!anchor) return;

        let qBtn = document.getElementById('bili-qmr-btn');
        
        // 2. 如果按钮不存在，创建并挂载
        if (!qBtn) {
            if (isInjecting) return;
            isInjecting = true;
            
            qBtn = document.createElement('div');
            qBtn.id = 'bili-qmr-btn';
            // 移除 style.cssText 中的 position 等，改为由 CSS 控制
            qBtn.style.pointerEvents = 'auto';
            const iconUrl = chrome.runtime.getURL('icons/button-icon.png');
            qBtn.innerHTML = `
                <div class="qmr-icon-wrap">
                    <img class="qmr-icon-img" src="${iconUrl}" />
                    <span class="qmr-text">...</span>
                </div>
            `;
            document.body.appendChild(qBtn);
            
            qBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 只有登录用户才能投票
                if (!document.cookie.includes('DedeUserID')) {
                    alert('请先登录 B 站后再投问号哦 ~');
                    return;
                }

                const activeBvid = getBvid(); 
                const title = document.querySelector('.video-title')?.innerText || document.title;
                if (!activeBvid) return;

                const userId = await getUserId();
                try {
                    qBtn.style.pointerEvents = 'none';
                    qBtn.style.opacity = '0.5';
                    const response = await fetch(`${API_BASE}/vote`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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

        // 3. 实时计算位置：放在锚点的右侧 15px 处
        const rect = anchor.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 定位在锚点元素的右边
        qBtn.style.left = `${rect.right + scrollLeft + 15}px`; 
        qBtn.style.top = `${rect.top + scrollTop}px`;
        qBtn.style.height = `${rect.height}px`;
        
        if (bvid !== currentBvid) syncButtonState();
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

let userIdCache = null;
async function getCachedUserId() {
    if (userIdCache) return userIdCache;
    userIdCache = await getUserId();
    return userIdCache;
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