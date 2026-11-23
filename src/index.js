import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { transferGuildSounds } from "./soundboard.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("Set DISCORD_TOKEN before starting the bot");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "transfer-soundboard") {
    return;
  }

  const sourceGuildId = interaction.options.getString("source_server_id", true);
  const destinationGuildId = interaction.options.getString("destination_server_id", true);
  if (sourceGuildId === destinationGuildId) {
    await interaction.reply({ content: "Choose two different servers.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const [sourceGuild, destinationGuild] = await Promise.all([
      client.guilds.fetch(sourceGuildId),
      client.guilds.fetch(destinationGuildId),
    ]);
    const [sourceMember, destinationMember] = await Promise.all([
      sourceGuild.members.fetch(interaction.user.id),
      destinationGuild.members.fetch(interaction.user.id),
    ]);
    if (
      !sourceMember.permissions.has(PermissionFlagsBits.Administrator) ||
      !destinationMember.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.editReply("You must be an administrator in both servers to transfer sounds.");
      return;
    }

    const result = await transferGuildSounds(sourceGuildId, destinationGuildId, token);
    await interaction.editReply(
      `Transfer complete: ${result.copied} copied, ${result.skipped} skipped, ${result.failed} failed.`,
    );
  } catch (error) {
    console.error(`Soundboard transfer failed: ${error.message}`);
    await interaction.editReply(
      "Transfer could not be completed. Confirm the bot is in both servers and has permission to create soundboard sounds.",
    );
  }
});

client.login(token);
