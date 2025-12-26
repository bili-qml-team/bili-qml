// content.js
const API_BASE = 'https://bili-qml.vercel.app/api';

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
        
        if (statusData.active) {
            qBtn.classList.add('active');
        } else {
            qBtn.classList.remove('active');
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

async function injectQuestionButton() {
    const bvid = getBvid();
    if (!bvid) return;

    // 1. 先找到当前页面上真正显示的那个 toolbar
    const toolbar = document.querySelector('.video-toolbar-left') || 
                    document.querySelector('.toolbar-left') ||
                    document.querySelector('.video-toolbar-container .left-operations') ||
                    document.querySelector('#arc_toolbar_report .left-operations') ||
                    document.querySelector('.ops');

    if (!toolbar) return;

    // 2. 检查按钮是否已经在【这个】toolbar 里面了
    const existingBtn = document.getElementById('bili-qmr-btn');
    if (existingBtn) {
        if (toolbar.contains(existingBtn)) {
            // 按钮就在当前的 toolbar 里，只需要检查是否需要切换视频状态
            if (bvid !== currentBvid) {
                syncButtonState();
            }
            return;
        } else {
            // 按钮虽然存在，但不在当前的 toolbar 里（可能在被隐藏的旧 toolbar 里）
            existingBtn.remove(); 
        }
    }
    
    if (isInjecting) return;
    isInjecting = true;
    const userId = await getUserId();

    // 创建问号按钮
    const qBtn = document.createElement('div');
    qBtn.id = 'bili-qmr-btn';
    qBtn.className = 'video-toolbar-left-item';
    qBtn.innerHTML = `
        <div class="qmr-icon-wrap">
            <span class="qmr-icon">?</span>
            <span class="qmr-text">...</span>
        </div>
    `;

    // 关键修复：只要没在当前的 toolbar 里，就强制插入
    const shareBtn = toolbar.querySelector('.share') || 
                   toolbar.querySelector('.video-share') || 
                   toolbar.querySelector('.video-toolbar-share');

    if (shareBtn) {
        toolbar.insertBefore(qBtn, shareBtn.nextSibling);
    } else {
        toolbar.prepend(qBtn); // 找不到分享按钮就塞到最前面，这样最显眼
    }
    
    isInjecting = false;
    syncButtonState();

    // 点击事件
    qBtn.addEventListener('click', async () => {
        const activeBvid = getBvid(); 
        const title = document.querySelector('.video-title')?.innerText || 
                      document.querySelector('h1.video-title')?.innerText || 
                      document.title.replace('_哔哩哔哩_bilibili', '') ||
                      '未知视频';
        
        if (!activeBvid) return;

        try {
            qBtn.style.pointerEvents = 'none';
            const response = await fetch(`${API_BASE}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bvid: activeBvid, title, userId })
            });
            const data = await response.json();
            if (data.success) {
                // 投票后立即重新请求最新计数和状态
                syncButtonState();
            }
        } catch (error) {
            console.error('[B站问号榜] 请求失败:', error);
            alert('操作失败，请确保后端服务器已启动。');
        } finally {
            qBtn.style.pointerEvents = 'auto';
        }
    });
}

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
