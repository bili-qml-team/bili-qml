/**
 * 浏览器扩展平台适配层
 * @module extension/platform
 */

// 判断是否为 Firefox (使用 Promise-based API)
const isFirefox = typeof browser !== 'undefined' && browser.storage;

// 浏览器存储 API 兼容
export const browserStorage = (function () {
    if (isFirefox) {
        return browser.storage;
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage;
    }
    throw new Error('No storage API available');
})();

/**
 * 从存储中获取值 (兼容 Chrome 和 Firefox)
 * @param {string[]} keys - 要获取的键数组
 * @returns {Promise<Object>} 结果对象
 */
export function storageGet(keys) {
    return new Promise((resolve) => {
        if (isFirefox) {
            // Firefox 使用 Promise
            browserStorage.sync.get(keys).then(resolve).catch(() => resolve({}));
        } else {
            // Chrome 使用 callback
            browserStorage.sync.get(keys, (result) => {
                resolve(result || {});
            });
        }
    });
}

/**
 * 向存储中设置值 (兼容 Chrome 和 Firefox)
 * @param {Object} items - 要设置的键值对
 * @returns {Promise<void>}
 */
export function storageSet(items) {
    return new Promise((resolve) => {
        if (isFirefox) {
            browserStorage.sync.set(items).then(resolve).catch(resolve);
        } else {
            browserStorage.sync.set(items, resolve);
        }
    });
}

/**
 * 从存储中移除值 (兼容 Chrome 和 Firefox)
 * @param {string[]} keys - 要移除的键数组
 * @returns {Promise<void>}
 */
export function storageRemove(keys) {
    return new Promise((resolve) => {
        if (isFirefox) {
            browserStorage.sync.remove(keys).then(resolve).catch(resolve);
        } else {
            browserStorage.sync.remove(keys, resolve);
        }
    });
}

/**
 * 初始化 API_BASE
 * @param {string} storageKey - 存储键名
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string>} API 地址
 */
export async function initApiBaseFromStorage(storageKey, defaultValue) {
    const result = await storageGet([storageKey]);
    return result[storageKey] || defaultValue;
}

/**
 * 获取扩展资源 URL
 * @param {string} path - 资源路径
 * @returns {string} 完整 URL
 */
export function getExtensionUrl(path) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
    }
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        return browser.runtime.getURL(path);
    }
    return path;
}

/**
 * 监听存储变化
 * @param {string} key - 要监听的键
 * @param {Function} callback - 变化回调 (newValue) => void
 */
export function onStorageChange(key, callback) {
    browserStorage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes[key]) {
            callback(changes[key].newValue);
        }
    });
}
