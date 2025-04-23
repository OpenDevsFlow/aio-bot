// Autoresponder command for configuring server-specific auto responses
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'autoresponder',
    aliases: ['autorespond', 'autoreply'],
    description: 'Configure automatic responses to specific messages',
    usage: 'autoresponder <enable|disable|status|add|remove|list>',
    cooldown: 5,
    /**
     * Executes the autoresponder command
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
        
        // Get the current autoresponder settings
        const autoresponderSettings = db.getAutoresponder(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Autoresponder Settings',
                        `Use these commands to configure automatic responses for the server:`,
                        [
                            { name: `${client.config.prefix}autoresponder enable`, value: 'Enable autoresponder' },
                            { name: `${client.config.prefix}autoresponder disable`, value: 'Disable autoresponder' },
                            { name: `${client.config.prefix}autoresponder status`, value: 'View current autoresponder settings' },
                            { name: `${client.config.prefix}autoresponder add <trigger> | <response> [exact]`, value: 'Add an autoresponse. Use "|" to separate trigger and response. Add "exact" at the end for exact matching.' },
                            { name: `${client.config.prefix}autoresponder remove <trigger>`, value: 'Remove an autoresponse by trigger' },
                            { name: `${client.config.prefix}autoresponder list`, value: 'List all configured autoresponses' },
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable autoresponder
                autoresponderSettings.enabled = true;
                db.setAutoresponder(message.guild.id, autoresponderSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoresponder Enabled',
                            `The autoresponder has been enabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable autoresponder
                autoresponderSettings.enabled = false;
                db.setAutoresponder(message.guild.id, autoresponderSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoresponder Disabled',
                            `The autoresponder has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current autoresponder settings
                const statusEmbed = infoEmbed(
                    'Autoresponder Status',
                    `Current autoresponder settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: autoresponderSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Configured Responses', value: autoresponderSettings.responses.length.toString(), inline: true },
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'add':
                // Add an autoresponse
                // Expected format: autoresponder add trigger | response [exact]
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
                                `Please use the correct format to add an autoresponse.`,
                                [{ name: 'Format', value: `${client.config.prefix}autoresponder add <trigger> | <response> [exact]` }]
                            )
                        ]
                    });
                }
                
                let trigger = splitParts[0].trim();
                let response = splitParts.slice(1).join('|').trim(); // Rejoin in case there are multiple pipes
                
                if (!trigger || !response) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Parameters',
                                `Both trigger and response must be provided.`,
                                [{ name: 'Format', value: `${client.config.prefix}autoresponder add <trigger> | <response> [exact]` }]
                            )
                        ]
                    });
                }
                
                // Check if this is an exact match
                let exactMatch = false;
                if (response.endsWith(' exact')) {
                    exactMatch = true;
                    response = response.slice(0, -6).trim(); // Remove the 'exact' flag
                }
                
                // Check if the trigger already exists
                const existingResponseIndex = autoresponderSettings.responses.findIndex(r => 
                    r.trigger.toLowerCase() === trigger.toLowerCase() && r.exactMatch === exactMatch
                );
                
                if (existingResponseIndex >= 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Trigger Already Exists',
                                `This trigger is already configured with ${exactMatch ? 'exact' : 'partial'} matching.`,
                                [{ name: 'Existing Response', value: autoresponderSettings.responses[existingResponseIndex].response }]
                            )
                        ]
                    });
                }
                
                // Add the new autoresponse
                autoresponderSettings.responses.push({
                    trigger,
                    response,
                    exactMatch
                });
                
                // Save the updated settings
                db.setAutoresponder(message.guild.id, autoresponderSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoresponse Added',
                            `A new autoresponse has been added.`,
                            [
                                { name: 'Trigger', value: trigger },
                                { name: 'Response', value: response },
                                { name: 'Matching', value: exactMatch ? 'Exact match only' : 'Partial match' }
                            ]
                        )
                    ]
                });
                break;
                
            case 'remove':
                // Remove an autoresponse
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Trigger',
                                `Please specify the trigger to remove.`,
                                [{ name: 'Usage', value: `${client.config.prefix}autoresponder remove <trigger>` }]
                            )
                        ]
                    });
                }
                
                // Get the trigger (everything after "remove")
                const triggersToRemove = args.slice(1).join(' ').toLowerCase();
                
                // Find matching autoresponses (both exact and partial matches)
                const matchingResponses = autoresponderSettings.responses.filter(r => 
                    r.trigger.toLowerCase() === triggersToRemove
                );
                
                if (matchingResponses.length === 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Trigger Not Found',
                                `Could not find any autoresponse with that trigger.`
                            )
                        ]
                    });
                }
                
                // If only one match, remove it
                if (matchingResponses.length === 1) {
                    autoresponderSettings.responses = autoresponderSettings.responses.filter(r => 
                        r.trigger.toLowerCase() !== triggersToRemove
                    );
                    
                    db.setAutoresponder(message.guild.id, autoresponderSettings);
                    
                    return message.reply({
                        embeds: [
                            successEmbed(
                                'Autoresponse Removed',
                                `The autoresponse for trigger "${triggersToRemove}" has been removed.`
                            )
                        ]
                    });
                }
                
                // If multiple matches (exact and partial), remove both
                autoresponderSettings.responses = autoresponderSettings.responses.filter(r => 
                    r.trigger.toLowerCase() !== triggersToRemove
                );
                
                db.setAutoresponder(message.guild.id, autoresponderSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autoresponses Removed',
                            `All autoresponses with the trigger "${triggersToRemove}" have been removed.`,
                            [{ name: 'Responses Removed', value: matchingResponses.length.toString() }]
                        )
                    ]
                });
                break;
                
            case 'list':
                // List all autoresponses
                if (autoresponderSettings.responses.length === 0) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Autoresponses',
                                `There are no autoresponses configured for this server.`,
                                [{ name: 'Add an Autoresponse', value: `Use \`${client.config.prefix}autoresponder add <trigger> | <response> [exact]\` to add one.` }]
                            )
                        ]
                    });
                }
                
                // Create the list embed
                const listEmbed = infoEmbed(
                    'Autoresponses',
                    `Here are all the configured autoresponses for ${message.guild.name}:`,
                    []
                );
                
                // Add each autoresponse as a field
                let count = 1;
                for (const response of autoresponderSettings.responses) {
                    listEmbed.addFields([{
                        name: `${count}. "${response.trigger}" (${response.exactMatch ? 'Exact' : 'Partial'})`,
                        value: response.response.length > 1024 ? response.response.substring(0, 1020) + '...' : response.response
                    }]);
                    count++;
                    
                    // Discord embeds have a limit of 25 fields
                    if (count > 25) {
                        listEmbed.setFooter({ text: `Showing 25/${autoresponderSettings.responses.length} responses. Use more specific commands to view others.` });
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
                            `"${subCommand}" is not a valid autoresponder subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};