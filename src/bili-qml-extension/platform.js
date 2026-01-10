const DEFAULT_API_BASE = 'https://bili-qml.bydfk.com/api';
// for debug
//const DEFAULT_API_BASE = 'http://localhost:3000/api'

const browserStorage = (function() {
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage;
  }
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage;
  }
  throw new Error('No storage API available');
})();
const STORAGE_KEY_DANMAKU_PREF = 'danmakuPreference';
const STORAGE_KEY_API_ENDPOINT = 'apiEndpoint';

// 当前 API_BASE
let API_BASE = DEFAULT_API_BASE;

// 初始化 API_BASE
async function initApiBase() {
    return browserStorage.sync.get([STORAGE_KEY_API_ENDPOINT], (result) => {
        if (result[STORAGE_KEY_API_ENDPOINT]) {
            API_BASE = result[STORAGE_KEY_API_ENDPOINT];
        }
    });
}

// 监听存储变化
browserStorage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[STORAGE_KEY_API_ENDPOINT]) {
        API_BASE = changes[STORAGE_KEY_API_ENDPOINT].newValue || DEFAULT_API_BASE;
    }
});

