const DEFAULT_API_BASE = 'https://bili-qml.bydfk.com/api';
// for debug
//const DEFAULT_API_BASE = 'http://localhost:3000/api'

const browserStorage = (function () {
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
  return new Promise((resolve) => {
    browserStorage.sync.get([STORAGE_KEY_API_ENDPOINT], (result) => {
      if (result[STORAGE_KEY_API_ENDPOINT]) {
        API_BASE = result[STORAGE_KEY_API_ENDPOINT];
      }
      resolve();
    });
  });
}

// 监听存储变化
browserStorage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEY_API_ENDPOINT]) {
    API_BASE = changes[STORAGE_KEY_API_ENDPOINT].newValue || DEFAULT_API_BASE;
  }
});

// ==================== Altcha CAPTCHA 功能 ====================

// 获取 Altcha 挑战
async function fetchAltchaChallenge() {
  const response = await fetch(`${API_BASE}/altcha/challenge`);
  if (!response.ok) throw new Error('Failed to fetch challenge');
  return response.json();
}

// 解决 Altcha 挑战 (Proof-of-Work)
async function solveAltchaChallenge(challenge) {
  const { algorithm, challenge: challengeHash, salt, maxnumber, signature } = challenge;

  // 使用 Web Crypto API 进行 SHA-256 哈希
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

// 显示 Altcha CAPTCHA 对话框
function showAltchaCaptchaDialog() {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.id = 'qmr-captcha-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 999999;
      display: flex; align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--bg-color); border-radius: 12px; padding: 24px;
      width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      text-align: center;
    `;

    dialog.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
      <div style="font-size: 18px; font-weight: bold; color: var(--text-main); margin-bottom: 12px;">
        人机验证
      </div>
      <div id="qmr-captcha-status" style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
        检测到频繁操作，请完成验证
      </div>
      <div id="qmr-captcha-progress" style="display: none; margin-bottom: 20px;">
        <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
          <div id="qmr-captcha-bar" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s;"></div>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">正在验证中...</div>
      </div>
      <div id="qmr-captcha-buttons">
        <button id="qmr-captcha-start" type="button" style="
          padding: 10px 32px; border: none; border-radius: 6px;
          background: var(--primary-color); color: white; cursor: pointer;
          font-size: 14px; transition: all 0.2s;
        ">
          开始验证
        </button>
        <button id="qmr-captcha-cancel" type="button" style="
          padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 6px;
          background: var(--card-bg); color: var(--text-main); cursor: pointer;
          font-size: 14px; margin-left: 12px; transition: all 0.2s;
        ">
          取消
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const startBtn = dialog.querySelector('#qmr-captcha-start');
    const cancelBtn = dialog.querySelector('#qmr-captcha-cancel');
    const statusDiv = dialog.querySelector('#qmr-captcha-status');
    const progressDiv = dialog.querySelector('#qmr-captcha-progress');
    const buttonsDiv = dialog.querySelector('#qmr-captcha-buttons');

    startBtn.addEventListener('mouseenter', () => startBtn.style.background = 'var(--primary-hover)');
    startBtn.addEventListener('mouseleave', () => startBtn.style.background = 'var(--primary-color)');

    cancelBtn.onclick = () => {
      overlay.remove();
      reject(new Error('CAPTCHA cancelled'));
    };

    startBtn.onclick = async () => {
      try {
        buttonsDiv.style.display = 'none';
        progressDiv.style.display = 'block';
        statusDiv.textContent = '正在获取验证挑战...';

        const challenge = await fetchAltchaChallenge();
        statusDiv.textContent = '正在计算验证...';

        // 模拟进度（实际进度难以精确计算）
        const progressBar = dialog.querySelector('#qmr-captcha-bar');
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 15, 95);
          progressBar.style.width = progress + '%';
        }, 200);

        const solution = await solveAltchaChallenge(challenge);

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        statusDiv.textContent = '验证成功！';

        setTimeout(() => {
          overlay.remove();
          resolve(solution);
        }, 500);
      } catch (error) {
        statusDiv.textContent = '验证失败: ' + error.message;
        statusDiv.style.color = '#ff4d4f';
        buttonsDiv.style.display = 'block';
        progressDiv.style.display = 'none';
      }
    };

    // ESC 键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        reject(new Error('CAPTCHA cancelled'));
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

