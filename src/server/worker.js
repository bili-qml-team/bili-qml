export default {
    async scheduled(controller, env, ctx) {
        const start = Date.now();
        const response = await fetch(`https://${env.QML_API}/api/refresh`, {
            headers: {
                "Authorization": `Bearer ${env.REFRESH_TOKEN}`
            }
        });
        const end = Date.now();
        const responseJson = await response.json();
        if (responseJson && responseJson.success) {
            console.log(`Refresh success at ${end}, took ${(end - start) / 1000.0}s, cache: ${JSON.stringify(responseJson.leaderBoardCache)}`);
            await env.LEADERBOARD_CACHE.put('expireTime', String(responseJson.leaderBoardCache.expireTime));
            await env.LEADERBOARD_CACHE.put('daily', JSON.stringify(responseJson.leaderBoardCache.caches[0]));
            await env.LEADERBOARD_CACHE.put('weekly', JSON.stringify(responseJson.leaderBoardCache.caches[1]));
            await env.LEADERBOARD_CACHE.put('monthly', JSON.stringify(responseJson.leaderBoardCache.caches[2]));
        } else {
            console.error(`Refresh failed at ${end}`);
        }
    },

    async fetch(request, env, ctx) {
        // only respond /daily, /weekly, /monthly
        const url = new URL(request.url);
        if (url.pathname === '/daily' || url.pathname === '/weekly' || url.pathname === '/monthly') {
            const period = url.pathname.slice(1); // remove leading '/'
            const data = await env.LEADERBOARD_CACHE.get(period);
            const expireTime = await env.LEADERBOARD_CACHE.get('expireTime');
            if (data) {
                return new Response(JSON.stringify({
                    success: true,
                    period: period,
                    expireTime: Number(expireTime),
                    data: JSON.parse(data)
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        return new Response("Not found", { status: 404 });
    }
};