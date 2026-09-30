# Eleven v4 MCP Voice Starter

一个可以自己运行的 ElevenLabs Eleven v4 语音示例：文字生成 MP3、MCP 工具调用、Telegram 发送，以及本机网页播放。代码从零编写，不包含任何人的 API key、voice ID、Bot Token、聊天记录或服务器配置。

**先选入口：**

| 想做什么 | 从哪里开始 |
| --- | --- |
| 只想生成一个 MP3 | 本页「五分钟试听」 |
| 想让 AI 通过 MCP 触发语音 | 本页「接入 MCP」 |
| 想设计自己的声音 | [Voice Design 指南](docs/voice-design.md) |
| 想把 v3 改成 v4 | [接口替换说明](docs/switch-v3-to-v4.md) |
| 想换成自己的前端或 Telegram | [链路与出口](docs/architecture.md) |
| 想在 Codex、ChatGPT Work 或 Chat 播放 | [官方客户端接入边界](docs/openai-clients.md) |
| 让 AI 接手这个仓库 | [AGENTS.md](AGENTS.md) 与 [llms.txt](llms.txt) |

## 五分钟试听

需要 Node.js 22 或更新版本、自己的 ElevenLabs API key，以及一个 voice ID。Voice ID 可以从 ElevenLabs 的 My Voices 页面点声音旁的三个点并复制。没有声音时，先看 [Voice Design 指南](docs/voice-design.md)。

1. 下载或克隆仓库，进入目录，运行 npm ci。
2. 复制 .env.example 为 .env。Windows PowerShell 用 Copy-Item .env.example .env；macOS/Linux 用 cp .env.example .env。
3. 在 .env 中填写 ELEVENLABS_API_KEY 和 ELEVENLABS_VOICE_ID。别把真实 .env 提交到 Git。
4. 运行：

~~~bash
npm run demo -- "你好，这是我的第一段 Eleven v4 语音。"
~~~

当前目录会生成 voice.mp3。这个脚本只做一件事：请求 ElevenLabs Text to Dialogue API，返回 MP3 并保存。默认模型明确指定为 eleven_v4；如果不写 model_id，接口目前默认 eleven_v3。[官方模型](https://elevenlabs.io/docs/overview/models#eleven-v4) · [官方接口](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)

## 在本机网页播放

再在 .env 填入一个随机的 VOICE_INTERNAL_TOKEN，并保持 VOICE_DELIVERY=web。生成随机值的例子：

~~~bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

启动服务：

~~~bash
npm start
~~~

浏览器打开 http://127.0.0.1:8788 。输入文字点「生成试听」就能播放。若 MCP 调用 trigger_voice，语音会保存在本机 data/voices 中并出现在页面下方；页面每五秒检查一次新语音。该目录已被 .gitignore 排除。

本示例固定监听 127.0.0.1，供本机学习与实验。要让互联网上的前端访问，应接入你自己的登录、访问控制、HTTPS、文件保留策略和反向代理；不要直接把这个本机示例当公网服务。

## 接入 MCP

保持上一节的服务运行。在另一个终端运行 npm run mcp。它是 **stdio MCP server**：正常启动后会等待客户端连接，不会像网页服务器那样打印一个地址。可以用 MCP Inspector 调试：

~~~bash
npx @modelcontextprotocol/inspector npm run mcp
~~~

工具有两个：

- trigger_voice(text)：通过本机语音服务生成一次语音，并交给服务端选定的出口。web 模式进入网页语音列表；telegram 模式发到固定 Telegram 聊天。工具参数只有文字。
- preview_voice(text)：返回短 MP3 的 MCP audio 内容块；客户端是否显示内嵌播放器取决于客户端自身支持情况。

本地 Codex 可在设置的 MCP servers 页面添加 STDIO server，启动命令指向本仓库的 Node 进程；或按[官方 Codex MCP 指南](https://learn.chatgpt.com/docs/extend/mcp)配置。启动命令需从本仓库目录运行 npm run mcp，或使用 Node 的 --env-file 传绝对 .env 路径并传绝对 src/mcp.mjs 路径。MCP 与 gateway 进程都要读取相同的 VOICE_INTERNAL_TOKEN。

**调用链：** AI → MCP trigger_voice(text) → 本机 gateway 的 /internal/voice → ElevenLabs → server-selected output。模型工具看不到 API key、voice ID、Telegram chat ID，也不能从参数里改收件人。详情见[架构图与替换点](docs/architecture.md)。

## 换成 Telegram

在 .env 中改为 VOICE_DELIVERY=telegram，并填写自己的 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID。重启 npm start。此时 trigger_voice 会在服务端调用 Telegram sendVoice；网页的 MCP 语音列表不再新增。网页的「生成试听」仍可本机播放。Telegram Bot API 的 [sendVoice 文档](https://core.telegram.org/bots/api#sendvoice)说明了语音上传接口。

## 验证与边界

运行 npm test。测试使用假音频和模拟的供应商/Telegram 响应，不消费 ElevenLabs 额度。真实声音仍需你用自己的 key 和 voice ID 做一次试听。

这是教学示例。实际多用户或生产系统还需要耐久幂等回执、身份与房间解析、队列/重试策略、鉴权的音频存储和清理。本仓库没有复制 Serein Home 的私有服务，也没有假称它的生产可靠性。参考 [docs/architecture.md](docs/architecture.md)。

## 资料

- [Eleven v4 模型](https://elevenlabs.io/docs/overview/models#eleven-v4)
- [Text to Dialogue API](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
- [ElevenLabs API key](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [查找 Voice ID](https://elevenlabs.io/docs/help-center/technical/how-do-i-find-the-voice-id-of-my-voices-via-the-website-and-api)
- [MCP TypeScript SDK 入门](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md)

MIT License。
