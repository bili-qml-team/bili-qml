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
export async function getVoteStatus(apiBase, bvid, userId, fetchImpl = fetch) {
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
export async function doVote(apiBase, endpoint, bvid, userId, altchaSolution = null, fetchImpl = fetch) {
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
export async function fetchLeaderboard(apiBase, range = 'realtime', altchaSolution = null, fetchImpl = fetch) {
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
export async function fetchVideoInfo(bvid, fetchImpl = fetch) {
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
