/**
 * 共享 CSS 样式
 * @module shared/styles
 */

/**
 * 问号按钮的基础样式（用于内容脚本）
 */
export const BUTTON_STYLES = `
/* 问号按钮样式 */
#bili-qmr-btn {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    margin-right: 20px;
    color: #61666d;
    transition: color 0.3s;
    user-select: none;
}

#bili-qmr-btn:hover {
    color: #00aeec;
    transform: translateY(-1px);
}

#bili-qmr-btn.voted {
    color: #00aeec;
}

.qmr-icon-wrap {
    display: flex;
    align-items: center;
}

.qmr-text {
    font-size: 13px;
}
`;

/**
 * 面板样式（统一为插件版样式）
 */
export const PANEL_STYLES = `
/* CSS 变量 */
#bili-qmr-panel {
    --primary-color: #00aeec;
    --primary-hover: #00a1d6;
    --bg-color: #f1f2f3;
    --card-bg: #ffffff;
    --text-main: #18191c;
    --text-secondary: #9499a0;
    --border-color: #e3e5e7;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 8px 16px rgba(0, 0, 0, 0.08);
    --radius-md: 12px;
    --font-stack: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 暗色模式 */
#bili-qmr-panel.dark-mode {
    --bg-color: #0f0f11;
    --card-bg: #1f2023;
    --text-main: #ffffff;
    --text-secondary: #a0a0a0;
    --border-color: #2f3035;
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 8px 16px rgba(0, 0, 0, 0.4);
}

#bili-qmr-panel.dark-mode .qmr-header {
    background: rgba(31, 32, 35, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tabs {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .tab-btn.active {
    background: #2a2b30;
    color: var(--primary-color);
}

#bili-qmr-panel.dark-mode .settings-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

#bili-qmr-panel.dark-mode .item:hover {
    border-color: rgba(0, 174, 236, 0.3);
}

#bili-qmr-panel.dark-mode .count {
    background: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .radio-item {
    background: #1f2023;
}

#bili-qmr-panel.dark-mode .radio-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

#bili-qmr-panel.dark-mode .advanced-section,
#bili-qmr-panel.dark-mode .advanced-toggle {
    background: var(--card-bg);
    border-color: var(--border-color);
}

#bili-qmr-panel.dark-mode .endpoint-input {
    background: rgba(0, 0, 0, 0.2);
    border-color: var(--border-color);
    color: var(--text-main);
}

#bili-qmr-panel.dark-mode .reset-btn {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--border-color);
    color: var(--text-main);
}

#bili-qmr-panel.dark-mode .settings-footer {
    background: rgba(31, 32, 35, 0.9);
    border-top-color: rgba(255, 255, 255, 0.05);
}

/* 面板容器 */
#bili-qmr-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 360px;
    max-height: calc(100vh - 160px);
    background-color: var(--bg-color);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 100000;
    font-family: var(--font-stack);
    display: none;
    overflow: hidden;
    flex-direction: column;
    color: var(--text-main);
    animation: qmr-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

#bili-qmr-panel.show {
    display: flex;
}

@keyframes qmr-slideIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

#bili-qmr-panel.qmr-dragging,
#bili-qmr-panel.qmr-dragged {
    animation: none;
    transition: none;
}

/* Header */
#bili-qmr-panel .qmr-header {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
    user-select: none;
}

#bili-qmr-panel .qmr-header:active {
    cursor: grabbing;
}

#bili-qmr-panel .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

#bili-qmr-panel .qmr-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #00aeec 0%, #0077aa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

#bili-qmr-panel .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

#bili-qmr-panel .settings-btn {
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: none;
}

#bili-qmr-panel .settings-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    transform: rotate(90deg);
}

#bili-qmr-panel .qmr-close {
    cursor: pointer;
    font-size: 20px;
    color: var(--text-secondary);
    transition: all 0.2s;
    border: none;
    background: none;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

#bili-qmr-panel .qmr-close:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-main);
}

/* Tabs */
#bili-qmr-panel .tabs {
    display: flex;
    background: #f1f2f3;
    padding: 4px;
    margin: 0 16px;
    border-radius: 10px;
    gap: 4px;
}

#bili-qmr-panel .tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 6px 0;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.2s ease;
}

#bili-qmr-panel .tab-btn:hover {
    color: var(--text-main);
    background: rgba(0, 0, 0, 0.03);
}

#bili-qmr-panel .tab-btn.active {
    background: #fff;
    color: var(--primary-color);
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* Content */
#bili-qmr-panel .content-panel {
    padding: 16px;
    flex: 1;
    overflow-y: auto;
    max-height: 450px;
}

#bili-qmr-panel .content-panel::-webkit-scrollbar {
    width: 6px;
}

#bili-qmr-panel .content-panel::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 3px;
}

/* Item */
#bili-qmr-panel .item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--card-bg);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

#bili-qmr-panel .item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: rgba(0, 174, 236, 0.2);
}

#bili-qmr-panel .rank {
    font-size: 18px;
    font-weight: 800;
    color: #c0c4cc;
    width: 32px;
    font-style: italic;
    text-align: center;
}

#bili-qmr-panel .item:nth-child(1) .rank {
    color: #FF4D4F;
    text-shadow: 0 2px 4px rgba(255, 77, 79, 0.2);
}

#bili-qmr-panel .item:nth-child(2) .rank {
    color: #FF9500;
    text-shadow: 0 2px 4px rgba(255, 149, 0, 0.2);
}

#bili-qmr-panel .item:nth-child(3) .rank {
    color: #FFCC00;
    text-shadow: 0 2px 4px rgba(255, 204, 0, 0.2);
}

#bili-qmr-panel .rank.rank-custom {
    font-size: 18px;
    font-weight: 900;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 1px;
    transform: translateX(-2px);
}

#bili-qmr-panel .info {
    flex: 1;
    margin-left: 12px;
    overflow: hidden;
}

#bili-qmr-panel .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    text-decoration: none;
    margin-bottom: 4px;
    transition: color 0.2s;
}

#bili-qmr-panel .title:hover {
    color: var(--primary-color);
}

#bili-qmr-panel .count {
    font-size: 12px;
    color: var(--text-secondary);
    display: inline-block;
    background: #f6f7f8;
    padding: 2px 8px;
    border-radius: 4px;
}

#bili-qmr-panel .loading {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
    font-size: 14px;
}

/* Settings */
#bili-qmr-panel .settings-wrapper {
    display: none;
    flex-direction: column;
    max-height: 450px;
    flex: 1;
    padding-bottom: 70px;
}

#bili-qmr-panel .settings-wrapper.show {
    display: flex;
}

#bili-qmr-panel .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

#bili-qmr-panel .settings-section {
    background: var(--card-bg);
    border-radius: var(--radius-md);
    padding: 20px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 16px;
}

#bili-qmr-panel .settings-section h3 {
    font-size: 16px;
    color: var(--text-main);
    margin: 0 0 6px 0;
    font-weight: 600;
}

#bili-qmr-panel .settings-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
}

#bili-qmr-panel .radio-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#bili-qmr-panel .radio-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
    background: #fff;
}

#bili-qmr-panel .radio-item:hover {
    background-color: #fafafa;
    border-color: var(--primary-color);
}

#bili-qmr-panel .radio-item:has(input:checked) {
    background-color: rgba(0, 174, 236, 0.05);
    border-color: var(--primary-color);
}

#bili-qmr-panel .radio-item input[type="radio"] {
    margin: 0 12px 0 0;
    cursor: pointer;
    accent-color: var(--primary-color);
}

#bili-qmr-panel .radio-item span {
    font-size: 14px;
    color: var(--text-main);
}

/* Advanced Section */
#bili-qmr-panel .advanced-section {
    margin-top: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: #fff;
}

#bili-qmr-panel .advanced-toggle {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-main);
    user-select: none;
    list-style: none;
}

#bili-qmr-panel .advanced-toggle::-webkit-details-marker {
    display: none;
}

#bili-qmr-panel .advanced-toggle::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-right: 2px solid var(--text-secondary);
    border-bottom: 2px solid var(--text-secondary);
    transform: rotate(-45deg);
    margin-right: 12px;
    transition: transform 0.2s;
}

#bili-qmr-panel .advanced-section[open] .advanced-toggle::before {
    transform: rotate(45deg);
}

#bili-qmr-panel .endpoint-input-group {
    display: flex;
    gap: 10px;
    align-items: stretch;
}

#bili-qmr-panel .endpoint-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-main);
    outline: none;
    background: #fafafa;
}

#bili-qmr-panel .endpoint-input:focus {
    background: #fff;
    border-color: var(--primary-color);
}

#bili-qmr-panel .reset-btn {
    width: 40px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: #fff;
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Settings Footer */
#bili-qmr-panel .settings-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 16px;
    border-top: 1px solid var(--border-color);
}

#bili-qmr-panel .save-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #00aeec 0%, #009cd6 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}

#bili-qmr-panel .save-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 174, 236, 0.4);
}

#bili-qmr-panel .save-status {
    text-align: center;
    font-size: 13px;
    color: var(--primary-color);
    margin-top: 10px;
    opacity: 0;
    transition: opacity 0.3s;
}
`;

/**
 * 独立排行榜页面的样式
 */
export const LEADERBOARD_PAGE_STYLES = `
:root {
    /* 默认浅色模式 */
    --bg-color: #f6f7f8;
    --card-bg: #ffffff;
    --card-border: rgba(0, 0, 0, 0.06);
    --card-hover-bg: #ffffff;
    --primary-color: #00aeec;
    --text-primary: #18191c;
    --text-secondary: #9499a0;
    --accent-glow: rgba(0, 174, 236, 0.15);
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

    --scroll-track: #f6f7f8;
    --scroll-thumb: #c1c1c1;
    --scroll-thumb-hover: #a8a8a8;

    --rank-badge-color: rgba(0, 0, 0, 0.05);
    --rank-badge-hover: rgba(0, 174, 236, 0.1);

    --mesh-color-1: rgba(0, 174, 236, 0.05);
    --mesh-color-2: rgba(255, 102, 153, 0.04);

    --tab-container-bg: rgba(0, 0, 0, 0.04);
    --tab-hover-bg: rgba(0, 0, 0, 0.05);
}

/* 黑暗模式 */
body.dark-mode {
    --bg-color: #0f0f11;
    --card-bg: rgba(255, 255, 255, 0.03);
    --card-border: rgba(255, 255, 255, 0.08);
    --card-hover-bg: rgba(255, 255, 255, 0.06);
    --primary-color: #00aeec;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --accent-glow: rgba(0, 174, 236, 0.3);

    --scroll-track: #0f0f11;
    --scroll-thumb: #333;
    --scroll-thumb-hover: #555;

    --rank-badge-color: rgba(255, 255, 255, 0.1);
    --rank-badge-hover: rgba(0, 174, 236, 0.15);

    --mesh-color-1: rgba(0, 174, 236, 0.08);
    --mesh-color-2: rgba(255, 102, 153, 0.06);

    --tab-container-bg: rgba(255, 255, 255, 0.05);
    --tab-hover-bg: rgba(255, 255, 255, 0.05);
}

/* 切换按钮 */
.theme-toggle-btn {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 20px;
}

.theme-toggle-btn:hover {
    background: var(--tab-hover-bg);
}

body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: var(--font-family);
    min-height: 100vh;
    overflow-x: hidden;
}

/* 背景网格 */
.background-mesh {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    background:
        radial-gradient(circle at 10% 20%, var(--mesh-color-1) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, var(--mesh-color-2) 0%, transparent 40%);
    pointer-events: none;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
}

/* Header */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 60px;
    flex-wrap: wrap;
    gap: 20px;
}

.logo-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.logo-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    animation: float 3s ease-in-out infinite;
}

.logo-section h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
}

.highlight {
    background: linear-gradient(135deg, #00aeec 0%, #ff6699 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0.9;
}

/* 选项卡 */
.time-range-tabs {
    display: flex;
    background: var(--tab-container-bg);
    padding: 4px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid var(--card-border);
}

.tab-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 10px 24px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s ease;
    font-family: var(--font-family);
}

.tab-btn:hover {
    color: var(--text-primary);
    background: var(--tab-hover-bg);
}

.tab-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}

/* 网格布局 */
.leaderboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    perspective: 1000px;
}

/* 卡片 */
.video-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-decoration: none;
    color: var(--text-primary);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(20px);
    cursor: pointer;
}

.video-card:hover {
    transform: translateY(-5px) scale(1.02);
    background: var(--card-hover-bg);
    border-color: rgba(0, 174, 236, 0.3);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
}

.video-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #00aeec, #ff6699);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.video-card:hover::before {
    opacity: 1;
}


.video-card {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.thumb-container {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    overflow: hidden;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.2);
}

.thumb-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.video-card:hover .thumb-img {
    transform: scale(1.05);
}

.card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow: hidden; /* 防止内容移除 */
}

.card-header-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    z-index: 2;
}

.score-tag {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.qml-icon {
    color: #4facfe;
}

.rank-badge {
    position: absolute;
    top: 4px;
    left: 8px;
    right: auto;
    font-size: 2.5rem;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 3;
    font-style: italic;
    font-family: 'Impact', sans-serif;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
}


.rank-1,
.rank-2,
.rank-3 {
    font-size: 1.8rem;
    font-style: normal;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    color: #fff;
    background-size: cover;
    background-position: center;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.4);
}

.rank-1 {
    background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%);
    /* Gold */
    font-size: 2rem;
}

.rank-2 {
    background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
    /* Silver */
}

.rank-3 {
    background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
    /* Bronze */
}

.rank-badge.rank-custom-text {
    font-size: 1rem;
    line-height: 1.1;
    letter-spacing: -1px;
    color: #FF4D4F;
    /* Red color for custom text */
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
    /* Lighter shadow for contrast against gold */
}

.rank-1::after {
    content: '👑';
    position: absolute;
    top: -16px;
    left: 30%;
    transform: translateX(-50%) rotate(-15deg);
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.video-title {
    font-size: 1rem;
    line-height: 1.4;
    margin-bottom: 4px;
    font-weight: 500;
}

.video-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: auto;
}

.owner-info {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
}

.owner-icon {
    font-size: 0.8rem;
    opacity: 0.8;
}

.owner-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 100px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.video-card:hover .video-title {
    color: var(--primary-color);
}


/* Loading & Animation */
.loading-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--text-secondary);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-5px);
    }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--scroll-track);
}

::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--scroll-thumb-hover);
}

/* Responsive */
@media (max-width: 768px) {
    header {
        flex-direction: column;
        align-items: flex-start;
    }

    .time-range-tabs {
        width: 100%;
        overflow-x: auto;
    }

    .tab-btn {
        flex: 1;
        white-space: nowrap;
    }
}
`;
