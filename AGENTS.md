# Instructions for AI assistants

This repository is a public teaching example. Read README.md and llms.txt first. Read only the relevant page under docs/ for a requested change.

## Architecture

- src/voice.mjs is the only ElevenLabs adapter. It calls Text to Dialogue with model_id eleven_v4 and one inputs entry.
- src/gateway.mjs owns the API key, voice ID, output channel, Telegram destination, and local audio files.
- src/mcp.mjs exposes trigger_voice(text) and preview_voice(text). Keep recipient, key, voice ID, and channel selection out of model-controlled tool inputs.
- public/index.html is a local-only browser example. It reads the gateway's voice feed and plays audio.
- examples/standalone.mjs is the easiest from-zero MP3 path.

## Work rules

- Do not copy any private Serein Home source, credentials, hostnames, chat content, tokens, audio files, or raw logs into this repository.
- Never commit .env, node_modules, data/voices, or generated MP3 files.
- Keep the default HTTP bind address at 127.0.0.1. A public deployment needs its own authentication, HTTPS, and private media access design.
- MCP tool errors with uncertain outcome must not tell the caller to retry automatically.
- Distinguish protocol capability from observed ChatGPT Work/Codex rendering. Do not claim inline playback is supported without a real client test.
- Run npm test after changing code. Review git diff and tracked files before publishing.

## Source of truth

The current code and tests decide what the example does. Official protocol links are in README.md and docs/. The prose about Serein Home is an abstracted architecture explanation, not an export of its production implementation.
