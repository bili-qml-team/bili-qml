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


async function updateGitHub(filename, newContent) {
    const token = env.GITHUB_TOKEN;
    if (!token) return console.error("Missing GITHUB_TOKEN secret.");

    const apiBase = "https://api.github.com";
    const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

    // UTF-8 string -> base64
    const toBase64 = (str) => {
        const bytes = new TextEncoder().encode(str);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    };

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Bili-QML-Cron-Worker"
    };

    const fileUrl = `${apiBase}/repos/bili-qml-team/bili-qml-leaderboard-cache/contents/${encodePath(filename)}`;

    // Try to read existing file to get SHA (if exists)
    let sha = undefined;
    const getResp = await fetch(fileUrl, { headers });
    if (getResp.status === 200) {
        const data = await getResp.json();
        sha = data.sha;
    } else if (getResp.status !== 404) {
        const errText = await getResp.text();
        return console.error(`GET file failed: ${getResp.status}\n${errText}`)
    }

    // Create or update
    const message = `auto: update cache at ${new Date(Date.now()).toUTCString()}`
    const putBody = {
        message: message,
        content: toBase64(newContent),
        branch: "main",
        ...(sha ? { sha } : {}), // required only when updating existing file
    };

    const putResp = await fetch(fileUrl.split("?")[0], {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(putBody),
    });

    const putText = await putResp.text();
    if (!putResp.ok) {
        return console.error(`PUT failed: ${putResp.status}\n${putText}`);
    }

    return console.log("GitHub update succeed.");
}

async function purgeCache() {
    return fetch(`https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/purge_cache`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.CACHE_PURGE_TOKEN}`
            },
            body: JSON.stringify({
                "hosts": [`${env.WORKER_HOST}`]
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
            await env.LEADERBOARD_CACHE.put('expireTime', String(responseJson.leaderBoardCache.expireTime));
            await env.LEADERBOARD_CACHE.put('daily', JSON.stringify(responseJson.leaderBoardCache.caches[0]));
            await env.LEADERBOARD_CACHE.put('weekly', JSON.stringify(responseJson.leaderBoardCache.caches[1]));
            await env.LEADERBOARD_CACHE.put('monthly', JSON.stringify(responseJson.leaderBoardCache.caches[2]));
            // await updateGitHub("expireTime", String(responseJson.leaderBoardCache.expireTime));
            await updateGitHub("daily", JSON.stringify(responseJson.leaderBoardCache.caches[0]));
            await updateGitHub("weekly", JSON.stringify(responseJson.leaderBoardCache.caches[1]));
            await updateGitHub("monthly", JSON.stringify(responseJson.leaderBoardCache.caches[2]));
            await purgeCache();
            console.log(`Refresh success at ${end}, took ${(end - start) / 1000.0}s, cache: ${JSON.stringify(responseJson.leaderBoardCache)}`);
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
                console.log("Cache Hit, use existing cache.")
                return response;
            }
            const period = url.pathname.slice(1); // remove leading '/'
            let data = await env.LEADERBOARD_CACHE.get(period);
            let expireTime = Number(await env.LEADERBOARD_CACHE.get('expireTime'));
            if (data) {
                data = JSON.parse(data);
                const now = Date.now();
                if (now > expireTime) expireTime = now + 300 * 1000; // at least 5 min
                const response = new Response(JSON.stringify({
                    success: true,
                    period,
                    expireTime,
                    data
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Expires': (new Date(expireTime)).toUTCString()
                    }
                });
                ctx.waitUntil(
                    cache.put(request, response.clone()).catch(err => {
                        console.error("Failed to store response in cache:", err);
                    })
                );
                console.log("Cache Miss, new cache stored.")
                return response;
            }
            return Response.json({ success: false, expireTime: 0 })
        }
        return new Response("Not found", { status: 404 });
    }
};