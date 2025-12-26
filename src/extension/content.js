// content.js

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
let currentBvid = ''; // 记录当前页面正在处理的 BVID

// 同步按钮状态（亮或灭）及计数
async function syncButtonState() {
    const qBtn = document.getElementById('bili-qmr-btn');
    if (!qBtn) return;

    const bvid = getBvid();
    if (!bvid) return;

    const userId = await getUserId();
    
    try {
        const statusRes = await fetch(`http://localhost:3000/api/status?bvid=${bvid}&userId=${userId}`);
        const statusData = await statusRes.json();
        
        // 更新按钮激活状态
        if (statusData.active) {
            qBtn.classList.add('active');
        } else {
            qBtn.classList.remove('active');
        }
        
        // 更新显示的数量
        const countText = qBtn.querySelector('.qmr-text');
        if (countText) {
            countText.innerText = statusData.count > 0 ? formatCount(statusData.count) : '问号';
        }

        currentBvid = bvid;
    } catch (e) {
        console.error('[B站问号榜] 同步状态失败:', e);
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

    if (document.getElementById('bili-qmr-btn')) {
        if (bvid !== currentBvid) {
            syncButtonState();
        }
        return;
    }
    
    if (isInjecting) return;
    
    const toolbar = document.querySelector('.video-toolbar-left') || 
                    document.querySelector('.toolbar-left') ||
                    document.querySelector('.video-toolbar-container .left-operations') ||
                    document.querySelector('#arc_toolbar_report .left-operations') ||
                    document.querySelector('.ops');

    if (!toolbar) return;

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

    // 插入到分享按钮之前或最后
    const shareBtn = toolbar.querySelector('.share') || toolbar.querySelector('.video-share');
    if (shareBtn) {
        toolbar.insertBefore(qBtn, shareBtn.nextSibling);
    } else {
        toolbar.appendChild(qBtn);
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
            const response = await fetch('http://localhost:3000/api/vote', {
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

// 使用 MutationObserver 监听 DOM 变化，确保在 SPA 路由切换或动态加载时注入
const observer = new MutationObserver((mutations) => {
    injectQuestionButton();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 初始尝试
injectQuestionButton();
