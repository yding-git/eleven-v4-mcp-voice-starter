# MCP 到语音出口：怎样打通，怎样替换

## 这个公开示例的实际链路

~~~text
AI 客户端
  └─ stdio MCP: trigger_voice({ text })
       └─ POST http://127.0.0.1:8788/internal/voice
            ├─ Bearer 内部令牌
            ├─ ElevenLabs Text to Dialogue / eleven_v4
            └─ VOICE_DELIVERY
                 ├─ web: 保存私有 MP3 → 本机网页列表 → audio 播放器
                 └─ telegram: Telegram Bot API sendVoice → 固定 chat ID
~~~

src/mcp.mjs 是模型动作入口，只接受 text。src/gateway.mjs 是语音服务与出口选择者；它从本机 .env 读取 API key、voice ID、Telegram 配置。src/voice.mjs 是供应商适配器。这个分层让 AI 不必知道密钥或收件人，也让 Telegram 可以换成网页、移动端或另一个通讯软件。

同一个 gateway 还有两条试听路径：

- 浏览器 POST /api/preview：本机页面直接拿到 MP3 并播放。
- MCP preview_voice(text)：gateway 返回 MP3，MCP server 把它包装为 audio 内容块。MCP 协议允许音频内容块，但最终客户端是否显示播放器要在具体客户端里验证。[MCP 音频内容示例](https://ts.sdk.modelcontextprotocol.io/server)

## 我们家的 Serein Home 链路，抽象后是什么

Serein Home 的已上线流程是「共享 MCP 接受受限文字 → Home 内部动作入口 → ElevenLabs → 私有音频资源 → 通道中立出站消息 → Telegram sendVoice」。Home 还记录动作是否被接受和确认，用于处理重复调用与结果未知的情况。这份公开仓库只复现核心接线思想，没有复制私有源码、部署配置或生产用的持久化机制。

因此，公开示例里出现的 confirmed 只表示本次本机请求走到了选定出口。多用户、宕机恢复、重复请求、长期音频保留、权限隔离等生产问题，需要在自己的应用里继续设计。

## 把 Telegram 换成自建前端

出口选择在服务端，而不在 AI 工具参数里。把 VOICE_DELIVERY 设为 web 并重启 gateway：MCP 工具仍叫 trigger_voice，仍只传 text；gateway 保存 MP3，本机网页通过 GET /api/voices 获取新音频清单，再用 GET /api/voices/:id.mp3 播放。这是本仓库已经可运行的替换。

如果你已有自己的前端，可把这两个读取接口改接到已有的登录系统和受保护对象存储；推送新消息时也可以把五秒轮询替换成 SSE 或 WebSocket。AI 工具和 ElevenLabs 请求不用因为前端技术栈变化而重写。

## 把声音或模型换掉

- **换声音**：在 ElevenLabs 选或设计新 voice，复制新 voice ID，修改服务端 ELEVENLABS_VOICE_ID，重启 gateway；MCP schema 不变。
- **换模型**：修改 src/voice.mjs 中的 MODEL_ID，同时核对目标模型适用的 API endpoint、请求体和输出格式。v3 → v4 的具体变化见 [switch-v3-to-v4.md](switch-v3-to-v4.md)。
- **换供应商**：保留 gateway 的动作入口与出口接口，替换 synthesize(text) 的实现。先确认新供应商返回的音频格式能被网页或 Telegram 接受。

## 网络与凭据边界

示例固定绑定 127.0.0.1。内部接口需要 VOICE_INTERNAL_TOKEN；网页试听接口与音频列表面向同一台电脑的本机浏览器。要放到公网，需要先增加用户认证、独立私有媒体访问、速率/额度控制、HTTPS、存储清理与明确的副作用回执。不要把 ElevenLabs key 放进浏览器或 MCP 工具参数。[ElevenLabs key 说明](https://elevenlabs.io/docs/api-reference/authentication)
