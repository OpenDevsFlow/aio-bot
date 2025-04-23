// Auto-moderation filter for processing messages
const { EmbedBuilder } = require('discord.odf');
const db = require('../utils/database');

/**
 * Processes a message for auto-moderation
 * 
 * @param {Client} client - The Discord client
 * @param {Message} message - The message to process
 */
function processMessage(client, message) {
    // Skip messages from bots and system messages
    if (message.author.bot || message.system) return;
    
    // Skip DMs
    if (!message.guild) return;
    
    // Get the auto-moderation settings for this server
    const automodSettings = db.getAutomod(message.guild.id);
    
    // If auto-moderation is disabled, skip
    if (!automodSettings.enabled) return;
    
    // Check for violations
    let violationTypes = [];
    
    // Check for filtered words
    if (containsFilteredWords(message, automodSettings.filteredWords)) {
        violationTypes.push('filtered_word');
    }
    
    // Check for excessive mentions
    if (containsExcessiveMentions(message, automodSettings.maxMentions)) {
        violationTypes.push('excessive_mentions');
    }
    
    // If violations were found, take action
    if (violationTypes.length > 0) {
        takeAction(client, message, violationTypes, automodSettings);
    }
}

/**
 * Checks if a message contains filtered words
 * 
 * @param {Message} message - The message to check
 * @param {Array} filteredWords - Array of filtered words
 * @returns {boolean} Whether the message contains filtered words
 */
function containsFilteredWords(message, filteredWords) {
    // If no filtered words are set, return false
    if (!filteredWords || filteredWords.length === 0) return false;
    
    // Convert message content to lowercase for case-insensitive comparison
    const content = message.content.toLowerCase();
    
    // Check each filtered word
    for (const word of filteredWords) {
        // Add word boundary checks to prevent false positives
        // e.g., "hello" shouldn't match "othello"
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        
        if (regex.test(content)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Checks if a message contains excessive mentions
 * 
 * @param {Message} message - The message to check
 * @param {number} maxMentions - Maximum allowed mentions
 * @returns {boolean} Whether the message contains excessive mentions
 */
function containsExcessiveMentions(message, maxMentions) {
    // Count mentions (@user and @role, but not @everyone/@here)
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    
    return mentionCount > maxMentions;
}

/**
 * Takes action on a message that violated auto-moderation rules
 * 
 * @param {Client} client - The Discord client
 * @param {Message} message - The message that violated rules
 * @param {Array} violationTypes - Array of violation types
 * @param {Object} automodSettings - Server-specific automod settings
 */
function takeAction(client, message, violationTypes, automodSettings) {
    // Create a log message
    let logReason = '';
    
    if (violationTypes.includes('filtered_word')) {
        logReason += 'Filtered word detected. ';
    }
    
    if (violationTypes.includes('excessive_mentions')) {
        logReason += `Excessive mentions (${message.mentions.users.size + message.mentions.roles.size}/${automodSettings.maxMentions}). `;
    }
    
    // Take the configured action
    switch (automodSettings.action) {
        case 'delete':
            // Delete the message
            message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
            break;
            
        case 'warn':
            // Delete the message and warn the user
            message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
            
            // Send a warning DM to the user
            message.author.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Auto-Moderation Warning')
                        .setDescription(`Your message in ${message.guild.name} was removed for violating server rules.`)
                        .setColor(0xFFAA00)
                        .addFields([{ name: 'Reason', value: logReason }])
                        .setTimestamp()
                ]
            }).catch(() => {
                // If DM fails, warn in channel
                message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Auto-Moderation Warning')
                            .setDescription(`${message.author}, your message was removed for violating server rules.`)
                            .setColor(0xFFAA00)
                            .addFields([{ name: 'Reason', value: logReason }])
                            .setTimestamp()
                    ]
                }).then(msg => {
                    // Delete the warning after 5 seconds
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                }).catch(error => {
                    console.error('Error sending warning:', error);
                });
            });
            break;
            
        case 'mute':
            // Delete the message and mute the user
            message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
            
            // Try to mute the user (timeout)
            const member = message.guild.members.cache.get(message.author.id);
            if (member) {
                member.timeout(10 * 60 * 1000, logReason).catch(error => {
                    console.error('Error timing out member:', error);
                });
            }
            
            // Send a notification to the user
            message.author.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Auto-Moderation Timeout')
                        .setDescription(`You have been timed out in ${message.guild.name} for 10 minutes.`)
                        .setColor(0xFF0000)
                        .addFields([{ name: 'Reason', value: logReason }])
                        .setTimestamp()
                ]
            }).catch(() => {});
            break;
            
        case 'kick':
            // Delete the message and kick the user
            message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
            
            // Try to kick the user
            const memberToKick = message.guild.members.cache.get(message.author.id);
            if (memberToKick) {
                memberToKick.kick(logReason).catch(error => {
                    console.error('Error kicking member:', error);
                });
            }
            break;
    }
    
    // Log the action to the configured log channel
    if (automodSettings.logChannel) {
        const logChannel = message.guild.channels.cache.get(automodSettings.logChannel);
        
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Auto-Moderation Action')
                        .setDescription(`Action taken: ${automodSettings.action}`)
                        .setColor(0xFF5500)
                        .addFields([
                            { name: 'User', value: `${message.author.tag} (${message.author.id})` },
                            { name: 'Channel', value: `${message.channel.name} (${message.channel.id})` },
                            { name: 'Reason', value: logReason },
                            { name: 'Message Content', value: message.content.length > 1024 ? message.content.substring(0, 1020) + '...' : message.content || 'No text content' }
                        ])
                        .setTimestamp()
                ]
            }).catch(error => {
                console.error('Error logging automod action:', error);
            });
        }
    }
}

module.exports = {
    processMessage
};