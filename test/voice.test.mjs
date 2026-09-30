import test from "node:test";
import assert from "node:assert/strict";
import { synthesize, validateText } from "../src/voice.mjs";

test("Eleven v4 uses Text to Dialogue with one selected voice", async () => {
  let called = false;
  const audio = await synthesize("你好", {
    apiKey: "test-key",
    voiceId: "test-voice",
    fetchImpl: async (url, request) => {
      called = true;
      assert.equal(url, "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128");
      assert.equal(request.method, "POST");
      assert.equal(request.headers["xi-api-key"], "test-key");
      assert.deepEqual(JSON.parse(request.body), {
        model_id: "eleven_v4",
        inputs: [{ text: "你好", voice_id: "test-voice" }],
      });
      return new Response(Buffer.from("ID3test"), { status: 200, headers: { "content-type": "audio/mpeg" } });
    },
  });
  assert.equal(called, true);
  assert.equal(audio.toString(), "ID3test");
});

test("rejects empty and oversized text before contacting provider", () => {
  assert.throws(() => validateText(" "), TypeError);
  assert.throws(() => validateText("x".repeat(2001)), RangeError);
});

test("provider errors expose status without response body", async () => {
  await assert.rejects(
    synthesize("hello", {
      apiKey: "test-key",
      voiceId: "test-voice",
      fetchImpl: async () => new Response("secret-looking-provider-body", { status: 401 }),
    }),
    (error) => error.message === "ElevenLabs returned HTTP 401",
  );
});
