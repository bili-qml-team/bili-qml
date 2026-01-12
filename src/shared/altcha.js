/**
 * Altcha CAPTCHA 功能
 * @module shared/altcha
 */

/**
 * 获取 Altcha 挑战
 * @param {string} apiBase - API 基础地址
 * @returns {Promise<Object>} 挑战数据
 */
export async function fetchAltchaChallenge(apiBase, fetchImpl = fetch) {
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
export async function solveAltchaChallenge(challenge) {
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
