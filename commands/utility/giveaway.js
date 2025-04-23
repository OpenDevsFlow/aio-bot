// Giveaway command for running giveaways in a server
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'giveaway',
    aliases: ['gw', 'giveaways'],
    description: 'Create and manage giveaways',
    usage: 'giveaway <create|end|reroll|delete|list|settings>',
    cooldown: 3,
    /**
     * Executes the giveaway command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if the user has the required permissions
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
        
        // Get the giveaway data for this server
        const giveawayData = db.getGiveaways(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Giveaway Commands',
                        `Use these commands to manage giveaways:`,
                        [
                            { name: `${client.config.prefix}giveaway create <prize> [duration] [winners]`, value: 'Create a new giveaway (duration format: 1d, 2h, 30m)' },
                            { name: `${client.config.prefix}giveaway end <giveawayID>`, value: 'End a giveaway early' },
                            { name: `${client.config.prefix}giveaway reroll <giveawayID>`, value: 'Reroll the winners of a completed giveaway' },
                            { name: `${client.config.prefix}giveaway delete <giveawayID>`, value: 'Delete a giveaway (completed or active)' },
                            { name: `${client.config.prefix}giveaway list`, value: 'List all active giveaways' },
                            { name: `${client.config.prefix}giveaway settings <option> <value>`, value: 'Configure giveaway settings' }
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'create':
                // Create a new giveaway
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Prize',
                                `Please specify a prize for the giveaway.`,
                                [{ name: 'Usage', value: `${client.config.prefix}giveaway create <prize> [duration] [winners]` }]
                            )
                        ]
                    });
                }
                
                // Get the prize (everything after "create")
                let prize = args.slice(1).join(' ');
                let duration = giveawayData.settings.defaultDuration; // Default: 24 hours
                let winners = giveawayData.settings.defaultWinners; // Default: 1
                
                // Check for duration and winners parameters
                const durationMatch = prize.match(/\s(\d+[dhms])\s?$/i);
                if (durationMatch) {
                    // Extract duration from the end of the prize
                    const durationStr = durationMatch[1];
                    prize = prize.replace(durationMatch[0], '').trim();
                    
                    // Parse the duration
                    const value = parseInt(durationStr);
                    const unit = durationStr.slice(-1).toLowerCase();
                    
                    if (!isNaN(value) && value > 0) {
                        switch (unit) {
                            case 'd': duration = value * 24 * 60 * 60 * 1000; break; // days to ms
                            case 'h': duration = value * 60 * 60 * 1000; break; // hours to ms
                            case 'm': duration = value * 60 * 1000; break; // minutes to ms
                            case 's': duration = value * 1000; break; // seconds to ms
                            default: duration = giveawayData.settings.defaultDuration;
                        }
                    }
                }
                
                // Check for winners parameter (at the very end with format "2w")
                const winnersMatch = prize.match(/\s(\d+)w\s?$/i);
                if (winnersMatch) {
                    // Extract winners from the end of the prize
                    const winnersStr = winnersMatch[1];
                    prize = prize.replace(winnersMatch[0], '').trim();
                    
                    // Parse the winners
                    const numWinners = parseInt(winnersStr);
                    if (!isNaN(numWinners) && numWinners > 0) {
                        winners = numWinners;
                    }
                }
                
                // Calculate end time
                const endTime = Date.now() + duration;
                
                // Create the giveaway embed
                const giveawayEmbed = new EmbedBuilder()
                    .setColor(giveawayData.settings.embedColor)
                    .setTitle('🎉 Giveaway 🎉')
                    .setDescription(`**${prize}**\\n\\nReact with 🎉 to enter!`)
                    .addFields([
                        { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                        { name: 'Hosted By', value: `${message.author}`, inline: true },
                        { name: 'Winners', value: `${winners}`, inline: true }
                    ])
                    .setFooter({ text: `Giveaway by ${client.user.username}` })
                    .setTimestamp(endTime);
                
                // Create the buttons for the giveaway
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('giveaway_enter')
                            .setLabel('Enter Giveaway')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎉'),
                        new ButtonBuilder()
                            .setCustomId('giveaway_info')
                            .setLabel('Info')
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                // Send the giveaway message
                message.channel.send({ embeds: [giveawayEmbed], components: [buttons] })
                    .then(giveawayMessage => {
                        // Create a unique ID for the giveaway
                        const giveawayId = giveawayMessage.id;
                        
                        // Create the giveaway data
                        const newGiveaway = {
                            id: giveawayId,
                            channelId: giveawayMessage.channel.id,
                            messageId: giveawayMessage.id,
                            prize: prize,
                            endTime: endTime,
                            winners: winners,
                            hostedBy: message.author.id,
                            entries: [],
                            ended: false,
                            winnerIds: []
                        };
                        
                        // Add the giveaway to active giveaways
                        giveawayData.active.push(newGiveaway);
                        db.setGiveaways(message.guild.id, giveawayData);
                        
                        // Schedule the giveaway to end
                        setTimeout(() => {
                            endGiveaway(client, message.guild, giveawayId);
                        }, duration);
                        
                        // Confirm to the user
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Giveaway Created',
                                    `Your giveaway for **${prize}** has been created!`,
                                    [
                                        { name: 'Duration', value: formatDuration(duration), inline: true },
                                        { name: 'Winners', value: `${winners}`, inline: true },
                                        { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
                                    ]
                                )
                            ]
                        });
                    })
                    .catch(error => {
                        console.error('Error creating giveaway:', error);
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Error Creating Giveaway',
                                    `An error occurred while creating the giveaway: ${error.message}`
                                )
                            ]
                        });
                    });
                break;
                
            case 'end':
                // End a giveaway early
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Giveaway ID',
                                `Please specify the ID of the giveaway to end.`,
                                [{ name: 'Usage', value: `${client.config.prefix}giveaway end <giveawayID>` }]
                            )
                        ]
                    });
                }
                
                const giveawayIdToEnd = args[1];
                
                // Find the giveaway in active giveaways
                const giveawayToEnd = giveawayData.active.find(g => g.id === giveawayIdToEnd || g.messageId === giveawayIdToEnd);
                
                if (!giveawayToEnd) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Giveaway Not Found',
                                `Could not find an active giveaway with ID ${giveawayIdToEnd}.`
                            )
                        ]
                    });
                }
                
                // Check if the giveaway has already ended
                if (giveawayToEnd.ended) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Giveaway Already Ended',
                                `This giveaway has already ended.`
                            )
                        ]
                    });
                }
                
                // End the giveaway
                const endResult = endGiveaway(client, message.guild, giveawayToEnd.id).then(() => {}).catch(() => {});
                
                if (endResult.success) {
                    message.reply({
                        embeds: [
                            successEmbed(
                                'Giveaway Ended',
                                `The giveaway for **${giveawayToEnd.prize}** has been ended early.`,
                                [{ name: 'Winners', value: endResult.winners.length > 0 ? endResult.winners.map(id => `<@${id}>`).join(', ') : 'No valid entries' }]
                            )
                        ]
                    });
                } else {
                    message.reply({
                        embeds: [
                            errorEmbed(
                                'Error Ending Giveaway',
                                endResult.error || 'An error occurred while ending the giveaway.'
                            )
                        ]
                    });
                }
                break;
                
            case 'reroll':
                // Reroll the winners of a completed giveaway
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Giveaway ID',
                                `Please specify the ID of the giveaway to reroll.`,
                                [{ name: 'Usage', value: `${client.config.prefix}giveaway reroll <giveawayID>` }]
                            )
                        ]
                    });
                }
                
                const giveawayIdToReroll = args[1];
                
                // Find the giveaway in completed giveaways
                const giveawayToReroll = giveawayData.completed.find(g => g.id === giveawayIdToReroll || g.messageId === giveawayIdToReroll);
                
                if (!giveawayToReroll) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Giveaway Not Found',
                                `Could not find a completed giveaway with ID ${giveawayIdToReroll}.`
                            )
                        ]
                    });
                }
                
                // Check if there are entries
                if (giveawayToReroll.entries.length === 0) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'No Entries',
                                `This giveaway has no entries to reroll.`
                            )
                        ]
                    });
                }
                
                // Get number of winners to reroll
                let numWinnersToReroll = 1; // Default to 1 winner
                if (args[2] && !isNaN(parseInt(args[2]))) {
                    numWinnersToReroll = Math.min(parseInt(args[2]), giveawayToReroll.winners);
                }
                
                // Reroll the winners
                const newWinners = [];
                
                for (let i = 0; i < numWinnersToReroll; i++) {
                    // Get remaining eligible entries (not already picked as winners)
                    const eligibleEntries = giveawayToReroll.entries.filter(entry => !newWinners.includes(entry));
                    
                    if (eligibleEntries.length === 0) break;
                    
                    // Pick a random winner
                    const winnerIndex = Math.floor(Math.random() * eligibleEntries.length);
                    newWinners.push(eligibleEntries[winnerIndex]);
                }
                
                // Update the giveaway data
                giveawayToReroll.winnerIds = newWinners;
                db.setGiveaways(message.guild.id, giveawayData);
                
                // Try to get the channel and message
                const channelToReroll = message.guild.channels.cache.get(giveawayToReroll.channelId);
                
                if (channelToReroll) {
                    // Announce the new winners
                    const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
                    
                    channelToReroll.send({
                        embeds: [
                            successEmbed(
                                '🎉 Giveaway Rerolled 🎉',
                                `New winner${newWinners.length !== 1 ? 's' : ''} for **${giveawayToReroll.prize}**:`,
                                [{ name: 'Winner(s)', value: winnerMentions || 'No valid entries' }]
                            )
                        ]
                    }).catch(() => {});
                }
                
                // Confirm to the user
                message.reply({
                    embeds: [
                        successEmbed(
                            'Giveaway Rerolled',
                            `The giveaway for **${giveawayToReroll.prize}** has been rerolled.`,
                            [{ name: 'New Winner(s)', value: newWinners.map(id => `<@${id}>`).join(', ') || 'No valid entries' }]
                        )
                    ]
                });
                break;
                
            case 'delete':
                // Delete a giveaway
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Giveaway ID',
                                `Please specify the ID of the giveaway to delete.`,
                                [{ name: 'Usage', value: `${client.config.prefix}giveaway delete <giveawayID>` }]
                            )
                        ]
                    });
                }
                
                const giveawayIdToDelete = args[1];
                
                // Try to find the giveaway in active or completed giveaways
                const activeIndex = giveawayData.active.findIndex(g => g.id === giveawayIdToDelete || g.messageId === giveawayIdToDelete);
                const completedIndex = giveawayData.completed.findIndex(g => g.id === giveawayIdToDelete || g.messageId === giveawayIdToDelete);
                
                if (activeIndex === -1 && completedIndex === -1) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Giveaway Not Found',
                                `Could not find a giveaway with ID ${giveawayIdToDelete}.`
                            )
                        ]
                    });
                }
                
                let deletedGiveaway;
                
                if (activeIndex !== -1) {
                    // Delete from active giveaways
                    deletedGiveaway = giveawayData.active[activeIndex];
                    giveawayData.active.splice(activeIndex, 1);
                } else {
                    // Delete from completed giveaways
                    deletedGiveaway = giveawayData.completed[completedIndex];
                    giveawayData.completed.splice(completedIndex, 1);
                }
                
                // Save the updated giveaway data
                db.setGiveaways(message.guild.id, giveawayData);
                
                // Confirm to the user
                message.reply({
                    embeds: [
                        successEmbed(
                            'Giveaway Deleted',
                            `The giveaway for **${deletedGiveaway.prize}** has been deleted.`
                        )
                    ]
                });
                break;
                
            case 'list':
                // List all active giveaways
                if (giveawayData.active.length === 0) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'No Active Giveaways',
                                `There are no active giveaways in this server.`,
                                [{ name: 'Create a Giveaway', value: `Use \`${client.config.prefix}giveaway create <prize>\` to create one.` }]
                            )
                        ]
                    });
                }
                
                const giveawayList = giveawayData.active.map((giveaway, index) => {
                    return {
                        name: `${index + 1}. ${giveaway.prize}`,
                        value: `ID: \`${giveaway.id}\`\nEnds: <t:${Math.floor(giveaway.endTime / 1000)}:R>\nEntries: ${giveaway.entries.length}\nWinners: ${giveaway.winners}`
                    };
                });
                
                message.reply({
                    embeds: [
                        infoEmbed(
                            'Active Giveaways',
                            `There ${giveawayData.active.length === 1 ? 'is' : 'are'} currently ${giveawayData.active.length} active giveaway${giveawayData.active.length !== 1 ? 's' : ''}:`,
                            giveawayList
                        )
                    ]
                });
                break;
                
            case 'settings':
                // Configure giveaway settings
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Giveaway Settings',
                                `Configure settings for giveaways:`,
                                [
                                    { name: `${client.config.prefix}giveaway settings defaultDuration <duration>`, value: 'Set the default duration for giveaways (e.g., 1d, 12h, 30m)' },
                                    { name: `${client.config.prefix}giveaway settings defaultWinners <number>`, value: 'Set the default number of winners' },
                                    { name: `${client.config.prefix}giveaway settings embedColor <hex color>`, value: 'Set the color for giveaway embeds' },
                                    { name: 'Current Settings', value: 
                                        `Default Duration: ${formatDuration(giveawayData.settings.defaultDuration)}\n` +
                                        `Default Winners: ${giveawayData.settings.defaultWinners}\n` +
                                        `Embed Color: ${giveawayData.settings.embedColor}`
                                    }
                                ]
                            )
                        ]
                    });
                }
                
                const settingOption = args[1].toLowerCase();
                const settingValue = args[2];
                
                if (!settingValue) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Value',
                                `Please specify a value for the setting.`,
                                [{ name: 'Usage', value: `${client.config.prefix}giveaway settings ${settingOption} <value>` }]
                            )
                        ]
                    });
                }
                
                switch (settingOption) {
                    case 'defaultduration':
                        // Parse the duration
                        const durationMatch = settingValue.match(/^(\d+)([dhms])$/i);
                        
                        if (!durationMatch) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Duration Format',
                                        `Please use a valid duration format (e.g., 1d, 12h, 30m, 60s).`
                                    )
                                ]
                            });
                        }
                        
                        const value = parseInt(durationMatch[1]);
                        const unit = durationMatch[2].toLowerCase();
                        
                        if (isNaN(value) || value <= 0) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Duration',
                                        `Please specify a positive duration value.`
                                    )
                                ]
                            });
                        }
                        
                        let durationMs;
                        switch (unit) {
                            case 'd': durationMs = value * 24 * 60 * 60 * 1000; break; // days to ms
                            case 'h': durationMs = value * 60 * 60 * 1000; break; // hours to ms
                            case 'm': durationMs = value * 60 * 1000; break; // minutes to ms
                            case 's': durationMs = value * 1000; break; // seconds to ms
                            default: return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Duration Unit',
                                        `Please use d (days), h (hours), m (minutes), or s (seconds).`
                                    )
                                ]
                            });
                        }
                        
                        // Update the setting
                        giveawayData.settings.defaultDuration = durationMs;
                        db.setGiveaways(message.guild.id, giveawayData);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `Default giveaway duration set to ${formatDuration(durationMs)}.`
                                )
                            ]
                        });
                        break;
                        
                    case 'defaultwinners':
                        // Parse the number of winners
                        const winners = parseInt(settingValue);
                        
                        if (isNaN(winners) || winners < 1) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Number',
                                        `Please specify a positive number of winners.`
                                    )
                                ]
                            });
                        }
                        
                        // Update the setting
                        giveawayData.settings.defaultWinners = winners;
                        db.setGiveaways(message.guild.id, giveawayData);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `Default number of winners set to ${winners}.`
                                )
                            ]
                        });
                        break;
                        
                    case 'embedcolor':
                        // Parse the color
                        const colorCode = settingValue.startsWith('#') ? settingValue : `#${settingValue}`;
                        
                        // Validate the color code
                        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
                        if (!hexColorRegex.test(colorCode)) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Color',
                                        `Please provide a valid hex color code (e.g., #FF5555).`
                                    )
                                ]
                            });
                        }
                        
                        // Update the setting
                        giveawayData.settings.embedColor = colorCode;
                        db.setGiveaways(message.guild.id, giveawayData);
                        
                        // Create an embed with the new color to demonstrate
                        const colorEmbed = successEmbed(
                            'Setting Updated',
                            `Giveaway embed color set to ${colorCode}.`
                        );
                        
                        colorEmbed.setColor(colorCode);
                        
                        message.reply({ embeds: [colorEmbed] });
                        break;
                        
                    default:
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Setting',
                                    `"${settingOption}" is not a valid giveaway setting.`,
                                    [{ name: 'Available Settings', value: 'defaultDuration, defaultWinners, embedColor' }]
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
                            `"${subCommand}" is not a valid giveaway subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} ms - The duration in milliseconds
 * @returns {string} The formatted duration
 */
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
}

/**
 * Ends a giveaway and picks winners
 * @param {Client} client - The Discord client
 * @param {Guild} guild - The guild where the giveaway is
 * @param {string} giveawayId - The ID of the giveaway to end
 * @returns {object} Result of the operation
 */
async function endGiveaway(client, guild, giveawayId) {
    try {
        // Get the giveaway data
        const giveawayData = db.getGiveaways(guild.id);
        
        // Find the giveaway
        const giveawayIndex = giveawayData.active.findIndex(g => g.id === giveawayId || g.messageId === giveawayId);
        
        if (giveawayIndex === -1) {
            return { success: false, error: 'Giveaway not found' };
        }
        
        const giveaway = giveawayData.active[giveawayIndex];
        
        // Check if the giveaway has already ended
        if (giveaway.ended) {
            return { success: false, error: 'Giveaway already ended' };
        }
        
        // Mark the giveaway as ended
        giveaway.ended = true;
        
        // Get the channel and message
        const channel = guild.channels.cache.get(giveaway.channelId);
        let message;
        
        try {
            if (channel) {
                message = await channel.messages.fetch(giveaway.messageId);
            }
        } catch (error) {
            console.error('Error fetching giveaway message:', error);
        }
        
        // Determine the winners
        const winnerIds = [];
        const entries = [...giveaway.entries]; // Clone the entries array
        
        for (let i = 0; i < Math.min(giveaway.winners, entries.length); i++) {
            // Pick a random winner
            const winnerIndex = Math.floor(Math.random() * entries.length);
            const winnerId = entries[winnerIndex];
            
            // Remove the winner from the entries to avoid duplicates
            entries.splice(winnerIndex, 1);
            
            // Add to winners list
            winnerIds.push(winnerId);
        }
        
        // Update the giveaway data
        giveaway.winnerIds = winnerIds;
        
        // Move from active to completed
        giveawayData.active.splice(giveawayIndex, 1);
        giveawayData.completed.push(giveaway);
        
        // Save the updated giveaway data
        db.setGiveaways(guild.id, giveawayData);
        
        // Update the giveaway message
        if (message) {
            const winnerMentions = winnerIds.length > 0
                ? winnerIds.map(id => `<@${id}>`).join(', ')
                : 'No valid entries';
            
            const endedEmbed = new EmbedBuilder()
                .setColor(giveawayData.settings.embedColor)
                .setTitle('🎉 Giveaway Ended 🎉')
                .setDescription(`**${giveaway.prize}**`)
                .addFields([
                    { name: 'Winners', value: winnerMentions, inline: true },
                    { name: 'Hosted By', value: `<@${giveaway.hostedBy}>`, inline: true },
                    { name: 'Entries', value: `${giveaway.entries.length}`, inline: true }
                ])
                .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
                .setTimestamp();
            
            // Disable the buttons
            const disabledButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_enter')
                        .setLabel('Giveaway Ended')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎉')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('giveaway_info')
                        .setLabel('Info')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            
            await message.edit({ embeds: [endedEmbed], components: [disabledButtons] });
            
            // Announce the winners
            if (winnerIds.length > 0) {
                channel.send({
                    content: `Congratulations ${winnerMentions}! You won the giveaway for **${giveaway.prize}**!`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(giveawayData.settings.embedColor)
                            .setTitle('🎉 Giveaway Winners 🎉')
                            .setDescription(`The giveaway for **${giveaway.prize}** has ended!`)
                            .addFields([
                                { name: 'Winners', value: winnerMentions }
                            ])
                    ]
                });
            } else {
                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(giveawayData.settings.embedColor)
                            .setTitle('🎉 Giveaway Ended 🎉')
                            .setDescription(`The giveaway for **${giveaway.prize}** has ended!`)
                            .addFields([
                                { name: 'Winners', value: 'No valid entries for this giveaway.' }
                            ])
                    ]
                });
            }
        }
        
        return { success: true, winners: winnerIds };
    } catch (error) {
        console.error('Error ending giveaway:', error);
        return { success: false, error: error.message };
    }
}