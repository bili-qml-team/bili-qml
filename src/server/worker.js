/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { env } from "cloudflare:workers";

async function purgeCache(hostname) {
    return fetch(`https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/purge_cache`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.CACHE_PURGE_TOKEN}`
            },
            body: JSON.stringify({
                "hosts": [`${hostname}`]
            })
        });
}

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
            await purgeCache(env.WORKER_HOST);
        } else {
            console.error(`Refresh failed at ${end}`);
        }
    },

    async fetch(request, env, ctx) {
        // only respond /daily, /weekly, /monthly
        const url = new URL(request.url);
        if (url.pathname === '/daily' || url.pathname === '/weekly' || url.pathname === '/monthly') {
            let cache = caches.default;
            const response = await cache.match(request);
            if (response) {
                return response;
            }
            const period = url.pathname.slice(1); // remove leading '/'
            const data = await env.LEADERBOARD_CACHE.get(period);
            const expireTime = Number(await env.LEADERBOARD_CACHE.get('expireTime'));
            if (data) {
                const response = new Response(JSON.stringify({
                    success: true,
                    period: period,
                    expireTime: expireTime,
                    data: JSON.parse(data)
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Expires': (new Date(expireTime)).toUTCString()
                    }
                });
                await cache.put(request, response);
                return new Response(JSON.stringify({
                    success: true,
                    period: period,
                    expireTime: expireTime,
                    data: JSON.parse(data)
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Expires': (new Date(expireTime)).toUTCString()
                    }
                });
            }
            return Response.json({ success: false, expireTime: 0 })
        }
        return new Response("Not found", { status: 404 });
    }
};