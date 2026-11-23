import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const transferCommand = new SlashCommandBuilder()
  .setName("transfer-soundboard")
  .setDescription("Copy soundboard sounds from one server to another")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addStringOption((option) =>
    option
      .setName("source_server_id")
      .setDescription("Server to copy sounds from")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("destination_server_id")
      .setDescription("Server to copy sounds to")
      .setRequired(true),
  );
