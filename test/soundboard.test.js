import assert from "node:assert/strict";
import test from "node:test";
import { transferCommand } from "../src/commands.js";
import { transferGuildSounds } from "../src/soundboard.js";

const sourceSounds = [
  { sound_id: "101", name: "Cheer", volume: 0.75, emoji_id: null, emoji_name: "🎉", available: true },
  { sound_id: "102", name: "Already there", volume: 1, emoji_id: null, emoji_name: null, available: true },
  { sound_id: "103", name: "Unavailable", volume: 1, emoji_id: null, emoji_name: null, available: false },
];

test("registers the transfer command for administrators in servers only", () => {
  const command = transferCommand.toJSON();

  assert.equal(command.default_member_permissions, "8");
  assert.equal(command.dm_permission, false);
});

test("copies sounds, preserves supported metadata, and skips existing or unavailable sounds", async () => {
  const created = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/guilds/source/soundboard-sounds")) {
      return Response.json({ items: sourceSounds });
    }
    if (url.endsWith("/guilds/destination/soundboard-sounds") && options.method !== "POST") {
      return Response.json({ items: [{ name: "already THERE" }] });
    }
    if (url.endsWith("/101")) {
      return new Response(Buffer.from("audio"), { headers: { "content-type": "audio/ogg" } });
    }
    if (options.method === "POST") {
      created.push(JSON.parse(options.body));
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await transferGuildSounds("source", "destination", "test-token", fetchImpl);

  assert.deepEqual(result, { copied: 1, skipped: 2, failed: 0 });
  assert.equal(created.length, 1);
  assert.equal(created[0].name, "Cheer");
  assert.equal(created[0].volume, 0.75);
  assert.equal(created[0].emoji_name, "🎉");
  assert.match(created[0].sound, /^data:audio\/ogg;base64,/);
});

test("counts unsupported and oversized files as failures without uploading them", async () => {
  const source = [
    { sound_id: "201", name: "Unsupported", volume: 1, available: true },
    { sound_id: "202", name: "Too large", volume: 1, available: true },
  ];
  let uploads = 0;
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/guilds/source/soundboard-sounds")) {
      return Response.json({ items: source });
    }
    if (url.endsWith("/guilds/destination/soundboard-sounds") && options.method !== "POST") {
      return Response.json({ items: [] });
    }
    if (url.endsWith("/201")) {
      return new Response(Buffer.from("not audio"), {
        headers: { "content-type": "text/plain" },
      });
    }
    if (url.endsWith("/202")) {
      return new Response(Buffer.alloc(512 * 1024 + 1), {
        headers: { "content-type": "audio/ogg" },
      });
    }
    if (options.method === "POST") {
      uploads += 1;
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await transferGuildSounds("source", "destination", "test-token", fetchImpl);
    assert.deepEqual(result, { copied: 0, skipped: 0, failed: 2 });
    assert.equal(uploads, 0);
  } finally {
    console.error = originalError;
  }
});
