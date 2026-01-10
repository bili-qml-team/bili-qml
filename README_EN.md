<p align="center">
  <img src="src/bili-qml-extension/icons/button-icon.png" width="100" height="100" alt="Bilibili Q-Mark List Logo">
</p>

<h1 align="center">Bilibili Question-Mark Leaderboard</h1>

<p align="center">
  <a href="README.md">中文介绍</a> | <a href="README_EN.md">English Version</a>
</p>

<p align="center">
  <strong>Share "abstract" videos, automatically sync Danmaku, and build the Bilibili "abstract" video leaderboard.</strong>
</p>

---

## 📖 Introduction

### ✨ Key Features

-   **❓ Question Mark Button**: Adds a dedicated "?" button to the Bilibili video toolbar. If you find a video "abstract" (meme-worthy, confusing, or funny in a specific way), light it up!
-   **💬 Danmaku Sync**:
    -   When you light up the "?", a "?" Danmaku is automatically sent to the current video.
    -   Supports a confirmation dialog before sending to prevent accidental clicks.
-   **🏆 Live Leaderboard**:
    -   Click the extension icon to view the **Real-time**, **Daily**, **Weekly**, and **Monthly** most "abstract" video rankings.
    -   Supports viewing a full independent leaderboard page for easy sharing.
-   **⚙️ Personalization**:
    -   **Danmaku Toggle**: Choose whether to automatically send a Danmaku when clicking the button.
    -   **Custom API**: Supports modifying the backend API address (Advanced option, not recommended for normal users).

### 🚀 Installation Guide

This project supports **Chrome / Edge** (Extension), **Firefox** (Extension), and **Tampermonkey Userscript**.

#### 1. Chrome / Edge Browser
**Recommended: Install via Web Store**
- [Chrome Web Store](https://chromewebstore.google.com/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/kpfomdjnloglfedoamjaflnhojkcjndh?hl=zh-c)
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/b%E7%AB%99%E9%97%AE%E5%8F%B7%E6%A6%9C/fnlcdhaoobciclcjlnlopbcncmhjkdog)

**Developer Mode Installation (Latest Version)**
1.  Download and unzip the source code of this project.
2.  Open the extensions page in Chrome/Edge (`chrome://extensions/` or `edge://extensions/`).
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked** and select the `src/bili-qml-extension` directory from this project.

#### 2. Firefox Browser
The Firefox extension is not yet available on the add-ons store. Please use Developer Mode to install for now.
Method:
1.  Download and unzip the source code of this project.
2.  Enter `about:debugging` in the Firefox address bar and press Enter.
3.  Click **This Firefox** on the left.
4.  Click **Load Temporary Add-on...**.
5.  Select the `manifest.json` file in the `src/bili-qml-extension-firefox` directory.

#### 3. Userscript (Tampermonkey)
Suitable for all browsers that support Tampermonkey (Chrome, Edge, Firefox, Safari, etc.).
1.  Ensure you have the Tampermonkey extension installed.
2.  Click the link to install: [Stable Version](https://github.com/bili-qml-team/bili-qml/raw/refs/heads/main/src/bili-qml-tampermonkey/bili-qml.user.js) or [Dev Version](https://github.com/bili-qml-team/bili-qml/raw/refs/heads/dev/src/bili-qml-tampermonkey/bili-qml.user.js)

**Note: For the Tampermonkey script, you need to right-click the question mark button to open the leaderboard.**

---

### 📅 Roadmap (TODO)

- [x] **Fixed**
    - Issue where the icon was not properly hidden when scrolling down
    - Issue with simultaneously waking up the forwarding window (Thanks to bilibili@Logmeinu)
- [x] **Supported**
    - Published on Chrome Web Store
    - Published on Edge Add-ons
    - Firefox Browser Support
    - Tampermonkey Userscript Support
- [x] **New Features**
    - **Bot Protection (Altcha)**: Abuse prevention (Thanks to bilibili@巧克力棒好好吃啊qwq)
    - **Independent Leaderboard Page**
    - **Settings Panel**: Customize Danmaku preferences, API address
- [ ] **Planned**
    - Support Bilibili Desktop Client
    - Code structure optimization and refactoring

---
## 🛠 Tech Stack

-   **Frontend**: HTML, CSS (Bilibili Style), JavaScript (Chrome Extension API)
-   **Backend**: Node.js (Express)

---

### 🤝 Contribution & Feedback

Thanks to the following contributors for their work on this project! 🎉

| Contributor | Contribution |
| :---: | :--- |
| <a href="https://github.com/Radekyspec"><img src="https://github.com/Radekyspec.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>Radekyspec</b></sub></a> | Database migration scripts, EO protection logic |
| <a href="https://github.com/VanceHud"><img src="https://github.com/VanceHud.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>VanceHud</b></sub></a> | Firefox version, Tampermonkey version, Settings panel, Altcha integration |
| <a href="https://github.com/ShiroAzusa64"><img src="https://github.com/ShiroAzusa64.png?size=50" width="50px;" style="border-radius: 50%;"/><br /><sub><b>ShiroAzusa64</b></sub></a> | Backend core logic for v1.2 |

**How to Contribute:** Welcome to submit Issues or Pull Requests!

I am not a CS major; writing code is just a hobby. My technical skills and time are limited. Welcome all tech experts to build together!

If you like this project, please give it a ⭐ **Star** to encourage me! OwO~

---

## 🔒 Privacy Policy

This extension respects user privacy and has passed strict security self-checks before being listed on the Chrome Web Store:

1.  **Information Collection**: This extension only extracts the public `DedeUserID` (UID) from Bilibili as a unique identifier for voting. We **do not collect**, **read**, or **transmit** your Bilibili account password, SESSDATA, or any sensitive login credentials.
2.  **Data Usage**: The collected UID is only used to count votes, sync your voting status, and generate the leaderboard. It will not be used for any commercial purposes.
3.  **Permissions**: The `cookies` permission requested by the extension is only used to read the login status. The domain access permission is limited to `bilibili.com` and the extension's backend API.
4.  **Third-Party Sharing**: We monitor and promise not to share any user data with third parties.
