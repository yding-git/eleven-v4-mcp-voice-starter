import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { synthesize, validateText } from "./voice.mjs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

function authorized(header, secret) {
  const supplied = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function requestText(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) {
      const error = new Error("request body is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new TypeError("request body must be JSON");
  }
  return validateText(body?.text);
}

async function sendTelegramVoice(audio, env, fetchImpl) {
  const form = new FormData();
  form.set("chat_id", env.TELEGRAM_CHAT_ID);
  form.set("voice", new Blob([audio], { type: "audio/mpeg" }), "voice.mp3");
  const response = await fetchImpl(
    "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendVoice",
    { method: "POST", body: form, signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok || !(await response.json()).ok) {
    throw new Error("Telegram sendVoice was not confirmed");
  }
}

export function createGateway({
  env = process.env,
  fetchImpl = fetch,
  storageDir = resolve("data/voices"),
} = {}) {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID || !env.VOICE_INTERNAL_TOKEN) {
    throw new Error("Set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID and VOICE_INTERNAL_TOKEN");
  }
  const delivery = env.VOICE_DELIVERY || "web";
  if (delivery !== "web" && delivery !== "telegram") {
    throw new Error("VOICE_DELIVERY must be web or telegram");
  }
  if (delivery === "telegram" && (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)) {
    throw new Error("Telegram delivery requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID");
  }

  return createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url || "/", "http://localhost").pathname;
      if (req.method === "GET" && pathname === "/health") {
        return json(res, 200, { ok: true, delivery });
      }
      if (req.method === "GET" && pathname === "/") {
        const html = await readFile(new URL("../public/index.html", import.meta.url));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        return res.end(html);
      }
      if (req.method === "GET" && pathname === "/api/voices") {
        await mkdir(storageDir, { recursive: true, mode: 0o700 });
        const files = (await readdir(storageDir)).filter((name) => UUID_RE.test(name.slice(0, -4)) && name.endsWith(".mp3"));
        const entries = await Promise.all(files.map(async (name) => ({
          name,
          modified: (await stat(resolve(storageDir, name))).mtimeMs,
        })));
        return json(res, 200, {
          voices: entries.sort((a, b) => b.modified - a.modified).slice(0, 20).map(({ name }) => ({
            id: name.slice(0, -4),
            url: "/api/voices/" + name,
          })),
        });
      }
      if (req.method === "GET" && pathname.startsWith("/api/voices/")) {
        const match = /^\/api\/voices\/([0-9a-f-]+)\.mp3$/i.exec(pathname);
        if (!match || !UUID_RE.test(match[1])) return json(res, 404, { error: "not found" });
        let audio;
        try {
          audio = await readFile(resolve(storageDir, match[1] + ".mp3"));
        } catch (error) {
          if (error.code === "ENOENT") return json(res, 404, { error: "not found" });
          throw error;
        }
        res.writeHead(200, { "content-type": "audio/mpeg", "cache-control": "no-store" });
        return res.end(audio);
      }
      if (req.method === "POST" && ["/internal/voice", "/internal/preview", "/api/preview"].includes(pathname)) {
        if (pathname.startsWith("/internal/") && !authorized(req.headers.authorization, env.VOICE_INTERNAL_TOKEN)) {
          return json(res, 401, { error: "unauthorized" });
        }
        const text = await requestText(req);
        const audio = await synthesize(text, {
          apiKey: env.ELEVENLABS_API_KEY,
          voiceId: env.ELEVENLABS_VOICE_ID,
          fetchImpl,
        });
        if (pathname.endsWith("/preview")) {
          res.writeHead(200, { "content-type": "audio/mpeg", "cache-control": "no-store" });
          return res.end(audio);
        }
        if (delivery === "telegram") {
          await sendTelegramVoice(audio, env, fetchImpl);
          return json(res, 200, { status: "confirmed", delivery: "telegram" });
        }
        await mkdir(storageDir, { recursive: true, mode: 0o700 });
        const id = randomUUID();
        await writeFile(resolve(storageDir, id + ".mp3"), audio, { flag: "wx", mode: 0o600 });
        return json(res, 200, { status: "confirmed", delivery: "web", id, url: "/api/voices/" + id + ".mp3" });
      }
      return json(res, 404, { error: "not found" });
    } catch (error) {
      const status = error.statusCode || (error instanceof TypeError || error instanceof RangeError ? 400 : 502);
      return json(res, status, { error: status === 400 || status === 413 ? error.message : "voice action failed; outcome may be unknown" });
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const gateway = createGateway();
  const port = Number(process.env.PORT || 8788);
  gateway.listen(port, "127.0.0.1", () => {
    console.log("Voice gateway listening at http://127.0.0.1:" + port);
  });
}
