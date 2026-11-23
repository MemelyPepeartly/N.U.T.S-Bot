const API_BASE = "https://discord.com/api/v10";
const CDN_BASE = "https://cdn.discordapp.com/soundboard-sounds";
const MAX_SOUND_BYTES = 512 * 1024;
const SUPPORTED_TYPES = new Set(["audio/ogg", "audio/mpeg"]);

function authHeaders(token) {
  return { Authorization: `Bot ${token}` };
}

async function getGuildSounds(guildId, token, fetchImpl) {
  const response = await fetchImpl(
    `${API_BASE}/guilds/${encodeURIComponent(guildId)}/soundboard-sounds`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(`Discord soundboard request failed with status ${response.status}`);
  }

  const result = await response.json();
  if (!Array.isArray(result.items)) {
    throw new Error("Discord returned an invalid soundboard response");
  }
  return result.items;
}

async function readSound(response) {
  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  if (!SUPPORTED_TYPES.has(contentType)) {
    throw new Error("Sound file is not an MP3 or Ogg audio file");
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOUND_BYTES) {
    throw new Error("Sound file exceeds Discord's 512 KB limit");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_SOUND_BYTES) {
      throw new Error("Sound file exceeds Discord's 512 KB limit");
    }
    return { bytes, contentType };
  }

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SOUND_BYTES) {
      await reader.cancel();
      throw new Error("Sound file exceeds Discord's 512 KB limit");
    }
    chunks.push(Buffer.from(value));
  }
  return { bytes: Buffer.concat(chunks, size), contentType };
}

export async function transferGuildSounds(sourceGuildId, destinationGuildId, token, fetchImpl = fetch) {
  const [sourceSounds, destinationSounds] = await Promise.all([
    getGuildSounds(sourceGuildId, token, fetchImpl),
    getGuildSounds(destinationGuildId, token, fetchImpl),
  ]);
  const existingNames = new Set(destinationSounds.map(({ name }) => name.toLocaleLowerCase("en-US")));
  const result = { copied: 0, skipped: 0, failed: 0 };

  for (const sound of sourceSounds) {
    if (!sound.available || existingNames.has(sound.name.toLocaleLowerCase("en-US"))) {
      result.skipped += 1;
      continue;
    }

    try {
      const soundResponse = await fetchImpl(`${CDN_BASE}/${encodeURIComponent(sound.sound_id)}`);
      if (!soundResponse.ok) {
        throw new Error(`Sound download failed with status ${soundResponse.status}`);
      }

      const { bytes, contentType } = await readSound(soundResponse);
      const payload = {
        name: sound.name,
        sound: `data:${contentType};base64,${bytes.toString("base64")}`,
        volume: sound.volume,
        emoji_id: null,
        emoji_name: sound.emoji_id ? null : sound.emoji_name,
      };
      const response = await fetchImpl(
        `${API_BASE}/guilds/${encodeURIComponent(destinationGuildId)}/soundboard-sounds`,
        {
          method: "POST",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(`Sound creation failed with status ${response.status}`);
      }

      existingNames.add(sound.name.toLocaleLowerCase("en-US"));
      result.copied += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Could not transfer sound ${sound.sound_id}: ${error.message}`);
    }
  }

  return result;
}
