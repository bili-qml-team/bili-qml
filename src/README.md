# B站问号榜 (Bilibili Question Mark Leaderboard)

这是一个 Chrome 插件，用于在 B 站视频下方添加一个“问号”按钮。如果用户对视频感到困惑，可以点击该按钮。插件会收集数据并展示每日、每周、每月的“困惑视频排行榜”。

## 项目结构

```
/src
  /extension          # Chrome 插件目录
    manifest.json     # 插件配置文件
    content.js        # 负责在B站页面注入按钮
    content.css       # 注入按钮的样式
    popup.html        # 点击插件图标弹出的排行榜页面
    popup.js          # 排行榜页面逻辑
    popup.css         # 排行榜页面样式
  /server             # 后端服务器目录
    server.js         # Express 服务器，处理投票和排行榜请求
    package.json      # 项目依赖
    data/             # 存放投票数据的 JSON 文件
```

## 如何运行

### 1. 启动后端服务器

1. 进入 `server` 目录：
   ```bash
   cd server
   ```
2. 安装依赖（需要 Node.js 环境）：
   ```bash
   npm install
   ```
3. 启动服务器：
   ```bash
   node server.js
   ```
   服务器将运行在 `http://localhost:3000`。

### 2. 安装 Chrome 插件

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目中的 `src/extension` 目录。

## 功能说明

1. **问号按钮**：在 B 站视频播放页面的分享按钮右侧，会出现一个“问号”图标。点击后会将当前视频信息发送到服务器。
2. **排行榜**：点击浏览器右上角的插件图标，可以查看日榜、周榜和月榜，点击视频标题可直接跳转。

## 注意事项

- 本项目目前使用 `http://localhost:3000` 作为后端地址，仅供本地测试。
- 数据持久化采用简单的 JSON 文件存储。
