// Welcome command for configuring welcome messages for new members
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'welcome',
    aliases: ['welcomer', 'greet'],
    description: 'Configure welcome messages for new members',
    usage: 'welcome <enable|disable|status|channel|message|dmmessage|embed>',
    cooldown: 5,
    /**
     * Executes the welcome command
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
        
        // Get the current welcome settings
        const welcomeSettings = db.getWelcome(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Welcome Settings',
                        `Use these commands to configure welcome messages for new members:`,
                        [
                            { name: `${client.config.prefix}welcome enable`, value: 'Enable welcome messages' },
                            { name: `${client.config.prefix}welcome disable`, value: 'Disable welcome messages' },
                            { name: `${client.config.prefix}welcome status`, value: 'View current welcome settings' },
                            { name: `${client.config.prefix}welcome channel <#channel>`, value: 'Set the channel for welcome messages' },
                            { name: `${client.config.prefix}welcome message <message>`, value: 'Set the welcome message (use {user} for member mention, {username} for name, {server} for server name, {membercount} for member count)' },
                            { name: `${client.config.prefix}welcome dmmessage <message>`, value: 'Set a direct message to send to new members (use same variables as above, leave empty to disable)' },
                            { name: `${client.config.prefix}welcome embed <enable|disable|color>`, value: 'Configure embed settings for welcome messages' },
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable welcome messages
                welcomeSettings.enabled = true;
                
                // Check if a channel is set
                if (!welcomeSettings.channel) {
                    const embed = successEmbed(
                        'Welcome Messages Enabled',
                        `Welcome messages have been enabled, but no channel is set.`,
                        [{ name: 'Set Channel', value: `Use \`${client.config.prefix}welcome channel <#channel>\` to set a channel.` }]
                    );
                    
                    db.setWelcome(message.guild.id, welcomeSettings);
                    return message.reply({ embeds: [embed] });
                }
                
                db.setWelcome(message.guild.id, welcomeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Welcome Messages Enabled',
                            `Welcome messages have been enabled for this server.`,
                            [{ name: 'Channel', value: `<#${welcomeSettings.channel}>` }]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable welcome messages
                welcomeSettings.enabled = false;
                db.setWelcome(message.guild.id, welcomeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Welcome Messages Disabled',
                            `Welcome messages have been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current welcome settings
                const statusEmbed = infoEmbed(
                    'Welcome Settings',
                    `Current welcome settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: welcomeSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: welcomeSettings.channel ? `<#${welcomeSettings.channel}>` : 'Not set', inline: true },
                        { name: 'Using Embeds', value: welcomeSettings.embedEnabled ? 'Yes' : 'No', inline: true },
                        { name: 'Embed Color', value: welcomeSettings.embedColor, inline: true },
                        { name: 'Show Avatar', value: welcomeSettings.embedThumbnail ? 'Yes' : 'No', inline: true },
                        { name: 'Welcome Message', value: welcomeSettings.message || 'Default message' },
                        { name: 'DM Message', value: welcomeSettings.dmMessage || 'None' }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'channel':
                // Set the welcome channel
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Channel',
                                `Please mention a channel to set as the welcome channel.`,
                                [{ name: 'Usage', value: `${client.config.prefix}welcome channel <#channel>` }]
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
                if (!channel.permissionsFor(message.guild.members.me).has('SendMessages')) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Permissions',
                                `I don't have permission to send messages to ${channel}.`,
                                [{ name: 'Required Permissions', value: 'Send Messages' }]
                            )
                        ]
                    });
                }
                
                // Update the settings
                welcomeSettings.channel = channel.id;
                db.setWelcome(message.guild.id, welcomeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Welcome Channel Updated',
                            `Welcome messages will now be sent to ${channel}.`,
                            [{ name: 'Note', value: welcomeSettings.enabled 
                                ? 'Welcome messages are currently enabled.' 
                                : 'Welcome messages are currently disabled. Enable them with `welcome enable`.' }]
                        )
                    ]
                });
                break;
                
            case 'message':
                // Set the welcome message
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Welcome Message',
                                `The current welcome message is:`,
                                [
                                    { name: 'Message', value: welcomeSettings.message || 'Welcome to the server, {user}!' },
                                    { name: 'Usage', value: `${client.config.prefix}welcome message <message>` },
                                    { name: 'Variables', value: '{user} - Mentions the user\n{username} - The user\'s name\n{server} - The server name\n{membercount} - The server\'s member count' }
                                ]
                            )
                        ]
                    });
                }
                
                // Get the message (everything after "message")
                const welcomeMessage = args.slice(1).join(' ');
                
                // Update the settings
                welcomeSettings.message = welcomeMessage;
                db.setWelcome(message.guild.id, welcomeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Welcome Message Updated',
                            `The welcome message has been updated.`,
                            [
                                { name: 'New Message', value: welcomeMessage },
                                { name: 'Preview', value: welcomeMessage
                                    .replace(/{user}/g, message.author)
                                    .replace(/{username}/g, message.author.username)
                                    .replace(/{server}/g, message.guild.name)
                                    .replace(/{membercount}/g, message.guild.memberCount.toString())
                                }
                            ]
                        )
                    ]
                });
                break;
                
            case 'dmmessage':
                // Set the DM welcome message
                if (args.length < 2) {
                    // If no message provided, show current or clear the message
                    if (welcomeSettings.dmMessage) {
                        return message.reply({
                            embeds: [
                                infoEmbed(
                                    'DM Welcome Message',
                                    `The current DM welcome message is:`,
                                    [
                                        { name: 'Message', value: welcomeSettings.dmMessage },
                                        { name: 'Usage', value: `${client.config.prefix}welcome dmmessage <message>` },
                                        { name: 'To Disable', value: `Use \`${client.config.prefix}welcome dmmessage clear\` to disable DM welcome messages.` },
                                        { name: 'Variables', value: '{user} - Mentions the user\n{username} - The user\'s name\n{server} - The server name\n{membercount} - The server\'s member count' }
                                    ]
                                )
                            ]
                        });
                    } else {
                        return message.reply({
                            embeds: [
                                infoEmbed(
                                    'DM Welcome Message',
                                    `No DM welcome message is currently set.`,
                                    [
                                        { name: 'Usage', value: `${client.config.prefix}welcome dmmessage <message>` },
                                        { name: 'Variables', value: '{user} - Mentions the user\n{username} - The user\'s name\n{server} - The server name\n{membercount} - The server\'s member count' }
                                    ]
                                )
                            ]
                        });
                    }
                }
                
                // Check if trying to clear the DM message
                if (args[1].toLowerCase() === 'clear') {
                    welcomeSettings.dmMessage = '';
                    db.setWelcome(message.guild.id, welcomeSettings);
                    
                    return message.reply({
                        embeds: [
                            successEmbed(
                                'DM Welcome Message Cleared',
                                `New members will no longer receive a DM welcome message.`
                            )
                        ]
                    });
                }
                
                // Get the message (everything after "dmmessage")
                const dmWelcomeMessage = args.slice(1).join(' ');
                
                // Update the settings
                welcomeSettings.dmMessage = dmWelcomeMessage;
                db.setWelcome(message.guild.id, welcomeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'DM Welcome Message Updated',
                            `The DM welcome message has been updated.`,
                            [
                                { name: 'New Message', value: dmWelcomeMessage },
                                { name: 'Preview', value: dmWelcomeMessage
                                    .replace(/{user}/g, message.author.username) // Can't mention in DMs
                                    .replace(/{username}/g, message.author.username)
                                    .replace(/{server}/g, message.guild.name)
                                    .replace(/{membercount}/g, message.guild.memberCount.toString())
                                }
                            ]
                        )
                    ]
                });
                break;
                
            case 'embed':
                // Configure embed settings
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Welcome Embed Settings',
                                `Configure embed settings for welcome messages:`,
                                [
                                    { name: `${client.config.prefix}welcome embed enable`, value: 'Enable embeds for welcome messages' },
                                    { name: `${client.config.prefix}welcome embed disable`, value: 'Disable embeds for welcome messages' },
                                    { name: `${client.config.prefix}welcome embed color <hex color>`, value: 'Set the color for welcome embeds (e.g., #5865F2)' },
                                    { name: `${client.config.prefix}welcome embed thumbnail <on|off>`, value: 'Toggle whether to show the user\'s avatar in the embed' }
                                ]
                            )
                        ]
                    });
                }
                
                const embedSubCommand = args[1].toLowerCase();
                
                switch (embedSubCommand) {
                    case 'enable':
                        welcomeSettings.embedEnabled = true;
                        db.setWelcome(message.guild.id, welcomeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Welcome Embeds Enabled',
                                    `Welcome messages will now be sent as embeds.`
                                )
                            ]
                        });
                        break;
                        
                    case 'disable':
                        welcomeSettings.embedEnabled = false;
                        db.setWelcome(message.guild.id, welcomeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Welcome Embeds Disabled',
                                    `Welcome messages will now be sent as plain text.`
                                )
                            ]
                        });
                        break;
                        
                    case 'color':
                        // Set embed color
                        if (args.length < 3) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Missing Color',
                                        `Please specify a hex color code.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}welcome embed color <hex color>` }]
                                    )
                                ]
                            });
                        }
                        
                        const colorCode = args[2].startsWith('#') ? args[2] : `#${args[2]}`;
                        
                        // Validate the color code
                        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
                        if (!hexColorRegex.test(colorCode)) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Color',
                                        `Please provide a valid hex color code (e.g., #5865F2).`
                                    )
                                ]
                            });
                        }
                        
                        welcomeSettings.embedColor = colorCode;
                        db.setWelcome(message.guild.id, welcomeSettings);
                        
                        // Create an embed with the new color to demonstrate
                        const colorEmbed = successEmbed(
                            'Embed Color Updated',
                            `Welcome embeds will now use the color ${colorCode}.`
                        );
                        
                        colorEmbed.setColor(colorCode);
                        
                        message.reply({ embeds: [colorEmbed] });
                        break;
                        
                    case 'thumbnail':
                        // Toggle thumbnail
                        if (args.length < 3) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Missing Option',
                                        `Please specify either "on" or "off".`,
                                        [{ name: 'Usage', value: `${client.config.prefix}welcome embed thumbnail <on|off>` }]
                                    )
                                ]
                            });
                        }
                        
                        const thumbnailOption = args[2].toLowerCase();
                        
                        if (thumbnailOption !== 'on' && thumbnailOption !== 'off') {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Option',
                                        `Please specify either "on" or "off".`,
                                        [{ name: 'Usage', value: `${client.config.prefix}welcome embed thumbnail <on|off>` }]
                                    )
                                ]
                            });
                        }
                        
                        welcomeSettings.embedThumbnail = thumbnailOption === 'on';
                        db.setWelcome(message.guild.id, welcomeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Thumbnail Setting Updated',
                                    `Welcome embeds will ${welcomeSettings.embedThumbnail ? 'now' : 'no longer'} include the user's avatar as a thumbnail.`
                                )
                            ]
                        });
                        break;
                        
                    default:
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Embed Subcommand',
                                    `"${embedSubCommand}" is not a valid embed subcommand.`,
                                    [{ name: 'Available Subcommands', value: 'enable, disable, color, thumbnail' }]
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
                            `"${subCommand}" is not a valid welcome subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};