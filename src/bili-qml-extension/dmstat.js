const DMSTAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" style="width: 1.2em; height: 1.2em; vertical-align: middle; fill: currentColor; margin-right: 4px;" t="1769094292907" class="video-fav-icon video-toolbar-item-icon" viewBox="0 0 1024 1024" version="1.1" p-id="7604">
    <path d="M493.714286 566.857143h340.297143a73.142857 73.142857 0 0 1 73.142857 85.577143A457.142857 457.142857 0 1 1 371.565714 117.76a73.142857 73.142857 0 0 1 85.577143 73.142857V530.285714a36.571429 36.571429 0 0 0 36.571429 36.571429z" p-id="7606"/>
    <path d="M828 304c0 105.2-59.7 196.5-147.1 241.7-23.6 12.2-42.8 30.5-56.2 52.4-15.7 25.8-23.2 56.6-20 88.3 1 9.4-6.4 17.6-15.9 17.6H446.3c-18.9 0-34.3-15.3-34.3-34.3 0-127.4 71.3-243 183.2-303.9 24.3-13.2 40.9-33.7 40.7-65.2-0.2-42.5-35.4-76.6-77.9-76.6h-50c-31.9 0-59.5 18.8-72.3 45.8a31.98 31.98 0 0 1-28.9 18.2h-134c-20.3 0-35.4-18.6-31.4-38.4 1.8-8.7 3.9-17.2 6.5-25.6C282.1 112.8 385.6 32 508 32h48c75.1 0 143.1 30.4 192.3 79.7C797.6 160.9 828 228.9 828 304zM636 864c0 35.3-14.3 67.3-37.5 90.5-23.2 23.2-55.2 37.5-90.5 37.5s-67.3-14.3-90.5-37.5C394.3 931.3 380 899.3 380 864c0-70.7 57.3-128 128-128 35.3 0 67.3 14.3 90.5 37.5 23.2 23.2 37.5 55.2 37.5 90.5z" p-id="10313" id="element-1769094353388" transform="rotate(0) scale(0.5, 0.45) translate(800, 200)"/>
</svg>`;

const dmStatEl = document.createElement('div');
dmStatEl.id = 'bili-qmr-dmstat';
Object.assign(dmStatEl.style, {
    fontSize: '14px',
    margin: '4px 10px',
    color: 'var(--text2, #61666D)',
});
dmStatEl.innerHTML = `${DMSTAT_SVG} <span>弹幕问号统计:...</span>`;

const originalSet = Map.prototype.set;

Map.prototype.set = function (key, value) {
    if (key && key.danmakuStore && typeof key.danmakuStore.fetchDmSeg === 'function') {
        Map.prototype.set = originalSet;    //还原

        const bpx_player = key;
        window.bpx_player = key;
        const danmakuStore = bpx_player.danmakuStore;
        const originalFetchDmSeg = danmakuStore.fetchDmSeg.bind(danmakuStore);
        danmakuStore.fetchDmSeg = async function (...args) {
            const result = await originalFetchDmSeg(...args);
            requestAnimationFrame(() => {
                try {
                    updateDanmakuStat(danmakuStore.dmListStore.allDm);
                } catch (e) {
                    console.error(e);
                }
            });
            return result;
        };
    }
    return originalSet.call(this, key, value);
};

function formatCount(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}
function getPercentage(n, t) {
    if (!t || t === 0) return '0%';

    const percent = n / t;

    return new Intl.NumberFormat('zh-CN', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(percent);
}

function updateDanmakuStat(dmList) {
    // console.log('updateDanmakuStat', dmList);
    if (!Array.isArray(dmList)) return;
    if (!dmStatEl.isConnected) ensureDmStatEl();

    const countText = dmStatEl.querySelector('span');
    if (!countText) return;

    const count = dmList.length;

    const qCount = dmList.filter(dm => {
        const text = dm?.text ?? dm?.content ?? '';
        return /^[؟?¿？]+$/.test(text.trim());
    }).length;

    countText.innerText = `弹幕问号统计: ${formatCount(qCount)} (${getPercentage(qCount, count)})`;
}

function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            const target = document.querySelector(selector);
            if (target) {
                observer.disconnect(); // 找到后立即停止监听，释放内存
                resolve(target);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

let isWaiting = false;
async function ensureDmStatEl() {
    if (dmStatEl.isConnected || isWaiting) return;
    isWaiting = true;
    const container = await waitForElement('#danmukuBox .bui-collapse-body');
    container.appendChild(dmStatEl);
    isWaiting = false;
}

ensureDmStatEl();