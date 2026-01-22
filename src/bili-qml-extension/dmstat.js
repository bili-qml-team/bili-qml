const originalSet = Map.prototype.set;
let bpx_player = null;

Map.prototype.set = function (key, value) {
    if (key && key.danmakuStore && typeof key.danmakuStore.fetchDmSeg === 'function') {
        Map.prototype.set = originalSet;    //还原

        bpx_player = key;
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

function updateDanmakuStat(dmList) {
    console.log('updateDanmakuStat', dmList);
    if (!Array.isArray(dmList)) return;
    const sBtn = document.getElementById('bili-qmr-stat-btn');
    if (!sBtn) return;
    const countText = sBtn.querySelector('.qmr-text');
    if (!countText) return;

    const qCount = dmList.filter(dm => {
        const text = dm?.text ?? dm?.content ?? '';
        return /^[؟?¿？]+$/.test(text.trim());
    }).length;

    countText.innerText = formatCount(qCount);
}