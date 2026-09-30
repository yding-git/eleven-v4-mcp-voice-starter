export const MODEL_ID = "eleven_v4";
export const OUTPUT_FORMAT = "mp3_44100_128";
export const MAX_TEXT_CHARACTERS = 2000;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export function validateText(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("text must be a non-empty string");
  }
  const text = value.trim();
  if (Array.from(text).length > MAX_TEXT_CHARACTERS) {
    throw new RangeError("text must be at most 2000 characters");
  }
  return text;
}

export async function synthesize(text, { apiKey, voiceId, fetchImpl = fetch } = {}) {
  text = validateText(text);
  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  }

  const response = await fetchImpl(
    "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=" + OUTPUT_FORMAT,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model_id: MODEL_ID,
        inputs: [{ text, voice_id: voiceId }],
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    throw new Error("ElevenLabs returned HTTP " + response.status);
  }
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "audio/mpeg") {
    throw new Error("ElevenLabs did not return MPEG audio");
  }
  const declaredBytes = Number(response.headers.get("content-length"));
  if (declaredBytes > MAX_AUDIO_BYTES) {
    throw new Error("ElevenLabs audio exceeds the demo limit");
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) {
    throw new Error("ElevenLabs returned empty or oversized audio");
  }
  return audio;
}
