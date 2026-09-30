import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createGateway } from "../src/gateway.mjs";

const fakeAudio = Buffer.from("ID3demo-audio");

async function start(gateway) {
  await new Promise((resolveListen) => gateway.listen(0, "127.0.0.1", resolveListen));
  return "http://127.0.0.1:" + gateway.address().port;
}

async function stop(gateway) {
  await new Promise((resolveClose) => gateway.close(resolveClose));
}

test("MCP tool reaches gateway; web inbox and audio preview work", async () => {
  const storageDir = await mkdtemp(join(tmpdir(), "voice-starter-test-"));
  const env = {
    ELEVENLABS_API_KEY: "test-key",
    ELEVENLABS_VOICE_ID: "test-voice",
    VOICE_INTERNAL_TOKEN: "test-internal-token",
    VOICE_DELIVERY: "web",
  };
  let calls = 0;
  const gateway = createGateway({
    env,
    storageDir,
    fetchImpl: async (url) => {
      assert.match(url, /^https:\/\/api\.elevenlabs\.io\//);
      calls++;
      return new Response(fakeAudio, { status: 200, headers: { "content-type": "audio/mpeg" } });
    },
  });
  const base = await start(gateway);
  const client = new Client({ name: "voice-starter-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("src/mcp.mjs")],
    env: { ...process.env, VOICE_INTERNAL_TOKEN: env.VOICE_INTERNAL_TOKEN, VOICE_GATEWAY_URL: base },
  });
  try {
    const blocked = await fetch(base + "/internal/voice", { method: "POST", body: JSON.stringify({ text: "hello" }) });
    assert.equal(blocked.status, 401);
    assert.equal(calls, 0);
    const page = await fetch(base + "/");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /MCP 发来的语音/);
    const browserPreview = await fetch(base + "/api/preview", {
      method: "POST",
      body: JSON.stringify({ text: "本机试听" }),
    });
    assert.equal(browserPreview.status, 200);
    assert.deepEqual(Buffer.from(await browserPreview.arrayBuffer()), fakeAudio);

    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ["preview_voice", "trigger_voice"]);

    const delivered = await client.callTool({ name: "trigger_voice", arguments: { text: "你好" } });
    assert.equal(delivered.isError, undefined);
    const receipt = JSON.parse(delivered.content[0].text);
    assert.equal(receipt.status, "confirmed");
    assert.equal(receipt.delivery, "web");
    const asset = await fetch(base + receipt.url);
    assert.equal(asset.headers.get("content-type"), "audio/mpeg");
    assert.deepEqual(Buffer.from(await asset.arrayBuffer()), fakeAudio);
    const feed = await (await fetch(base + "/api/voices")).json();
    assert.equal(feed.voices[0].id, receipt.id);

    const preview = await client.callTool({ name: "preview_voice", arguments: { text: "试听" } });
    assert.equal(preview.isError, undefined);
    assert.equal(preview.content[0].type, "audio");
    assert.equal(preview.content[0].mimeType, "audio/mpeg");
    assert.deepEqual(Buffer.from(preview.content[0].data, "base64"), fakeAudio);
    assert.equal(calls, 3);
  } finally {
    await client.close();
    await stop(gateway);
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("Telegram delivery uses server-side destination", async () => {
  const urls = [];
  const env = {
    ELEVENLABS_API_KEY: "test-key",
    ELEVENLABS_VOICE_ID: "test-voice",
    VOICE_INTERNAL_TOKEN: "test-internal-token",
    VOICE_DELIVERY: "telegram",
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_CHAT_ID: "123456",
  };
  const gateway = createGateway({
    env,
    fetchImpl: async (url, request) => {
      urls.push(url);
      if (url.startsWith("https://api.elevenlabs.io/")) {
        return new Response(fakeAudio, { status: 200, headers: { "content-type": "audio/mpeg" } });
      }
      assert.equal(request.body.get("chat_id"), "123456");
      assert.equal(request.body.get("voice").type, "audio/mpeg");
      return Response.json({ ok: true });
    },
  });
  const base = await start(gateway);
  try {
    const response = await fetch(base + "/internal/voice", {
      method: "POST",
      headers: { authorization: "Bearer " + env.VOICE_INTERNAL_TOKEN },
      body: JSON.stringify({ text: "你好" }),
    });
    assert.deepEqual(await response.json(), { status: "confirmed", delivery: "telegram" });
    assert.equal(urls.length, 2);
    assert.match(urls[1], /\/sendVoice$/);
  } finally {
    await stop(gateway);
  }
});
