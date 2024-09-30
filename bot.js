const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();
const mongoose = require('mongoose');
const { UserHandle, DarkWebChannel, AdminAction } = require('./db'); // Ensure you have this model

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create a schema for admins
const adminSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
});

const Admin = mongoose.model('Admin', adminSchema);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const token = process.env.BOT_TOKEN;
const clientId = '1289536538333548606'; // Ensure this is a string
const guildId = '1121136965622956132'; // Ensure this is a string

// Register slash commands
const commands = [
    {
        name: 'ping',
        description: 'Check the bot\'s latency',
    },
    {
        name: 'create',
        description: 'Create a custom anonymous handle',
        options: [
            {
                name: 'handle',
                type: 3, // Use 3 for STRING
                description: 'The custom handle you want to use',
                required: true, // This can be kept since STRING supports required
            }
        ],
    },
    {
        name: 'viewhandle',
        description: 'View your current anonymous handle',
    },
    {
        name: 'setchannel',
        description: 'Set a channel as the dark web conversation channel',
        options: [
            {
                name: 'channel',
                type: 7, // Type 7 is for channel
                description: 'The channel to set as the dark web conversation channel',
                required: true,
            },
        ],
    },
    {
        name: 'help',
        description: 'Get a list of commands and their usage',
    },
    {
        name: 'admin',
        description: 'Admin commands',
        options: [
            {
                name: 'viewhandles',
                type: 1, // Subcommand type
                description: 'View all anonymous handles',
            },
            {
                name: 'analytics',
                type: 1, // Subcommand type
                description: 'View analytics about the bot',
            },
            {
                name: 'manage',
                type: 1, // Subcommand type
                description: 'Manage admin access',
                options: [
                    {
                        name: 'add',
                        type: 6, // User type
                        description: 'User to add as admin',
                    },
                    {
                        name: 'remove',
                        type: 6, // User type
                        description: 'User to remove from admin',
                    },
                ],
            },
        ],
    },
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error); // Improved logging
    }
})();

client.once('ready', () => {
    console.log(`${client.user.tag} is now online!`);
});

// Middleware for admin check
async function isAdmin(userId) {
    const admin = await Admin.findOne({ userId });
    return admin !== null;
}


// Command interaction
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // Function to check if a user has admin permissions in the guild
    const isServerAdmin = interaction.member.permissions.has('ADMINISTRATOR');
    const canManageServer = interaction.member.permissions.has('MANAGE_GUILD');

    // Handle the ping command
    if (interaction.commandName === 'ping') {
        const latency = Math.round(client.ws.ping);
        const apiLatency = Date.now() - interaction.createdTimestamp;

        const pingEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latency', value: `${latency} ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency} ms`, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [pingEmbed] });
    }

    // Create a custom handle
    if (interaction.commandName === 'create') {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id; // Ensure it's guild-specific
        const customHandle = interaction.options.getString('handle');

        // Ensure the handle follows the 'anonXXXX' format
        const handlePattern = /^anon\d{4}$/;
        if (!handlePattern.test(customHandle)) {
            return await interaction.reply({
                content: 'Invalid handle format! Please use the format "anonXXXX" where XXXX is a 4-digit number.',
                ephemeral: true
            });
        }

        // Check if the handle is already taken in the current guild
        const existingHandle = await UserHandle.findOne({ handle: customHandle, guildId });

        if (existingHandle) {
            return await interaction.reply({
                content: 'This handle is already taken in this server! Try another one.',
                ephemeral: true
            });
        }

        // Save the handle for the user, scoped to the current guild
        const userHandle = new UserHandle({ userId, guildId, handle: customHandle });
        await userHandle.save();

        await interaction.reply({
            content: `Your anonymous handle has been set to **${customHandle}** in this server!`,
            ephemeral: true
        });
    }

    // View current anonymous handle
    if (interaction.commandName === 'viewhandle') {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id; // Ensure it's guild-specific

        // Retrieve the user's handle for the current guild
        const userHandle = await UserHandle.findOne({ userId, guildId });

        if (!userHandle) {
            return await interaction.reply({
                content: "You haven't set a handle yet in this server! Use /create to set one.",
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: `Your current anonymous handle in this server is **${userHandle.handle}**.`,
            ephemeral: true,
        });
    }

    // Handle the /setchannel command
    if (interaction.commandName === 'setchannel') {
        const isAdminUser = await isAdmin(interaction.user.id);

        // Check if the user has either Admin or Manage Server permissions
        if (!isAdminUser && !isServerAdmin && !canManageServer) {
            return await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        // Get the selected channel
        const channel = interaction.options.getChannel('channel');

        // Store the dark web channel in the database
        let darkWebChannel = await DarkWebChannel.findOne({ guildId: interaction.guild.id });
        if (darkWebChannel) {
            darkWebChannel.channelId = channel.id; // Update existing record
        } else {
            darkWebChannel = new DarkWebChannel({
                guildId: interaction.guild.id,
                channelId: channel.id,
            });
        }
        await darkWebChannel.save();

        await interaction.reply({
            content: `The dark web conversation channel has been set to <#${channel.id}>.`,
            ephemeral: false,
        });
    }

    // Help command
    if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Help - Available Commands');

        // List general commands
        embed.addFields(
            { name: '**/ping**', value: 'Check the bot\'s latency', inline: false },
            { name: '**/create**', value: 'Create a custom anonymous handle', inline: false },
            { name: '**/viewhandle**', value: 'View your current anonymous handle', inline: false },
            { name: '**/setchannel** (admin-only)', value: 'Set a channel as the dark web conversation channel', inline: false },
            { name: '**/help**', value: 'Get a list of commands and their usage', inline: false },
        );

        // Check if the user is God Admin or Admin
        const isAdminUser = await isAdmin(interaction.user.id);

        if (isAdminUser || isServerAdmin || canManageServer) {
            // List admin commands if the user is an admin
            embed.addFields(
                { name: '**/admin**', value: 'Admin commands', inline: false },
                { name: 'Subcommands:', value: '**- viewhandles** - View all anonymous handles\n**- analytics** - View analytics about the bot\n**- manage** - Manage admin access', inline: false }
            );
        }

        await interaction.reply({ embeds: [embed] });
    }

    // Admin commands
    if (interaction.commandName === 'admin') {
        // Check if the user is Admin, or has Manage Server permission
        const isAdminUser = await isAdmin(interaction.user.id);

        if (interaction.options.getSubcommand() === 'viewhandles') {
            // If the user is not Admin, or has Manage Server permission, deny access
            if (!isAdminUser && !isServerAdmin && !canManageServer) {
                return await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true,
                });
            }

            // Fetch all handles for the current guild from the database
            const handles = await UserHandle.find({ guildId: interaction.guild.id });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('All Anonymous Handles');

            handles.forEach(handle => {
                embed.addFields(
                    { name: `**User ID:** ${handle.userId}`, value: `**Handle:** ${handle.handle}`, inline: false }
                );
            });

            await interaction.reply({ embeds: [embed] });
        }


        // Manage admin access
        if (interaction.options.getSubcommand() === 'manage') {
            if (!isServerAdmin && !canManageServer) {
                return await interaction.reply({
                    content: 'You do not have permission to manage admin access.',
                    ephemeral: true,
                });
            }

            const addUserId = interaction.options.getUser('add')?.id;
            const removeUserId = interaction.options.getUser('remove')?.id;

            // Add admin
            if (addUserId) {
                const existingAdmin = await Admin.findOne({ userId: addUserId });

                if (existingAdmin) {
                    return await interaction.reply({
                        content: `<@${addUserId}> is already an admin.`,
                        ephemeral: true
                    });
                }

                const admin = new Admin({ userId: addUserId });
                await admin.save();

                // Log the action in the database
                const action = new AdminAction({
                    actionType: 'add',
                    performedBy: interaction.user.id, // The user who performed the action
                    targetUserId: addUserId, // The user added as admin
                    guildId: interaction.guild.id // Server ID
                });
                await action.save();

                return await interaction.reply({
                    content: `<@${addUserId}> has been added as an admin.`,
                    ephemeral: true
                });
            }

            // Remove admin
            if (removeUserId) {
                const existingAdmin = await Admin.findOne({ userId: removeUserId });

                if (!existingAdmin) {
                    return await interaction.reply({
                        content: `<@${removeUserId}> is not an admin.`,
                        ephemeral: true
                    });
                }

                await Admin.deleteOne({ userId: removeUserId });

                // Log the action in the database
                const action = new AdminAction({
                    actionType: 'remove',
                    performedBy: interaction.user.id, // The user who performed the action
                    targetUserId: removeUserId, // The user removed as admin
                    guildId: interaction.guild.id // Server ID
                });
                await action.save();

                return await interaction.reply({
                    content: `<@${removeUserId}> has been removed as an admin.`,
                    ephemeral: true
                });
            }

            // If no user specified for add/remove
            return await interaction.reply({
                content: 'You must specify a user to add or remove.',
                ephemeral: true
            });
        }
    }
});


// Anonymous Messaging
client.on('messageCreate', async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
        // Get the dark web channel from the database
        const darkWebChannel = await DarkWebChannel.findOne({ guildId });

        // Check if the message starts with "!anon"
        if (message.content.startsWith('!anon')) {
            const anonMessage = message.content.slice(6).trim(); // Strip "!anon" part

            // Handle case where the dark web channel is not set
            if (!darkWebChannel) {
                // Check if the user has permissions to set the channel (is an admin)
                const isAdminUser = message.member.permissions.has('ADMINISTRATOR') || message.member.permissions.has('MANAGE_GUILD');

                if (isAdminUser) {
                    return message.reply({
                        content: "The dark web channel hasn't been set up yet. Use the `/setchannel` command to configure it.",
                        ephemeral: true // Only visible to the admin who sent the message
                    });
                } else {
                    return message.reply({
                        content: "The dark web channel has not been set. Please contact an admin to set it up.",
                        ephemeral: true // Only visible to the user
                    });
                }
            }

            // Handle case where the message is sent in the wrong channel
            if (message.channel.id !== darkWebChannel.channelId) {
                return message.reply({
                    content: `Please send anonymous messages in the designated dark web channel: <#${darkWebChannel.channelId}>.`,
                    ephemeral: true // Only visible to the user
                });
            }

            // Handle anonymous message logic if sent in the correct channel
            const userHandle = await UserHandle.findOne({ userId });

            if (!userHandle) {
                return message.reply({
                    content: "You haven't set a handle yet! Use /create to set one.",
                    ephemeral: true
                });
            }

            // Check if the message contains a referenced handle (e.g., 'anonXXXX')
            const mentionedHandleMatch = anonMessage.match(/(anon\d{4})/); // Regex to match 'anonXXXX'
            let notifiedUserId = null;

            if (mentionedHandleMatch) {
                const mentionedHandle = mentionedHandleMatch[0];

                // Find the user associated with the mentioned handle
                const mentionedUserHandle = await UserHandle.findOne({ handle: mentionedHandle });

                if (mentionedUserHandle) {
                    notifiedUserId = mentionedUserHandle.userId; // Get the user ID associated with the handle
                }
            }

            // Send the anonymous message
            if (anonMessage) {
                await message.channel.send(`**${userHandle.handle}:** ${anonMessage}`);
                await message.delete(); // Optionally delete the original message
            }

            // Notify the mentioned user if found
            if (notifiedUserId) {
                const mentionedUser = await client.users.fetch(notifiedUserId);
                if (mentionedUser) {
                    try {
                        await mentionedUser.send(`You have a new anonymous message from **${userHandle.handle}**: ${anonMessage}`);
                    } catch (error) {
                        if (error.code === 50007) { // Discord API error: Cannot send messages to this user
                            console.error(`Could not send DM to user ${mentionedUser.id}. They may have DMs disabled or blocked the bot.`);
                            await message.reply({
                                content: `I couldn't send a DM to the user you mentioned. They may have DMs disabled or blocked the bot.`,
                                ephemeral: true // Only visible to the sender
                            });
                        } else {
                            console.error(`Failed to send DM: ${error}`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error handling messageCreate event: ${error}`);
        return message.reply({
            content: "An error occurred while processing your message. Please try again later.",
            ephemeral: true
        });
    }
});


client.login(token);
