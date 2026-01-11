# B站问号榜 (Bilibili Question-Mark Leaderboard) 后端 API 文档

本文档详细描述了 B站问号榜后端服务的接口规范。

**Base URL**: `https://bili-qml.bydfk.com` (生产环境)

## 鉴权与安全

*   **CORS**: 仅允许来自 `https://www.bilibili.com` 及特定浏览器插件 URL 的请求。
*   **反爬虫**: 自动拦截包含 `curl`, `python`, `axios` 等关键词的 User-Agent。
*   **频率限制**: 针对投票和排行榜接口启用了频率限制。触发限制后需通过 Altcha 验证码验证。

---

## 接口列表

### 1. 获取状态 (Check Status)

查询指定用户对特定视频的投票状态及该视频的总票数。

*   **Endpoint**: `/api/status` (或 `/status`)
*   **Method**: `GET`
*   **Query Parameters**:
    *   `bvid` (Required): 视频 BVID (如 `BV1xx411c7xH`)
    *   `userId` (Required): B站用户 UID (用于查询是否已投)
*   **Response**:
    ```json
    {
      "success": true,
      "active": true,  // true 表示该用户已对该视频投过票
      "count": 123     // 该视频收到的总“问号”数
    }
    ```

### 2. 投票 (Vote)

对指定视频投出“问号”。

*   **Endpoint**: `/api/vote` (或 `/vote`)
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
      "bvid": "BV1xx411c7xH",
      "userId": "123456",
      "altcha": "..." // (Optional) Altcha 验证 payload，仅在触发频率限制时需要
    }
    ```
*   **Rate Limit**: 每个用户每 300 秒最多 10 次。
*   **Response (Success)**:
    ```json
    { "success": true }
    ```
*   **Response (Rate Limited)**:
    ```json
    {
      "success": false,
      "error": "Rate limit exceeded",
      "requiresCaptcha": true
    }
    ```
    *注: 收到 `requiresCaptcha: true` 后，客户端应请求 Challenge 并在用户完成验证后重新提交带 `altcha` 字段的请求。*

### 3. 取消投票 (Unvote)

取消对指定视频的“问号”。

*   **Endpoint**: `/api/unvote` (或 `/unvote`)
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
      "bvid": "BV1xx411c7xH",
      "userId": "123456",
      "altcha": "..." // (Optional) 同上
    }
    ```
*   **Rate Limit**: 共享投票接口的频率限制。
*   **Response**: 同投票接口。

### 4. 获取排行榜 (Get Leaderboard)

获取“问号”最多的视频列表。

*   **Endpoint**: `/api/leaderboard` (或 `/leaderboard`)
*   **Method**: `GET`
*   **Query Parameters**:
    *   `range` (Optional): 时间范围，默认为 `realtime`。
        *   `realtime`: 实时 (过去 12 小时)
        *   `daily`: 日榜
        *   `weekly`: 周榜
        *   `monthly`: 月榜
    *   `type` (Optional): 数据处理类型。
        *   若不传或不为 `2`，服务器会尝试调用 B站接口获取视频标题。
        *   若为 `2`，仅返回 BVID 和票数 (速度更快)。
    *   `altcha` (Optional): 验证码 Payload (用于解除 IP 频率限制)。
*   **Rate Limit**: 每个 IP 每 300 秒最多 20 次。
*   **Response**:
    ```json
    {
      "success": true,
      "list": [
        {
          "bvid": "BV1xx...",
          "count": 100,
          "title": "视频标题..." // 仅在 type != 2 时存在
        },
        ...
      ]
    }
    ```

### 5. 获取验证码挑战 (Get Altcha Challenge)

获取一个新的 Altcha Challenge，用于前端生成 PoW 验证。

*   **Endpoint**: `/api/altcha/challenge` (或 `/altcha/challenge`)
*   **Method**: `GET`
*   **Response**:
    ```json
    {
      "algorithm": "SHA-256",
      "challenge": "...",
      "salt": "...",
      "signature": "..."
    }
    ```

### 6. 刷新缓存 (Refresh Cache) - 管理接口

手动强制刷新排行榜缓存。

*   **Endpoint**: `/api/refresh` (或 `/refresh`)
*   **Method**: `POST`
*   **Headers**:
    *   `Authorization`: `Bearer <REFRESH_TOKEN>`
*   **Response**:
    ```json
    { "success": true }
    ```

---

## 错误代码

API 可能返回以下 HTTP 状态码或错误信息：

*   **200 OK**: 请求成功。
*   **400 Bad Request**: 参数缺失、格式错误或验证码无效。
*   **403 Forbidden**: 禁止访问 (如爬虫拦截或 Token 错误)。
*   **429 Too Many Requests**: 触发频率限制 (需完成验证码)。
*   **500 Internal Server Error**: 服务器内部错误。
