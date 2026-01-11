document.addEventListener('DOMContentLoaded', async () => {
    browserStorage.sync.get(['theme'], (result) => {
        if (result.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    });

    browserStorage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.theme) {
            if (changes.theme.newValue === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            browserStorage.sync.set({ theme: isDark ? 'dark' : 'light' });
        });
    }

    await initApiBase();

    const startBtn = document.getElementById('start-test-btn');
    const resultArea = document.getElementById('result-area');

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.textContent = '测试进行中...';
            resultArea.style.display = 'none';
            resultArea.textContent = '';
            resultArea.className = '';

            try {
                const solution = await showAltchaCaptchaDialog();

                resultArea.innerHTML = `
                    <div class="status-verified">✅ 验证成功!</div>
                    <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                        <strong>Payload:</strong><br>
                        ${solution}
                    </div>
                `;
                resultArea.style.display = 'block';
            } catch (error) {
                console.error('Altcha test failed:', error);
                resultArea.innerHTML = `
                    <div class="status-error">❌ 验证失败/取消</div>
                    <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                        ${error.message}
                    </div>
                `;
                resultArea.style.display = 'block';
            } finally {
                startBtn.disabled = false;
                startBtn.textContent = '开始验证测试';
            }
        });
    }
});
