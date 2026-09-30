# 从旧 TTS 接法切换到 Eleven v4

Eleven v4 的模型 ID 是 eleven_v4，官方说明它通过 Text to Dialogue API 使用。迁移时需要一起核对 **URL、请求体和模型 ID**，不能只把旧请求里的 eleven_v3 改名。[模型说明](https://elevenlabs.io/docs/overview/models#eleven-v4) · [Text to Dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)

| 常见旧接法 | v4 接法 |
| --- | --- |
| POST /v1/text-to-speech/{voiceId} | POST /v1/text-to-dialogue |
| body 里直接放 text 与 model_id | body 里放 inputs: [{text, voice_id}] 与 model_id |
| model_id: eleven_v3 | model_id: eleven_v4 |
| voice ID 在 URL 里 | voice ID 在每个 input 里 |

本仓库 src/voice.mjs 是一份完整可运行的 v4 请求例子。单人语音只需一个 input。输出使用 mp3_44100_128，收到响应后检查 HTTP 状态、audio/mpeg 类型和大小，再保存或投递。

官方模型总览列出 v4 的模型字符上限；Text to Dialogue 接口另建议全部 inputs 的文字合计不超过 2000 字符，以提高生成可靠性。本示例按较保守的 2000 字符限制输入。[模型限制](https://elevenlabs.io/docs/overview/models#character-limits) · [接口建议](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)

## 自己的项目怎样改

1. 找到唯一调用 ElevenLabs 的服务端模块，记录现有 URL、请求体、voice ID 来源与音频消费者。
2. 保留原 key 与 voice ID 的服务端保管方式，不要把它们放到网页或 AI 工具参数。
3. 改成上表的 v4 URL 和 body，并明确 model_id=eleven_v4。
4. 用不含私密正文的短句实际请求一次，确认返回 MP3，再检查出口能播放或投递。
5. 若有 MCP 工具，核对它调用的是修改后的服务。只测 ElevenLabs 200 不等于消息已送达。
6. 部署时保留原可运行版本与回退方法；结果未知时不要自动重发，以免生成或投递两次。

Voice Design 创建的是 voice 资产，换模型不会替你设计新声音。若同一个 voice 在 v4 下听感变化，先用同文对比，再决定要不要换 voice。[Voice Design](voice-design.md)
