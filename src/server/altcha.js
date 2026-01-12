const { createChallenge, verifySolution } = require('altcha-lib');
// Altcha 配置
const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'bili-qml-default-hmac-key-change-in-production';
const ALTCHA_COMPLEXITY = Number(process.env.ALTCHA_COMPLEXITY) || 50000; // PoW 难度

const RATE_LIMIT_VOTE_MAX = Number(process.env.RATE_LIMIT_VOTE_MAX) || 10; // 投票最大次数
const RATE_LIMIT_VOTE_WINDOW = Number(process.env.RATE_LIMIT_VOTE_WINDOW) || 300; // 投票窗口（秒）
const RATE_LIMIT_LEADERBOARD_MAX = Number(process.env.RATE_LIMIT_LEADERBOARD_MAX) || 20; // 排行榜最大次数
const RATE_LIMIT_LEADERBOARD_WINDOW = Number(process.env.RATE_LIMIT_LEADERBOARD_WINDOW) || 300; // 排行榜窗口（秒）

let redis=null;

function initAlcha(paraRedis,app){
    redis=paraRedis;
    app.get(['/api/altcha/challenge', '/altcha/challenge'], async (req, res) => {
    try {
        const challenge = await createChallenge({
            hmacKey: ALTCHA_HMAC_KEY,
            maxNumber: ALTCHA_COMPLEXITY,
            algorithm: 'SHA-256',
        });
        res.json(challenge);
    } catch (error) {
        console.error('Altcha Challenge Error:', error);
        res.status(500).json({ success: false, error: 'Failed to create challenge' });
    }
    });
}

async function checkRateLimit(key, maxRequests, windowSeconds) {
    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, windowSeconds);
    }
    return current > maxRequests;
}

async function altchaCheck(altcha,rateLimitKey){

    const isRateLimited = await checkRateLimit(rateLimitKey, RATE_LIMIT_VOTE_MAX, RATE_LIMIT_VOTE_WINDOW);

        // 2. 检查频率限制
        if (isRateLimited) {
            if (altcha) {
                const isValid = await verifySolution(altcha, ALTCHA_HMAC_KEY);
                if (!isValid) {
                    return res.status(400).json({ success: false, error: 'Invalid CAPTCHA', requiresCaptcha: true });
                }
                await resetRateLimit(rateLimitKey);
            } else {
                return res.status(429).json({ success: false, error: 'Rate limit exceeded', requiresCaptcha: true });
            }
        }
}
// 重置频率限制（CAPTCHA 验证通过后）
async function resetRateLimit(key) {
    await redis.del(key);
}

module.exports={
    altchaCheck,
    initAlcha
}
