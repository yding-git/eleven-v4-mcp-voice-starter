import { writeFile } from "node:fs/promises";
import { synthesize } from "../src/voice.mjs";

const text = process.argv.slice(2).join(" ");
const audio = await synthesize(text, {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.ELEVENLABS_VOICE_ID,
});
await writeFile("voice.mp3", audio);
console.log("Saved voice.mp3 (" + audio.length + " bytes)");
