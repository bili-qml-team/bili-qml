/**
 * 弹幕发送功能
 * @module shared/danmaku
 */

import { SELECTORS } from './constants.js';
import { findFirst, wait } from './utils.js';

/**
 * 模拟发送弹幕
 * @param {string} text - 弹幕文本
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendDanmaku(text) {
    console.log('[B站问号榜] 尝试发送弹幕:', text);

    // 1. 寻找弹幕输入框和发送按钮
    const dmInput = findFirst(SELECTORS.DANMAKU_INPUT);
    const dmSendBtn = findFirst(SELECTORS.DANMAKU_SEND_BTN);

    if (!dmInput || !dmSendBtn) {
        console.error('[B站问号榜] 未找到弹幕输入框或发送按钮');
        return false;
    }

    try {
        // 2. 聚焦输入框
        dmInput.focus();
        dmInput.click();

        // 3. 填入内容并让 React 感知
        // React 重写了 value setter，必须获取原始 setter
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set || Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set;

        if (setter) {
            setter.call(dmInput, text);
        } else {
            dmInput.value = text;
        }

        // 4. 模拟完整输入事件链
        dmInput.dispatchEvent(new Event('input', { bubbles: true }));
        dmInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 模拟中文输入法结束事件
        dmInput.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        dmInput.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));

        // 5. 顺序尝试发送方案
        await wait(100);

        // --- 方案1: 回车键 ---
        console.log('[B站问号榜] 尝试方案1: 回车发送');
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
        });
        dmInput.dispatchEvent(enterEvent);

        await wait(1000);

        if (dmInput.value !== text) {
            console.log('[B站问号榜] 方案1生效，发送成功');
            dmInput.blur();
            return true;
        }

        // --- 方案2: 点击发送按钮 ---
        console.log('[B站问号榜] 方案1未奏效，尝试方案2: 点击按钮');
        dmSendBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        dmSendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        dmSendBtn.click();
        dmSendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        await wait(1000);

        if (dmInput.value !== text) {
            console.log('[B站问号榜] 方案2生效，发送成功');
            dmInput.blur();
            return true;
        }

        // --- 方案3: 强制点击 ---
        console.log('[B站问号榜] 方案2未奏效，尝试方案3: 强制点击');
        dmSendBtn.click();

        // 6. 清理
        setTimeout(() => {
            if (dmInput.value === text) {
                console.warn('[B站问号榜] 所有方案尝试完毕，似乎仍未发送成功');
            }
            dmInput.blur();
        }, 200);

        return dmInput.value !== text;
    } catch (e) {
        console.error('[B站问号榜] 弹幕发送异常:', e);
        return false;
    }
}
