import resolve from '@rollup/plugin-node-resolve';

const userscriptBanner = `// ==UserScript==
// @name         B站问号榜
// @namespace    https://github.com/bili-qml-team/bili-qml
// @version      1.2
// @description  在B站视频下方增加问号键，统计并展示抽象视频排行榜。
// @author       bili-qml-team
// @homepage     https://github.com/bili-qml-team/bili-qml
// @match        https://www.bilibili.com/video/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @license      AGPL-3.0
// @run-at       document-end
// ==/UserScript==
`;

export default [
    // 油猴脚本构建
    {
        input: 'src/bili-qml-tampermonkey/main.js',
        output: {
            file: 'src/bili-qml-tampermonkey/bili-qml.user.js',
            format: 'iife',
            banner: userscriptBanner,
            name: 'BiliQML'
        },
        plugins: [resolve()]
    },
    // 浏览器插件 content script 构建
    {
        input: 'src/bili-qml-extension/content.src.js',
        output: {
            file: 'src/bili-qml-extension/content.js',
            format: 'iife',
            name: 'BiliQMLContent'
        },
        plugins: [resolve()]
    },
    // 浏览器插件 popup script 构建
    {
        input: 'src/bili-qml-extension/popup.src.js',
        output: {
            file: 'src/bili-qml-extension/popup.js',
            format: 'iife',
            name: 'BiliQMLPopup'
        },
        plugins: [resolve()]
    },
    // 浏览器插件 leaderboard page script 构建
    {
        input: 'src/bili-qml-extension/leaderboard.src.js',
        output: {
            file: 'src/bili-qml-extension/leaderboard.js',
            format: 'iife',
            name: 'BiliQMLLeaderboard'
        },
        plugins: [resolve()]
    }
];
