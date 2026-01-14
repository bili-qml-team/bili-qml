/**
 * 排行榜渲染逻辑
 * @module shared/leaderboard
 */

import { formatCount, escapeHtml } from './utils.js';
import { fetchLeaderboard, fetchVideoInfo } from './api.js';

/**
 * 创建简化版排行榜列表项 HTML（用于弹窗面板）
 * @param {Object} item - 排行榜项目
 * @param {number} rank - 排名
 * @param {string} title - 视频标题
 * @param {boolean} rank1Custom - 是否使用自定义第一名显示
 * @returns {string} HTML 字符串
 */
export function createLeaderboardItemHTML(item, rank, title, rank1Custom = true) {
    let rankDisplay = rank;
    let rankClass = 'rank';

    if (rank === 1 && rank1Custom) {
        rankDisplay = '何一位';
        rankClass += ' rank-custom';
    }

    const safeTitle = escapeHtml(title);
    const safeBvid = escapeHtml(item.bvid);
    const safeCount = escapeHtml(String(item.count));

    return `
        <div class="item">
            <div class="${rankClass}">${rankDisplay}</div>
            <div class="info">
                <a href="https://www.bilibili.com/video/${safeBvid}" target="_blank" class="title" title="${safeTitle}">${safeTitle}</a>
                <div class="count">❓ 抽象指数: ${safeCount}</div>
            </div>
        </div>
    `;
}

/**
 * 创建视频卡片 HTML（用于独立排行榜页面）
 * @param {Object} item - 排行榜项目 {bvid, count}
 * @param {number} rank - 排名
 * @param {Object} details - 视频详情 {title, pic, ownerName, view, danmaku}
 * @param {boolean} rank1Custom - 是否使用自定义第一名显示
 * @returns {string} HTML 字符串
 */
export function createVideoCardHTML(item, rank, details, rank1Custom = true) {
    let rankDisplay = rank <= 3 ? rank : `#${rank}`;
    let rankClass = rank <= 3 ? `rank-${rank}` : '';

    if (rank === 1 && rank1Custom) {
        rankDisplay = '何一位';
        rankClass += ' rank-custom-text';
    }

    const safeTitle = escapeHtml(details.title || '未知标题');
    const picUrl = details.pic ? details.pic.replace('http:', 'https:') : '';
    const ownerName = escapeHtml(details.ownerName || '未知UP');
    const viewText = details.view != null ? formatCount(details.view) : '-';
    const danmakuText = details.danmaku != null ? formatCount(details.danmaku) : '-';

    return `
        <a href="https://www.bilibili.com/video/${item.bvid}" target="_blank" class="video-card">
            <div class="thumb-container">
                ${picUrl ? `<img src="${picUrl}" alt="${safeTitle}" class="thumb-img" loading="lazy" />` : ''}
                <span class="rank-badge ${rankClass}">${rankDisplay}</span>
                <div class="card-header-overlay">
                    <div class="score-tag">
                        <span class="qml-icon">❓</span> ${item.count}
                    </div>
                </div>
            </div>
            
            <div class="card-content">
                <h3 class="video-title" title="${safeTitle}">${safeTitle}</h3>
                
                <div class="video-info-row">
                    <div class="owner-info">
                        <span class="owner-icon">UP</span>
                        <span class="owner-name" title="${ownerName}">${ownerName}</span>
                    </div>
                </div>
                
                <div class="video-info-row" style="margin-top: 4px;">
                    <div class="stat-item" title="播放量">
                        <span>▶</span> ${viewText}
                    </div>
                    <div class="stat-item" title="弹幕数">
                        <span>💬</span> ${danmakuText}
                    </div>
                </div>
            </div>
        </a>
    `;
}

/**
 * 渲染简化版排行榜（用于弹窗面板）
 * @param {HTMLElement} container - 容器元素
 * @param {Array} list - 排行榜数据
 * @param {Object} options - 配置选项
 * @param {boolean} options.rank1Custom - 是否使用自定义第一名显示
 */
export async function renderSimpleLeaderboard(container, list, options = {}) {
    const { rank1Custom = true, fetchImpl = fetch } = options;

    container.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const items = await Promise.all(list.map(async (item, index) => {
            let title = '加载中...';
            try {
                const info = await fetchVideoInfo(item.bvid, fetchImpl);
                if (info?.title) {
                    title = info.title;
                }
            } catch (e) {
                title = `Video ${item.bvid}`;
            }
            return createLeaderboardItemHTML(item, index + 1, title, rank1Custom);
        }));

        container.innerHTML = items.join('');
    } catch (e) {
        container.innerHTML = '<div class="loading">加载失败</div>';
    }
}

/**
 * 渲染完整版排行榜（用于独立页面）
 * @param {HTMLElement} container - 容器元素
 * @param {Array} list - 排行榜数据
 * @param {Object} options - 配置选项
 * @param {boolean} options.rank1Custom - 是否使用自定义第一名显示
 * @param {boolean} options.animate - 是否启用动画
 */
export async function renderFullLeaderboard(container, list, options = {}) {
    const { rank1Custom = true, animate = true, fetchImpl = fetch } = options;

    const items = await Promise.all(list.map(async (item, index) => {
        let details = {
            title: '加载中...',
            pic: '',
            ownerName: '',
            view: null,
            danmaku: null
        };

        try {
            const info = await fetchVideoInfo(item.bvid, fetchImpl);
            if (info) {
                details.title = info.title || '未知标题';
                details.pic = info.pic;
                details.ownerName = info.owner?.name;
                details.view = info.stat?.view;
                details.danmaku = info.stat?.danmaku;
            }
        } catch (e) {
            details.title = `Video ${item.bvid}`;
        }

        return createVideoCardHTML(item, index + 1, details, rank1Custom);
    }));

    container.innerHTML = items.join('');

    // 入场动画
    if (animate) {
        const cards = container.querySelectorAll('.video-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 50);
        });
    }
}
