// Autoreact command for configuring server-specific auto reactions
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'autoreact',
    aliases: ['autoreaction'],
    description: 'Configure automatic reactions to specific messages',
    usage: 'autoreact <enable|disable|status|add|remove|list>',
    cooldown: 5,
    /**
     * Executes the autoreact command
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
        
        // Get the current autoreact settings
        const autoreactSettings = db.getAutoreact(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Autoreact Settings',
                        `Use these commands to configure automatic reactions for the server:`,
                        [
                            { name: `${client.config.prefix}autoreact enable`, value: 'Enable autoreact' },
                            { name: `${client.config.prefix}autoreact disable`, value: 'Disable autoreact' },
                            { name: `${client.config.prefix}autoreact status`, value: 'View current autoreact settings' },
                            { name: `${client.config.prefix}autoreact add <trigger> | <emoji1> <emoji2>... [exact]`, value: 'Add an autoreaction. Use "|" to separate trigger and emojis. Add "exact" at the end for exact matching.' },
                            { name: `${client.config.prefix}autoreact remove <trigger>`, value: 'Remove an autoreaction by trigger' },
                            { name: `${client.config.prefix}autoreact list`, value: 'List all configured autoreactions' },
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable autoreact
                autoreactSettings.enabled = true;
                db.setAutoreact(message.guild.id, autoreactSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoreact Enabled',
                            `The autoreact system has been enabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable autoreact
                autoreactSettings.enabled = false;
                db.setAutoreact(message.guild.id, autoreactSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoreact Disabled',
                            `The autoreact system has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current autoreact settings
                const statusEmbed = infoEmbed(
                    'Autoreact Status',
                    `Current autoreact settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: autoreactSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Configured Reactions', value: autoreactSettings.reactions.length.toString(), inline: true },
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'add':
                // Add an autoreaction
                // Expected format: autoreact add trigger | 👍 👎 [exact]
                const fullArgs = message.content.slice(client.config.prefix.length).trim().split(/ +/g);
                // Remove the first two arguments (command name and subcommand)
                fullArgs.shift();
                fullArgs.shift();
                // Join remaining arguments back into a string
                const addContent = fullArgs.join(' ');
                
                // Split by the first pipe character
                const splitParts = addContent.split('|');
                
                if (splitParts.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Format',
                                `Please use the correct format to add an autoreaction.`,
                                [{ name: 'Format', value: `${client.config.prefix}autoreact add <trigger> | <emoji1> <emoji2>... [exact]` }]
                            )
                        ]
                    });
                }
                
                let trigger = splitParts[0].trim();
                let emojisPart = splitParts[1].trim();
                
                if (!trigger || !emojisPart) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Parameters',
                                `Both trigger and emojis must be provided.`,
                                [{ name: 'Format', value: `${client.config.prefix}autoreact add <trigger> | <emoji1> <emoji2>... [exact]` }]
                            )
                        ]
                    });
                }
                
                // Check if this is an exact match
                let exactMatch = false;
                const parts = emojisPart.split(' ');
                
                if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'exact') {
                    exactMatch = true;
                    parts.pop(); // Remove the 'exact' flag
                    emojisPart = parts.join(' ');
                }
                
                // Parse emojis
                const emojiRegex = /<a?:\w+:\d+>|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
                
                const emojis = [];
                let match;
                while ((match = emojiRegex.exec(emojisPart)) !== null) {
                    emojis.push(match[0]);
                }
                
                // Custom emoji format: <:name:id> or <a:name:id>
                const customEmojiRegex = /<a?:\w+:\d+>/g;
                let customMatch;
                while ((customMatch = customEmojiRegex.exec(emojisPart)) !== null) {
                    if (!emojis.includes(customMatch[0])) {
                        emojis.push(customMatch[0]);
                    }
                }
                
                // Also add non-emoji words as potential emoji names
                const words = emojisPart.split(' ');
                for (const word of words) {
                    // Check if it's not already added and not 'exact'
                    if (!emojis.includes(word) && word.toLowerCase() !== 'exact') {
                        // Try to resolve it as an emoji name from the server
                        const emoji = message.guild.emojis.cache.find(e => e.name === word);
                        if (emoji) {
                            emojis.push(emoji.toString());
                        }
                    }
                }
                
                if (emojis.length === 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'No Valid Emojis',
                                `No valid emojis were found in your input. Please provide at least one valid emoji.`,
                                [{ name: 'Format', value: `${client.config.prefix}autoreact add <trigger> | <emoji1> <emoji2>... [exact]` }]
                            )
                        ]
                    });
                }
                
                // Check if the trigger already exists
                const existingReactionIndex = autoreactSettings.reactions.findIndex(r => 
                    r.trigger.toLowerCase() === trigger.toLowerCase() && r.exactMatch === exactMatch
                );
                
                if (existingReactionIndex >= 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Trigger Already Exists',
                                `This trigger is already configured with ${exactMatch ? 'exact' : 'partial'} matching.`,
                                [{ name: 'Existing Emojis', value: autoreactSettings.reactions[existingReactionIndex].emojis.join(' ') }]
                            )
                        ]
                    });
                }
                
                // Add the new autoreaction
                autoreactSettings.reactions.push({
                    trigger,
                    emojis,
                    exactMatch
                });
                
                // Save the updated settings
                db.setAutoreact(message.guild.id, autoreactSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoreaction Added',
                            `A new autoreaction has been added.`,
                            [
                                { name: 'Trigger', value: trigger },
                                { name: 'Emojis', value: emojis.join(' ') },
                                { name: 'Matching', value: exactMatch ? 'Exact match only' : 'Partial match' }
                            ]
                        )
                    ]
                });
                break;
                
            case 'remove':
                // Remove an autoreaction
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Trigger',
                                `Please specify the trigger to remove.`,
                                [{ name: 'Usage', value: `${client.config.prefix}autoreact remove <trigger>` }]
                            )
                        ]
                    });
                }
                
                // Get the trigger (everything after "remove")
                const triggerToRemove = args.slice(1).join(' ').toLowerCase();
                
                // Find matching autoreactions (both exact and partial matches)
                const matchingReactions = autoreactSettings.reactions.filter(r => 
                    r.trigger.toLowerCase() === triggerToRemove
                );
                
                if (matchingReactions.length === 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Trigger Not Found',
                                `Could not find any autoreaction with that trigger.`
                            )
                        ]
                    });
                }
                
                // If only one match, remove it
                if (matchingReactions.length === 1) {
                    autoreactSettings.reactions = autoreactSettings.reactions.filter(r => 
                        r.trigger.toLowerCase() !== triggerToRemove
                    );
                    
                    db.setAutoreact(message.guild.id, autoreactSettings);
                    
                    return message.reply({
                        embeds: [
                            successEmbed(
                                'Autoreaction Removed',
                                `The autoreaction for trigger "${triggerToRemove}" has been removed.`
                            )
                        ]
                    });
                }
                
                // If multiple matches (exact and partial), remove both
                autoreactSettings.reactions = autoreactSettings.reactions.filter(r => 
                    r.trigger.toLowerCase() !== triggerToRemove
                );
                
                db.setAutoreact(message.guild.id, autoreactSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoreactions Removed',
                            `All autoreactions with the trigger "${triggerToRemove}" have been removed.`,
                            [{ name: 'Reactions Removed', value: matchingReactions.length.toString() }]
                        )
                    ]
                });
                break;
                
            case 'list':
                // List all autoreactions
                if (autoreactSettings.reactions.length === 0) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Autoreactions',
                                `There are no autoreactions configured for this server.`,
                                [{ name: 'Add an Autoreaction', value: `Use \`${client.config.prefix}autoreact add <trigger> | <emoji1> <emoji2>... [exact]\` to add one.` }]
                            )
                        ]
                    });
                }
                
                // Create the list embed
                const listEmbed = infoEmbed(
                    'Autoreactions',
                    `Here are all the configured autoreactions for ${message.guild.name}:`,
                    []
                );
                
                // Add each autoreaction as a field
                let count = 1;
                for (const reaction of autoreactSettings.reactions) {
                    listEmbed.addFields([{
                        name: `${count}. "${reaction.trigger}" (${reaction.exactMatch ? 'Exact' : 'Partial'})`,
                        value: reaction.emojis.join(' ')
                    }]);
                    count++;
                    
                    // Discord embeds have a limit of 25 fields
                    if (count > 25) {
                        listEmbed.setFooter({ text: `Showing 25/${autoreactSettings.reactions.length} reactions. Use more specific commands to view others.` });
                        break;
                    }
                }
                
                message.reply({ embeds: [listEmbed] });
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid autoreact subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};