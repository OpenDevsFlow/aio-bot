// Automod command for configuring server-specific auto-moderation settings
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'automod',
    aliases: ['automoderator', 'automoderation'],
    description: 'Configure auto-moderation settings for the server',
    usage: 'automod <enable|disable|status|action|words|mentions>',
    cooldown: 5,
    /**
     * Executes the automod command
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
        
        // Get the current automod settings
        const automodSettings = db.getAutomod(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Auto-Moderation Settings',
                        `Use these commands to configure auto-moderation for the server:`,
                        [
                            { name: `${client.config.prefix}automod enable`, value: 'Enable auto-moderation' },
                            { name: `${client.config.prefix}automod disable`, value: 'Disable auto-moderation' },
                            { name: `${client.config.prefix}automod status`, value: 'View current auto-moderation settings' },
                            { name: `${client.config.prefix}automod action <delete|warn|mute|kick>`, value: 'Set the action taken on violations' },
                            { name: `${client.config.prefix}automod words <add|remove|list> [word]`, value: 'Manage filtered words' },
                            { name: `${client.config.prefix}automod mentions <number>`, value: 'Set maximum allowed mentions in a message' },
                            { name: `${client.config.prefix}automod channel <#channel>`, value: 'Set the channel for logging automod actions' }
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable automod
                automodSettings.enabled = true;
                db.setAutomod(message.guild.id, automodSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Auto-Moderation Enabled',
                            `Auto-moderation has been enabled for this server.`,
                            [{ name: 'Action', value: `Messages that violate rules will be ${automodSettings.action}d.` }]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable automod
                automodSettings.enabled = false;
                db.setAutomod(message.guild.id, automodSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Auto-Moderation Disabled',
                            `Auto-moderation has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current automod settings
                const filteredWords = automodSettings.filteredWords.length > 0 
                    ? automodSettings.filteredWords.join(', ') 
                    : 'None';
                
                const statusEmbed = infoEmbed(
                    'Auto-Moderation Status',
                    `Current auto-moderation settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: automodSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Action', value: automodSettings.action, inline: true },
                        { name: 'Max Mentions', value: automodSettings.maxMentions.toString(), inline: true },
                        { name: 'Log Channel', value: automodSettings.logChannel ? `<#${automodSettings.logChannel}>` : 'None set', inline: true },
                        { name: 'Filtered Words', value: filteredWords.length > 1024 ? `${filteredWords.substring(0, 1020)}...` : filteredWords }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'action':
                // Set the action for violations
                const action = args[1]?.toLowerCase();
                const validActions = ['delete', 'warn', 'mute', 'kick'];
                
                if (!action || !validActions.includes(action)) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Action',
                                `Please specify a valid action: ${validActions.join(', ')}`,
                                [{ name: 'Usage', value: `${client.config.prefix}automod action <${validActions.join('|')}>` }]
                            )
                        ]
                    });
                }
                
                // Update the settings
                automodSettings.action = action;
                db.setAutomod(message.guild.id, automodSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Auto-Moderation Action Updated',
                            `The auto-moderation action has been set to "${action}".`
                        )
                    ]
                });
                break;
                
            case 'words':
                // Manage filtered words
                const wordsSubCommand = args[1]?.toLowerCase();
                
                if (!wordsSubCommand || !['add', 'remove', 'list'].includes(wordsSubCommand)) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Subcommand',
                                `Please specify a valid subcommand: add, remove, or list.`,
                                [{ name: 'Usage', value: `${client.config.prefix}automod words <add|remove|list> [word]` }]
                            )
                        ]
                    });
                }
                
                // List filtered words
                if (wordsSubCommand === 'list') {
                    const wordList = automodSettings.filteredWords.length > 0 
                        ? automodSettings.filteredWords.join(', ') 
                        : 'No filtered words set.';
                    
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Filtered Words',
                                `Current list of filtered words:`,
                                [{ name: 'Words', value: wordList.length > 1024 ? `${wordList.substring(0, 1020)}...` : wordList }]
                            )
                        ]
                    });
                }
                
                // Add or remove words
                const word = args[2]?.toLowerCase();
                
                if (!word) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Word',
                                `Please specify a word to ${wordsSubCommand}.`,
                                [{ name: 'Usage', value: `${client.config.prefix}automod words ${wordsSubCommand} <word>` }]
                            )
                        ]
                    });
                }
                
                if (wordsSubCommand === 'add') {
                    // Check if the word is already in the list
                    if (automodSettings.filteredWords.includes(word)) {
                        return message.reply({
                            embeds: [
                                errorEmbed(
                                    'Word Already Filtered',
                                    `The word "${word}" is already in the filtered words list.`
                                )
                            ]
                        });
                    }
                    
                    // Add the word to the list
                    automodSettings.filteredWords.push(word);
                    db.setAutomod(message.guild.id, automodSettings);
                    
                    message.reply({
                        embeds: [
                            successEmbed(
                                'Word Added',
                                `The word "${word}" has been added to the filtered words list.`
                            )
                        ]
                    });
                } else if (wordsSubCommand === 'remove') {
                    // Check if the word is in the list
                    if (!automodSettings.filteredWords.includes(word)) {
                        return message.reply({
                            embeds: [
                                errorEmbed(
                                    'Word Not Found',
                                    `The word "${word}" is not in the filtered words list.`
                                )
                            ]
                        });
                    }
                    
                    // Remove the word from the list
                    automodSettings.filteredWords = automodSettings.filteredWords.filter(w => w !== word);
                    db.setAutomod(message.guild.id, automodSettings);
                    
                    message.reply({
                        embeds: [
                            successEmbed(
                                'Word Removed',
                                `The word "${word}" has been removed from the filtered words list.`
                            )
                        ]
                    });
                }
                break;
                
            case 'mentions':
                // Set maximum allowed mentions
                const maxMentions = parseInt(args[1]);
                
                if (isNaN(maxMentions) || maxMentions < 1) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Number',
                                `Please specify a valid number greater than 0.`,
                                [{ name: 'Usage', value: `${client.config.prefix}automod mentions <number>` }]
                            )
                        ]
                    });
                }
                
                // Update the settings
                automodSettings.maxMentions = maxMentions;
                db.setAutomod(message.guild.id, automodSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Maximum Mentions Updated',
                            `The maximum allowed mentions has been set to ${maxMentions}.`
                        )
                    ]
                });
                break;
                
            case 'channel':
                // Set the log channel
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel',
                                `Please mention a valid channel.`,
                                [{ name: 'Usage', value: `${client.config.prefix}automod channel <#channel>` }]
                            )
                        ]
                    });
                }
                
                // Ensure the channel is a text channel
                if (channel.type !== 0) { // 0 is TextChannel type
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel Type',
                                `The log channel must be a text channel.`
                            )
                        ]
                    });
                }
                
                // Update the settings
                automodSettings.logChannel = channel.id;
                db.setAutomod(message.guild.id, automodSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Log Channel Updated',
                            `Auto-moderation logs will now be sent to ${channel}.`
                        )
                    ]
                });
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid automod subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};