// Global chat command for connecting servers together
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'globalchat',
    aliases: ['global', 'crossserver'],
    description: 'Connect with other servers in a global chat network',
    usage: 'globalchat <enable|disable|status|channel|settings>',
    cooldown: 10,
    /**
     * Executes the global chat command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if the user has the MANAGE_GUILD permission
        const requiredPermissions = ['ManageGuild'];
        if (!checkPermissions(message.member, requiredPermissions)) {
            const missingPermissions = getMissingPermissions(message.member, requiredPermissions);
            
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Missing Permissions',
                        `You don't have the required permissions to use this command.`,
                        [{ name: 'Required Permissions', value: missingPermissions.join(', ') }]
                    )
                ]
            });
        }
        
        // Get the subcommand
        const subCommand = args[0]?.toLowerCase();
        
        // Get the current global chat settings
        const globalChatSettings = db.getGlobalChat(message.guild.id);
        
        // Get the global network
        const globalNetwork = db.getGlobalNetwork();
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Global Chat Settings',
                        `Connect your server to a network of global chat channels. Messages sent in your designated channel will be forwarded to all other servers in the network, and vice versa.`,
                        [
                            { name: `${client.config.prefix}globalchat enable`, value: 'Enable global chat for this server' },
                            { name: `${client.config.prefix}globalchat disable`, value: 'Disable global chat for this server' },
                            { name: `${client.config.prefix}globalchat status`, value: 'View current global chat settings and network status' },
                            { name: `${client.config.prefix}globalchat channel <#channel>`, value: 'Set the channel for global chat' },
                            { name: `${client.config.prefix}globalchat settings <option> <value>`, value: 'Configure global chat settings' },
                            { name: 'Available Settings', value: 'blockImages <true|false>\nblockLinks <true|false>\ncooldown <seconds>' }
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable global chat
                if (!globalChatSettings.channel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'No Channel Set',
                                `You need to set a channel for global chat before enabling it.`,
                                [{ name: 'Usage', value: `${client.config.prefix}globalchat channel <#channel>` }]
                            )
                        ]
                    });
                }
                
                globalChatSettings.enabled = true;
                db.setGlobalChat(message.guild.id, globalChatSettings);
                
                // Add the server to the global network
                globalNetwork.servers[message.guild.id] = globalChatSettings.channel;
                db.setGlobalNetwork(globalNetwork);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Global Chat Enabled',
                            `Global chat has been enabled for this server.`,
                            [
                                { name: 'Channel', value: `<#${globalChatSettings.channel}>` },
                                { name: 'Network Size', value: `${Object.keys(globalNetwork.servers).length} servers connected` }
                            ]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable global chat
                globalChatSettings.enabled = false;
                db.setGlobalChat(message.guild.id, globalChatSettings);
                
                // Remove the server from the global network
                delete globalNetwork.servers[message.guild.id];
                db.setGlobalNetwork(globalNetwork);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Global Chat Disabled',
                            `Global chat has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current global chat settings
                const connectedServers = Object.keys(globalNetwork.servers).length;
                const channelInfo = globalChatSettings.channel ? `<#${globalChatSettings.channel}>` : 'Not set';
                
                const statusEmbed = infoEmbed(
                    'Global Chat Status',
                    `Current global chat settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: globalChatSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: channelInfo, inline: true },
                        { name: 'Network Size', value: `${connectedServers} servers connected`, inline: true },
                        { name: 'Block Images', value: globalChatSettings.blockImages ? 'Yes' : 'No', inline: true },
                        { name: 'Block Links', value: globalChatSettings.blockLinks ? 'Yes' : 'No', inline: true },
                        { name: 'Message Cooldown', value: `${globalChatSettings.cooldown} seconds`, inline: true },
                        { name: 'Total Messages', value: globalNetwork.messageCount.toString(), inline: true }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'channel':
                // Set the global chat channel
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Channel',
                                `Please mention a channel to set as the global chat channel.`,
                                [{ name: 'Usage', value: `${client.config.prefix}globalchat channel <#channel>` }]
                            )
                        ]
                    });
                }
                
                // Check if the channel is in this guild
                if (channel.guild.id !== message.guild.id) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel',
                                `The mentioned channel must be in this server.`
                            )
                        ]
                    });
                }
                
                // Check if the bot can send messages to this channel
                if (!channel.permissionsFor(message.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Permissions',
                                `I don't have permission to send messages or embeds to ${channel}.`,
                                [{ name: 'Required Permissions', value: 'Send Messages, Embed Links' }]
                            )
                        ]
                    });
                }
                
                // Check if the channel is already used by another server
                const channelAlreadyInUse = Object.entries(globalNetwork.servers).some(
                    ([serverId, channelId]) => channelId === channel.id && serverId !== message.guild.id
                );
                
                if (channelAlreadyInUse) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Channel Already In Use',
                                `This channel is already being used for global chat by another server.`
                            )
                        ]
                    });
                }
                
                // Update the settings
                globalChatSettings.channel = channel.id;
                db.setGlobalChat(message.guild.id, globalChatSettings);
                
                // Update the network if global chat is enabled
                if (globalChatSettings.enabled) {
                    globalNetwork.servers[message.guild.id] = channel.id;
                    db.setGlobalNetwork(globalNetwork);
                }
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Global Chat Channel Updated',
                            `Global chat messages will now be sent to ${channel}.`,
                            [{ name: 'Note', value: globalChatSettings.enabled 
                                ? 'Global chat is currently enabled.' 
                                : 'Global chat is currently disabled. Enable it with `globalchat enable`.' }]
                        )
                    ]
                });
                break;
                
            case 'settings':
                // Configure global chat settings
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Global Chat Settings',
                                `Configure settings for global chat:`,
                                [
                                    { name: `${client.config.prefix}globalchat settings blockImages <true|false>`, value: 'Block images in global chat' },
                                    { name: `${client.config.prefix}globalchat settings blockLinks <true|false>`, value: 'Block links in global chat' },
                                    { name: `${client.config.prefix}globalchat settings cooldown <seconds>`, value: 'Set cooldown between messages (1-60 seconds)' },
                                    { name: 'Current Settings', value: `Block Images: ${globalChatSettings.blockImages ? 'Yes' : 'No'}\nBlock Links: ${globalChatSettings.blockLinks ? 'Yes' : 'No'}\nCooldown: ${globalChatSettings.cooldown} seconds` }
                                ]
                            )
                        ]
                    });
                }
                
                const settingOption = args[1].toLowerCase();
                const settingValue = args[2]?.toLowerCase();
                
                switch (settingOption) {
                    case 'blockimages':
                        if (!settingValue || !['true', 'false'].includes(settingValue)) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify either 'true' or 'false'.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}globalchat settings blockImages <true|false>` }]
                                    )
                                ]
                            });
                        }
                        
                        globalChatSettings.blockImages = settingValue === 'true';
                        db.setGlobalChat(message.guild.id, globalChatSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `Images will ${globalChatSettings.blockImages ? 'now be blocked' : 'no longer be blocked'} in global chat.`
                                )
                            ]
                        });
                        break;
                        
                    case 'blocklinks':
                        if (!settingValue || !['true', 'false'].includes(settingValue)) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify either 'true' or 'false'.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}globalchat settings blockLinks <true|false>` }]
                                    )
                                ]
                            });
                        }
                        
                        globalChatSettings.blockLinks = settingValue === 'true';
                        db.setGlobalChat(message.guild.id, globalChatSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `Links will ${globalChatSettings.blockLinks ? 'now be blocked' : 'no longer be blocked'} in global chat.`
                                )
                            ]
                        });
                        break;
                        
                    case 'cooldown':
                        const cooldown = parseInt(settingValue);
                        
                        if (isNaN(cooldown) || cooldown < 1 || cooldown > 60) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify a cooldown between 1 and 60 seconds.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}globalchat settings cooldown <seconds>` }]
                                    )
                                ]
                            });
                        }
                        
                        globalChatSettings.cooldown = cooldown;
                        db.setGlobalChat(message.guild.id, globalChatSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `The global chat cooldown has been set to ${cooldown} seconds.`
                                )
                            ]
                        });
                        break;
                        
                    default:
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Setting',
                                    `"${settingOption}" is not a valid global chat setting.`,
                                    [{ name: 'Available Settings', value: 'blockImages, blockLinks, cooldown' }]
                                )
                            ]
                        });
                }
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid global chat subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};