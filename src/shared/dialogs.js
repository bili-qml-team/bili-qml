/**
 * 对话框 UI 组件
 * @module shared/dialogs
 */

import { fetchAltchaChallenge, solveAltchaChallenge } from './altcha.js';

/**
 * 显示 Altcha CAPTCHA 对话框
 * @param {string} apiBase - API 基础地址
 * @param {Function} [fetchImpl=fetch] - fetch 实现
 * @returns {Promise<string>} 验证成功后返回 solution
 */
export function showAltchaCaptchaDialog(apiBase, fetchImpl = fetch) {
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
            background: white; border-radius: 12px; padding: 24px;
            width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            text-align: center;
        `;

        dialog.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
            <div style="font-size: 18px; font-weight: bold; color: #18191c; margin-bottom: 12px;">
                人机验证
            </div>
            <div id="qmr-captcha-status" style="font-size: 14px; color: #61666d; margin-bottom: 20px;">
                检测到频繁操作，请完成验证
            </div>
            <div id="qmr-captcha-progress" style="display: none; margin-bottom: 20px;">
                <div style="width: 100%; height: 6px; background: #e3e5e7; border-radius: 3px; overflow: hidden;">
                    <div id="qmr-captcha-bar" style="width: 0%; height: 100%; background: #00aeec; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 12px; color: #9499a0; margin-top: 8px;">正在验证中...</div>
            </div>
            <div id="qmr-captcha-buttons">
                <button id="qmr-captcha-start" type="button" style="
                    padding: 10px 32px; border: none; border-radius: 6px;
                    background: #00aeec; color: white; cursor: pointer;
                    font-size: 14px; transition: all 0.2s;
                ">
                    开始验证
                </button>
                <button id="qmr-captcha-cancel" type="button" style="
                    padding: 10px 20px; border: 1px solid #e3e5e7; border-radius: 6px;
                    background: white; color: #61666d; cursor: pointer;
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

        // 悬停效果
        startBtn.addEventListener('mouseenter', () => startBtn.style.background = '#00a1d6');
        startBtn.addEventListener('mouseleave', () => startBtn.style.background = '#00aeec');

        const cleanup = () => {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        };

        cancelBtn.onclick = () => {
            cleanup();
            reject(new Error('CAPTCHA cancelled'));
        };

        startBtn.onclick = async () => {
            try {
                buttonsDiv.style.display = 'none';
                progressDiv.style.display = 'block';
                statusDiv.textContent = '正在获取验证挑战...';

                const challenge = await fetchAltchaChallenge(apiBase, fetchImpl);
                statusDiv.textContent = '正在计算验证...';

                // 模拟进度
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
                    cleanup();
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
                cleanup();
                reject(new Error('CAPTCHA cancelled'));
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

/**
 * 显示弹幕发送确认对话框
 * @returns {Promise<{sendDanmaku: boolean, dontAskAgain: boolean}>}
 */
export function showDanmakuConfirmDialog() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; border-radius: 8px; padding: 24px;
            width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        `;

        dialog.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; color: #18191c; margin-bottom: 16px;">
                发送弹幕确认
            </div>
            <div style="font-size: 14px; color: #61666d; margin-bottom: 20px;">
                点亮问号后是否自动发送"?"弹幕？
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="qmr-dont-ask" style="margin-right: 8px;">
                    <span style="font-size: 14px; color: #61666d;">不再询问（记住我的选择）</span>
                </label>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="qmr-btn-no" style="
                    padding: 8px 20px; border: 1px solid #e3e5e7; border-radius: 4px;
                    background: white; color: #61666d; cursor: pointer;
                    font-size: 14px; transition: all 0.2s;
                ">
                    不发送
                </button>
                <button id="qmr-btn-yes" style="
                    padding: 8px 20px; border: none; border-radius: 4px;
                    background: #00aeec; color: white; cursor: pointer;
                    font-size: 14px; transition: all 0.2s;
                ">
                    发送弹幕
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const btnNo = dialog.querySelector('#qmr-btn-no');
        const btnYes = dialog.querySelector('#qmr-btn-yes');

        // 悬停效果
        btnNo.addEventListener('mouseenter', () => btnNo.style.background = '#f4f5f7');
        btnNo.addEventListener('mouseleave', () => btnNo.style.background = 'white');
        btnYes.addEventListener('mouseenter', () => btnYes.style.background = '#00a1d6');
        btnYes.addEventListener('mouseleave', () => btnYes.style.background = '#00aeec');

        const cleanup = () => {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        };

        const handleChoice = (sendDanmaku) => {
            const dontAsk = dialog.querySelector('#qmr-dont-ask').checked;
            cleanup();
            resolve({ sendDanmaku, dontAskAgain: dontAsk });
        };

        btnNo.addEventListener('click', () => handleChoice(false));
        btnYes.addEventListener('click', () => handleChoice(true));

        // ESC 键关闭（默认不发送）
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve({ sendDanmaku: false, dontAskAgain: false });
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}
