// Event handler for message creation
const { Events, EmbedBuilder } = require('discord.odf');
const commandHandler = require('../handlers/commandHandler');
const automod = require('../automod/filter');
const db = require('../utils/database');

// Store user cooldowns for global chat
const globalChatCooldowns = new Map();

module.exports = {
    name: 'messageCreate',
    /**
     * Handles the messageCreate event
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The created message
     */
    execute(client, message) {
        // Ignore messages from bots or non-guild messages
        if (message.author.bot || !message.guild) return;
        
        // Check for automod violations
        if (client.config.automod?.enabled) {
            automod.processMessage(client, message);
        }
        
        // Process global chat messages
        processGlobalChat(client, message);
        
        // Process auto-responses
        processAutoResponder(client, message);
        
        // Process auto-reactions
        processAutoReactions(client, message);
        
        // Command handling
        const prefix = client.config.prefix;
        
        // Check if message starts with the prefix or mentions the bot
        if (!message.content.startsWith(prefix) && !message.content.startsWith(`<@${client.user.id}>`)) return;
        
        let args;
        let commandName;
        
        // Handle messages that start with prefix
        if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
        } 
        // Handle messages that mention the bot as prefix
        else if (message.content.startsWith(`<@${client.user.id}>`)) {
            args = message.content.slice(`<@${client.user.id}>`.length).trim().split(/ +/);
            commandName = args.shift()?.toLowerCase();
            
            // If just mentioned with no command, treat as help command
            if (!commandName) {
                commandName = 'help';
                args = [];
            }
        }
        
        // Execute the command
        commandHandler.executeCommand(client, message, args, commandName);
    }
};

/**
 * Process global chat functionality for a message
 * @param {Client} client - The Discord client
 * @param {Message} message - The message to process
 */
async function processGlobalChat(client, message) {
    try {
        // Get global network data
        const globalNetwork = db.getGlobalNetwork();
        
        // Get this server's global chat settings
        const globalChatSettings = db.getGlobalChat(message.guild.id);
        
        // Check if this message is in a global chat channel
        if (!globalChatSettings.enabled || message.channel.id !== globalChatSettings.channel) return;
        
        // Check for cooldown
        const cooldownTime = globalChatSettings.cooldown * 1000; // Convert to milliseconds
        const now = Date.now();
        
        if (globalChatCooldowns.has(message.author.id)) {
            const lastMessageTime = globalChatCooldowns.get(message.author.id);
            const timeLeft = lastMessageTime + cooldownTime - now;
            
            if (timeLeft > 0) {
                // Still on cooldown, return without processing
                return;
            }
        }
        
        // Update cooldown
        globalChatCooldowns.set(message.author.id, now);
        
        // Check if user is blocked from the global network
        if (globalNetwork.blockedUsers.includes(message.author.id)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Global Chat Blocked')
                        .setDescription('You have been blocked from using the global chat network.')
                ],
                ephemeral: true
            }).catch(() => {});
        }
        
        // Check if this server is blocked from the global network
        if (globalNetwork.blockedServers.includes(message.guild.id)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Server Blocked')
                        .setDescription('This server has been blocked from the global chat network.')
                ],
                ephemeral: true
            }).catch(() => {});
        }
        
        // Check if the message contains links and they're blocked
        if (globalChatSettings.blockLinks && containsLinks(message.content)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Links Not Allowed')
                        .setDescription('Links are not allowed in the global chat.')
                ],
                ephemeral: true
            }).then(reply => {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }).catch(() => {});
        }
        
        // If message is empty and only has attachments, check if they're allowed
        if (!message.content && message.attachments.size > 0 && globalChatSettings.blockImages) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Images Not Allowed')
                        .setDescription('Images are not allowed in the global chat.')
                ],
                ephemeral: true
            }).then(reply => {
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }).catch(() => {});
        }
        
        // If the message contains attachments and they're blocked, remove them
        let content = message.content;
        let attachments = [];
        
        if (!globalChatSettings.blockImages && message.attachments.size > 0) {
            // Get up to 5 image attachments
            attachments = Array.from(message.attachments.values())
                .filter(attachment => attachment.contentType?.startsWith('image/'))
                .slice(0, 1); // Limit to 1 image to avoid spam
        }
        
        // Create the global message embed
        const globalEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setFooter({
                text: `From ${message.guild.name}`,
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        
        // Add the message content if it exists
        if (content) {
            globalEmbed.setDescription(content);
        }
        
        // Add the first image as embed image if there are attachments
        if (attachments.length > 0) {
            globalEmbed.setImage(attachments[0].url);
        }
        
        // Forward the message to all connected servers
        let messagesSent = 0;
        
        for (const [serverId, channelId] of Object.entries(globalNetwork.servers)) {
            // Skip the source server
            if (serverId === message.guild.id) continue;
            
            // Get the target server and channel
            const guild = client.guilds.cache.get(serverId);
            if (!guild) continue;
            
            const channel = guild.channels.cache.get(channelId);
            if (!channel) continue;
            
            try {
                await channel.send({ embeds: [globalEmbed] });
                messagesSent++;
            } catch (error) {
                console.error(`Error sending global chat message to server ${serverId}:`, error);
            }
        }
        
        // Update the message count in the global network
        globalNetwork.messageCount++;
        db.setGlobalNetwork(globalNetwork);
        
    } catch (error) {
        console.error('Error processing global chat:', error);
    }
}

/**
 * Checks if a string contains URLs
 * @param {string} text - The text to check
 * @returns {boolean} Whether the text contains links
 */
function containsLinks(text) {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
}

/**
 * Process autoresponder for a message
 * @param {Client} client - The Discord client
 * @param {Message} message - The message to process
 */
function processAutoResponder(client, message) {
    try {
        // Get autoresponder settings for this server
        const autoresponderSettings = db.getAutoresponder(message.guild.id);
        
        // If autoresponder is disabled or no responses configured, skip
        if (!autoresponderSettings.enabled || !autoresponderSettings.responses.length) return;
        
        // Convert message content to lowercase for case-insensitive matching
        const content = message.content.toLowerCase();
        
        // Check each configured response
        for (const response of autoresponderSettings.responses) {
            const triggerLower = response.trigger.toLowerCase();
            
            // Check if the message matches the trigger
            const isMatch = response.exactMatch
                ? content === triggerLower
                : content.includes(triggerLower);
                
            if (isMatch) {
                // Send the auto-response
                message.channel.send(response.response)
                    .catch(error => console.error('Error sending auto-response:', error));
                
                // Only send one response per message (first match wins)
                return;
            }
        }
    } catch (error) {
        console.error('Error processing autoresponder:', error);
    }
}

/**
 * Process autoreactions for a message
 * @param {Client} client - The Discord client
 * @param {Message} message - The message to process
 */
async function processAutoReactions(client, message) {
    try {
        // Get autoreact settings for this server
        const autoreactSettings = db.getAutoreact(message.guild.id);
        
        // If autoreact is disabled or no reactions configured, skip
        if (!autoreactSettings.enabled || !autoreactSettings.reactions.length) return;
        
        // Convert message content to lowercase for case-insensitive matching
        const content = message.content.toLowerCase();
        
        // Check each configured reaction set
        for (const reaction of autoreactSettings.reactions) {
            const triggerLower = reaction.trigger.toLowerCase();
            
            // Check if the message matches the trigger
            const isMatch = reaction.exactMatch
                ? content === triggerLower
                : content.includes(triggerLower);
                
            if (isMatch) {
                // Add each reaction sequentially
                for (const emoji of reaction.emojis) {
                    try {
                        // Wait a short time between reactions to avoid rate limiting
                        await message.react(emoji);
                        await new Promise(resolve => setTimeout(resolve, 350)); // 350ms delay between reactions
                    } catch (emojiError) {
                        // Skip invalid emojis or ones the bot doesn't have access to
                        console.error(`Error reacting with emoji ${emoji}:`, emojiError);
                    }
                }
                
                // Only apply one set of reactions per message (first match wins)
                return;
            }
        }
    } catch (error) {
        console.error('Error processing autoreactions:', error);
    }
}
