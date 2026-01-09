<p align="center">
  <img src="src/bili-qml-extension/icons/button-icon.png" width="100" height="100" alt="Bilibili Q-Mark List Logo">
</p>

<h1 align="center">B站问号榜 (Bilibili Question-Mark Leaderboard)</h1>

<p align="center">
  <a href="README.md">中文</a> | <a href="#english-version">English</a>
</p>

<p align="center">
  <strong>分享抽象的视频，自动同步弹幕，打造Bilibili的抽象视频排行榜。</strong>
</p>

---

## 功能概述

-   **问号点亮**：在B站视频工具栏增加专属“问号”按钮，如果你觉得这个视频值得你发一个“？”，那么就点亮它。
-   **弹幕联动**：点亮问号时，自动在当前视频发送一条内容为“？”的弹幕。
-   **实时榜单**：点击插件图标，即可查看今日、本周及本月最“抽象”的视频排行。

---

## 快速开始

### 方法 1：使用chrome/edge插件市场安装 (最简单)
* [Chrome 插件市场](https://chromewebstore.google.com/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/kpfomdjnloglfedoamjaflnhojkcjndh?hl=zh-c)
* [Edge 插件市场](https://microsoftedge.microsoft.com/addons/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/fnlcdhaoobciclcjlnlopbcncmhjkdog)

如果不会从插件市场安装，可以查看操作步骤：https://www.bilibili.com/video/BV1zJiGBREPB/


### 方法 2：加载已解压的扩展程序
操作步骤见链接 https://www.bilibili.com/opus/1154715533972602918

---

## TODO

- [x] debug-1: 修改下滑时图标未合理隐藏的问题
- [x] debug-2: 修改同时唤起转发小窗的问题。感谢B站用户 Logmeinu 指出问题

- [x] support-1: 上架Chrome应用商店
- [x] support-2: 支持 Firefox
- [ ] support-3: 支持Bilibili桌面端
- [x] support-4: 支持油猴脚本，Mac用户可以通过油猴脚本使用插件
- [x] support-5: 上架edge应用商店

- [ ] new feature-1: 频繁vote时增加人机验证，感谢B站用户 巧克力棒好好吃啊qwq 的建议
- [ ] new feature-2: 将榜单制作为一个独立的页面，方便用户查看和分享 [*on work*]
- [x] new feature-3: 由用户决定是否发送？弹幕

---

<a name="english-version"></a>

## 🌟 English Version

### Description
A browser extension that adds a "Question Mark" button to Bilibili video toolbars. It tracks "abstract" scores and syncs with live Danmaku.

### Features
-   **Interactive Button**: Light up the "?" to vote for a video.
-   **Auto Danmaku**: Automatically sends a "?" Danmaku when you vote.
-   **Leaderboard**: Check the most "abstract" videos of the day/week.
-   **Data Sync**: Bound to your Bilibili UID for permanent record tracking.

### How to Install
1.  Download and unzip this repository.
2.  Go to `chrome://extensions/` in your browser.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked** and select the `src/extension` folder.

---

## 🛠 技术栈

-   **Frontend**: HTML, CSS (Bilibili Style), JavaScript (Chrome Extension API)
-   **Backend**: Node.js (Express)

## 🤝 贡献与反馈

欢迎提交 Issues 或 Pull Request！

本人并非计算机专业出身，写点代码只是业余爱好，技术能力和投入时间都有待提升。欢迎各位技术大佬共建！

如果你喜欢这个项目，请给个 ⭐ **Star** 鼓励一下我吧 OwO~

---

## 🔒 隐私政策 (Privacy Policy)

本插件极其重视用户隐私，在上架 Chrome 应用商店前已通过严格的安全自查：

1.  **信息收集**：本插件仅提取 B 站公开的 `DedeUserID` (UID) 作为点亮问号的唯一识别符。我们**不收集**、**不读取**、**不传输**您的 B 站账号密码、SESSDATA 等任何敏感登录凭证。
2.  **数据用途**：收集的 UID 仅用于统计视频的问号数值、同步您的点亮状态以及生成排行榜，不会用于任何商业用途。
3.  **权限声明**：插件申请的 `cookies` 权限仅用于读取登录状态，申请的域名访问权限仅限于 `bilibili.com` 和插件后端 API。
4.  **第三方共享**：我们承诺不会将任何用户数据共享给第三方。
