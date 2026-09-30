# 在 Codex、ChatGPT Work 或 Chat 里播放

这里区分 **MCP 能返回什么** 与 **官方客户端实际会怎样显示**。这份仓库目前提供本机 stdio MCP server；没有打包成可安装的 ChatGPT 插件，也没有在某个用户的 Work 前端完成内嵌播放器验收。

## Codex 桌面版：先用本机文件或网页

本机运行 npm run demo 生成 voice.mp3，Codex 可以引用当前电脑上可访问的绝对音频文件路径；本机网页 http://127.0.0.1:8788 也能播放。MCP 的 preview_voice 还会返回 audio/mpeg 内容块，可以在连接的客户端中实际调用，观察该版本是否直接显示播放器。不要把「MCP 返回 audio 块」当成「所有客户端都会自动播放」。

按 [OpenAI Docs 的 MCP 设置说明](https://learn.chatgpt.com/docs/extend/mcp)，Codex 桌面版可添加本机 stdio MCP server。这里的 gateway 与 mcp 两个进程都需在本机运行，并读取相同的 VOICE_INTERNAL_TOKEN。

## ChatGPT Work / Chat：远程插件与界面

OpenAI Docs 说明，托管的 ChatGPT Work / Chat 可使用插件提供的远程 MCP 工具；它不会读取你电脑上 Codex 的本地 stdio 配置。要让远端 Work 调用语音服务，需要把工具做成远程 MCP 服务并通过插件接入。[OpenAI Docs：MCP 与 Work](https://learn.chatgpt.com/docs/extend/mcp)

要稳定地在聊天内容中显示一个可播放音频控件，较明确的产品接法是给该远程 MCP 工具关联一个 **MCP App UI**：工具生成音频，受保护的服务器提供可访问的音频资源，UI 在 ChatGPT 内嵌页面用 audio 控件播放。OpenAI 的插件文档提供了工具关联 UI resource、接收 tool result 和 inline card 的接入方式。[OpenAI 插件 UI 文档](https://developers.openai.com/plugins/build/chatgpt-ui)

本仓库没有声称普通 MCP audio 内容块会在 ChatGPT Work / Chat 自动变成播放器；这一点需要在目标客户端和账号里用实际插件验证。远程接入还要处理 HTTPS、身份认证、私有音频的限时访问、额度和文件清理。这是下一阶段工程，不是把本机路径交给 Work 虚拟机就能完成。

## ChatGPT Voice 是另一项功能

ChatGPT 自带的 Voice 可以在支持的 Chat、Work 与 Codex 桌面场景中进行实时语音对话；它与本仓库调用 ElevenLabs 生成 MP3 是两条不同的产品链路。不能通过把本仓库的 model_id 改成 eleven_v4 来替换 ChatGPT Voice 的内置声音。[OpenAI Docs：ChatGPT Voice](https://learn.chatgpt.com/docs/features/voice)
