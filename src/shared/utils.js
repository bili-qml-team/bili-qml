/**
 * 通用工具函数
 * @module shared/utils
 */

/**
 * 获取用户 ID (B站 DedeUserID cookie)
 * @returns {string|null} 用户ID，未登录返回 null
 */
export function getUserId() {
    const match = document.cookie.match(/DedeUserID=([^;]+)/);
    return match?.[1] || null;
}

/**
 * 获取当前视频的 BVID
 * @returns {string|null} BVID，非视频页返回 null
 */
export function getBvid() {
    // 1. 从 URL 路径获取
    const pathParts = window.location.pathname.split('/');
    const bvidFromPath = pathParts.find(p => p.startsWith('BV'));
    if (bvidFromPath) return bvidFromPath;

    // 2. 从 URL 参数获取
    const urlParams = new URLSearchParams(window.location.search);
    const bvidFromParam = urlParams.get('bvid');
    if (bvidFromParam) return bvidFromParam;

    // 3. 从 B站原生变量获取
    const bvidFromWindow = window.__INITIAL_STATE__?.bvid || window.p_bvid;
    if (bvidFromWindow) return bvidFromWindow;

    return null;
}

/**
 * 格式化数字显示（B站风格）
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串，如 "1.2万"
 */
export function formatCount(num) {
    const n = Number(num) || 0;
    if (n >= 100000000) {
        const v = n / 100000000;
        return `${v >= 10 ? Math.round(v) : v.toFixed(1)}亿`;
    }
    if (n >= 10000) {
        const v = n / 10000;
        return `${v >= 10 ? Math.round(v) : v.toFixed(1)}万`;
    }
    return String(n);
}

/**
 * HTML 转义，防止 XSS
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的安全文本
 */
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * 等待元素出现
 * @param {string} selector - CSS 选择器
 * @param {number} [ms] - 超时时间（毫秒），不传则无限等待
 * @returns {Promise<Element>} 找到的元素
 */
export function waitFor(selector, ms = undefined) {
    return new Promise((resolve, reject) => {
        const target = document.querySelector(selector);
        if (target) {
            resolve(target);
            return;
        }

        let timeoutId;
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                if (timeoutId) clearTimeout(timeoutId);
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        if (ms) {
            timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element not found: "${selector}" within ${ms}ms`));
            }, ms);
        }
    });
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * 延迟等待
 * @param {number} ms - 等待时间（毫秒）
 * @returns {Promise<void>}
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 查找第一个匹配的元素
 * @param {string[]} selectors - 选择器数组
 * @returns {Element|null} 找到的元素
 */
export function findFirst(selectors) {
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}
