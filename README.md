<p align="center">
  <img src="src/bili-qml-extension/icons/button-icon.png" width="100" height="100" alt="Bilibili Q-Mark List Logo">
</p>

<h1 align="center">B站问号榜 (Bilibili Question-Mark Leaderboard)</h1>

<p align="center">
  <a href="#-中文介绍">中文介绍</a> | <a href="README_EN.md">English Version</a>
</p>

<p align="center">
  <strong>分享抽象的视频，自动同步弹幕，打造Bilibili的抽象视频排行榜。</strong>
</p>

---

## 📖 中文介绍

### ✨ 核心功能

-   **❓ 问号点亮**：在 B 站视频工具栏增加专属“问号”按钮。如果你觉得这个视频很"抽象"（值得发"?"），就点亮它！
-   **💬 弹幕联动**：
    -   点亮问号时，自动在当前视频发送一条内容为“？”的弹幕。
    -   弹幕发送前支持二次确认，防止误触。
-   **🏆 实时榜单**：
    -   点击插件图标打开面板，查看 **实时**、**今日**、**本周** 及 **本月** 最“抽象”的视频排行。
    -   支持查看完整的独立榜单页面，方便分享。
-   **⚙️ 个性化设置**：
    -   **弹幕开关**：自由决定点击问号时是否自动发送弹幕。
    -   **API 自定义**：支持修改后端 API 地址(高级选项，普通用户不建议修改)

### 🚀 安装指南

本项目支持 **Chrome / Edge** (扩展程序)、**Firefox** (扩展程序) 和 **油猴脚本 (Tampermonkey)** 三种方式。

#### 1. Chrome / Edge 浏览器
**推荐方式：应用商店安装**
- [Chrome 应用商店](https://chromewebstore.google.com/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/kpfomdjnloglfedoamjaflnhojkcjndh?hl=zh-c)
- [Edge 应用商店](https://microsoftedge.microsoft.com/addons/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/fnlcdhaoobciclcjlnlopbcncmhjkdog)

**开发者模式安装 (最新版)**
1.  下载本项目源码并解压。
2.  打开 Chrome/Edge 扩展程序页面 (`chrome://extensions/` 或 `edge://extensions/`)。
3.  开启右上角的 **开发者模式**。
4.  点击 **加载已解压的扩展程序**，选择本项目中的 `src/bili-qml-extension` 目录。

#### 2. Firefox 浏览器
Firefox暂未上线扩展商店，暂时请使用开发者模式安装  
方法如下：
1.  下载本项目源码并解压。
2.  在 Firefox 地址栏输入 `about:debugging` 并回车。
3.  点击左侧的 **此 Firefox**。
4.  点击 **临时载入附加组件...**。
5.  选择本项目 `src/bili-qml-extension-firefox` 目录下的 `manifest.json` 文件。

#### 3. 油猴脚本 (Tampermonkey)
适用于所有支持油猴脚本的浏览器 (Chrome, Edge, Firefox, Safari 等)。
1.  确保浏览器已安装 Tampermonkey 扩展。
2.  点击链接安装：[正式版](https://github.com/bili-qml-team/bili-qml/raw/refs/heads/main/src/bili-qml-tampermonkey/bili-qml.user.js) 或 [测试版](https://github.com/bili-qml-team/bili-qml/raw/refs/heads/dev/src/bili-qml-tampermonkey/bili-qml.user.js)  

**请注意：油猴脚本的排行榜需要右键点击问号按钮开启。**

---

### 📅 开发计划 (TODO)

- [x] **已修复 (Fixed)**
    - 下滑时图标未合理隐藏的问题
    - 同时唤起转发小窗的问题 (Thanks to bilibili@Logmeinu)
- [x] **已支持 (Supported)**
    - 上架 Chrome 应用商店
    - 上架 Edge 应用商店
    - 支持 Firefox 浏览器
    - 支持 油猴脚本 (Tampermonkey)
- [x] **新特性 (Features)**
    - **人机验证 (Altcha)**: 防止滥用 (Thanks to bilibili@巧克力棒好好吃啊qwq)
    - **独立榜单页面**
    - **设置面板**: 自定义弹幕发送偏好、API 地址
- [ ] **待办 (Planned)**
    - 支持 Bilibili 桌面客户端
    - 代码结构优化与重构

---
## 🛠 技术栈

-   **Frontend**: HTML, CSS (Bilibili Style), JavaScript (Chrome Extension API)
-   **Backend**: Node.js (Express)

---

### 🤝 贡献与反馈

感谢以下大佬对本项目做出的贡献，每一位都是热心而高技术力的contributor，他们的贡献使得本项目变得更加完善和强大🎉

| 贡献者 | 贡献内容 |
| :---: | :--- |
| <a href="https://github.com/Radekyspec"><img src="https://github.com/Radekyspec.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>Radekyspec</b></sub></a> | 数据库迁移脚本、EO保护逻辑 |
| <a href="https://github.com/VanceHud"><img src="https://github.com/VanceHud.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>VanceHud</b></sub></a> | Firefox版本、油猴版本、设置面板功能、Altcha验证集成 |
| <a href="https://github.com/ShiroAzusa64"><img src="https://github.com/ShiroAzusa64.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>ShiroAzusa64</b></sub></a> | v1.2版本后端核心逻辑 |

参与贡献方式： 欢迎提交 Issues 或 Pull Request！

本人并非计算机专业出身，写点代码只是业余爱好，技术能力和投入时间都有待提升。欢迎各位技术大佬共建！

如果你喜欢这个项目，请给个 ⭐ **Star** 鼓励一下我吧 OwO~

---

## 🔒 隐私政策 (Privacy Policy)

本插件极其重视用户隐私，在上架 Chrome 应用商店前已通过严格的安全自查：

1.  **信息收集**：本插件仅提取 B 站公开的 `DedeUserID` (UID) 作为点亮问号的唯一识别符。我们**不收集**、**不读取**、**不传输**您的 B 站账号密码、SESSDATA 等任何敏感登录凭证。
2.  **数据用途**：收集的 UID 仅用于统计视频的问号数值、同步您的点亮状态以及生成排行榜，不会用于任何商业用途。
3.  **权限声明**：插件申请的 `cookies` 权限仅用于读取登录状态，申请的域名访问权限仅限于 `bilibili.com` 和插件后端 API。
4.  **第三方共享**：我们承诺不会将任何用户数据共享给第三方。