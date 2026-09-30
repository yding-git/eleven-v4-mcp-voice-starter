import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const baseUrl = process.env.VOICE_GATEWAY_URL || "http://127.0.0.1:" + (process.env.PORT || 8788);
const token = process.env.VOICE_INTERNAL_TOKEN;
if (!token) throw new Error("VOICE_INTERNAL_TOKEN is required");

async function callGateway(path, text) {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error("gateway returned HTTP " + response.status);
  return response;
}

function createServer() {
  const server = new McpServer(
    { name: "eleven-v4-voice-starter", version: "1.0.0" },
    { instructions: "trigger_voice has a side effect and may incur provider charges. Call only when the user requests voice or the assistant intentionally chooses voice. Never retry an unknown result automatically. preview_voice returns audio to the MCP client; playback depends on client support." },
  );
  server.registerTool(
    "trigger_voice",
    {
      description: "Generate one Eleven v4 voice message and deliver it to the server-selected output (web inbox or Telegram). The input is only the text to speak; the model does not choose credentials, voice ID, recipient, or channel.",
      inputSchema: z.object({ text: z.string().min(1).max(2000) }),
    },
    async ({ text }) => {
      try {
        const response = await callGateway("/internal/voice", text);
        const result = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch {
        return { isError: true, content: [{ type: "text", text: "Voice action failed or outcome is unknown. Do not retry automatically." }] };
      }
    },
  );
  server.registerTool(
    "preview_voice",
    {
      description: "Generate a short Eleven v4 preview and return MP3 audio to this MCP client. Some clients may not render an inline player.",
      inputSchema: z.object({ text: z.string().min(1).max(240) }),
    },
    async ({ text }) => {
      try {
        const response = await callGateway("/internal/preview", text);
        const audio = Buffer.from(await response.arrayBuffer());
        if (response.headers.get("content-type")?.split(";", 1)[0] !== "audio/mpeg" || !audio.length) {
          throw new Error("invalid audio");
        }
        return { content: [{ type: "audio", data: audio.toString("base64"), mimeType: "audio/mpeg" }] };
      } catch {
        return { isError: true, content: [{ type: "text", text: "Voice preview failed or outcome is unknown. Do not retry automatically." }] };
      }
    },
  );
  return server;
}

void serveStdio(createServer);
