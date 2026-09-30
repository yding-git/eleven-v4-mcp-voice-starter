# 从零创建自己的声音

这一步创建的是 **voice**，不是 Eleven v4 模型。创建并保存声音之后，复制它的 voice ID；程序再用 voice ID + model_id=eleven_v4 合成语音。

资料依据：[ElevenLabs Voice Design 与 Prompting Guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design#prompting-guide)。以下是重新整理的操作步骤和原创示例，没有照搬官方示例文案。

## 网页操作

1. 登录 ElevenLabs，进入 Voices → My Voices → Add a new voice → Voice Design。
2. 写一段声音描述，明确语言/地区、年龄感、音色、语速、情绪与使用场景。
3. 在 Text to preview 写一小段真正会用这把声音念的文字。先听生成的候选，再修改描述；不要只凭一句「你好」判断长时间聊天的效果。
4. 选择满意的候选并保存。再到 My Voices，点该声音旁的三个点 → Copy voice ID。
5. 把 ID 填入本仓库 .env 的 ELEVENLABS_VOICE_ID，运行 README 中的试听命令。

官方文档说明 Voice Design 会给出多个候选，预览文字会消耗相应 credits；保存候选会占一个 voice slot。界面、计费和可用权限以你的账户当前页面为准。[官方 Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design) · [复制 voice ID](https://elevenlabs.io/docs/help-center/technical/how-do-i-find-the-voice-id-of-my-voices-via-the-website-and-api)

## 给 AI 的提示词模板

把下面这段交给 AI，让它先根据你的偏好写 **Voice Design 描述**，再写 **试听稿**。试听稿应与目标声音的情绪和用途一致。

~~~text
请为 ElevenLabs Voice Design 写一个声音描述和一段 80～150 字的中文试听稿。
用途：[私人助手 / 讲故事 / 产品播报 / 其他]
语言与地区：[例如普通话，中国大陆]
年龄感：[例如成年、约 25～35 岁]
音色：[例如温暖、中音、略带气声]
语速与节奏：[例如自然、稍慢、停顿清楚]
情绪与角色：[例如亲切、好奇、沉稳]
不要的特征：[例如播音腔、过度戏剧化、明显方言]
输出：
1. 一段可直接粘贴到 Voice Design 的英文声音描述；
2. 一段可直接粘贴到 Text to preview 的中文试听稿；
3. 说明每个关键声音特征如何在试听时判断。
不要模仿或暗示任何真实个人。
~~~

一个原创示例：

~~~text
Native Mandarin Chinese (Mainland China). Adult feminine voice, approximately 25–35. Studio-quality clarity. Persona: thoughtful companion. Emotion: warm, curious, composed. A smooth mid-range timbre with gentle intonation, natural conversational pacing, and clear but unforced articulation. It sounds close and personal without theatrical delivery.
~~~

可用的试听稿：

~~~text
今天的风有一点凉，但阳光很好。我们先把最重要的事慢慢说清楚，剩下的可以一步一步来。如果你想换个方向，也随时告诉我。
~~~

官方指南建议尽早明确语言和地区，区分「口音」与「语调」，并让试听文字符合声音描述。太短的试听句子可能听不出稳定的节奏。一次改一个维度，更容易比较候选。[官方提示词指南](https://elevenlabs.io/docs/eleven-creative/voices/voice-design#prompting-guide)

## 听完后怎样调整

| 听到的问题 | 先改哪一处 |
| --- | --- |
| 地区发音不对 | 把语言和地区放在描述首句，写得更具体 |
| 太像播音/客服 | 改成 conversational、natural pacing，弱化职业标签 |
| 太平淡 | 加入一两个明确情绪和语调词，再换一段有起伏的试听稿 |
| 过于夸张 | 去掉表演性词汇，写 composed、gentle emphasis |
| 音色合适但 v4 听着不同 | 用同一句文本分别试听；保存 voice 不保证不同模型听感完全一致 |

Voice Design 是探索声音的办法。最终效果以你的 voice ID 在 Eleven v4 下实际合成为准。
