// Event handler for when a member joins a guild
const { EmbedBuilder } = require('discord.odf');
const { infoEmbed } = require('../utils/embedBuilder');
const db = require('../utils/database');

module.exports = {
    name: 'guildMemberAdd',
    /**
     * Handles the guildMemberAdd event
     * 
     * @param {Client} client - The Discord client
     * @param {GuildMember} member - The member who joined
     */
    execute(client, member) {
        // Skip if member is a bot
        if (member.user.bot) return;
        
        // Handle autoroles
        applyAutoroles(client, member);
        
        // Send welcome messages
        sendWelcomeMessages(client, member);
        
        // Send server log (if enabled)
        logMemberJoin(client, member);
    }
};

/**
 * Applies autoroles to a new member
 * @param {Client} client - The Discord client
 * @param {GuildMember} member - The member who joined
 */
async function applyAutoroles(client, member) {
    try {
        // Get autorole settings
        const autoroleSettings = db.getAutorole(member.guild.id);
        
        // If autorole is disabled or no roles configured, skip
        if (!autoroleSettings.enabled || !autoroleSettings.roles.length) return;
        
        // Go through each role and try to add it
        for (const roleId of autoroleSettings.roles) {
            try {
                // Check if the role exists
                const role = member.guild.roles.cache.get(roleId);
                if (!role) continue;
                
                // Check if the bot can assign this role (role hierarchy check)
                const botMember = member.guild.members.me;
                if (role.position >= botMember.roles.highest.position) continue;
                
                // Add the role to the member
                await member.roles.add(role, 'Autorole');
            } catch (roleError) {
                console.error(`Error applying autorole ${roleId} to ${member.user.tag}:`, roleError);
            }
        }
    } catch (error) {
        console.error(`Error in autorole for ${member.user.tag}:`, error);
    }
}

/**
 * Sends welcome messages for a new member
 * @param {Client} client - The Discord client
 * @param {GuildMember} member - The member who joined
 */
async function sendWelcomeMessages(client, member) {
    try {
        // Get welcome settings
        const welcomeSettings = db.getWelcome(member.guild.id);
        
        // If welcome messages are disabled, skip
        if (!welcomeSettings.enabled) return;
        
        // Check if a channel is set
        if (!welcomeSettings.channel) return;
        
        // Get the welcome channel
        const welcomeChannel = member.guild.channels.cache.get(welcomeSettings.channel);
        if (!welcomeChannel) return;
        
        // Format the welcome message with variables
        const welcomeMessage = (welcomeSettings.message || 'Welcome to the server, {user}!')
            .replace(/{user}/g, member)
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());
        
        // Check if using embeds
        if (welcomeSettings.embedEnabled) {
            // Create an embed for the welcome message
            const embed = new EmbedBuilder()
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(welcomeMessage)
                .setColor(welcomeSettings.embedColor || '#5865F2')
                .setTimestamp();
            
            // Add user avatar as thumbnail if enabled
            if (welcomeSettings.embedThumbnail) {
                embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            }
            
            // Send the welcome embed
            welcomeChannel.send({ embeds: [embed] })
                .catch(error => console.error('Error sending welcome embed:', error));
        } else {
            // Send the welcome message as plain text
            welcomeChannel.send(welcomeMessage)
                .catch(error => console.error('Error sending welcome message:', error));
        }
        
        // Send DM welcome message if configured
        if (welcomeSettings.dmMessage) {
            // Format the DM message with variables
            const dmMessage = welcomeSettings.dmMessage
                .replace(/{user}/g, member.user.username) // Can't mention in DMs
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, member.guild.name)
                .replace(/{membercount}/g, member.guild.memberCount.toString());
            
            // Try to send the DM
            member.user.send(dmMessage)
                .catch(error => console.error('Error sending welcome DM:', error));
        }
    } catch (error) {
        console.error(`Error in welcome message for ${member.user.tag}:`, error);
    }
}

/**
 * Logs a member join to the server log channel
 * @param {Client} client - The Discord client
 * @param {GuildMember} member - The member who joined
 */
function logMemberJoin(client, member) {
    try {
        // Get logging settings
        const loggingSettings = db.getLogging(member.guild.id);
        
        // If logging is disabled or memberJoin events are disabled, skip
        if (!loggingSettings.enabled || !loggingSettings.events.memberJoin) return;
        
        // Check if a log channel is set
        if (!loggingSettings.logChannel) return;
        
        // Get the log channel
        const logChannel = member.guild.channels.cache.get(loggingSettings.logChannel);
        if (!logChannel) return;
        
        // Create an embed for the join
        const embed = infoEmbed(
            'Member Joined',
            `**${member.user.tag}** has joined the server.`
        );
        
        embed.addFields([
            { name: 'User ID', value: member.user.id, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
        ]);
        
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        
        // Send the embed to the log channel
        logChannel.send({ embeds: [embed] })
            .catch(error => console.error('Error sending member join log:', error));
    } catch (error) {
        console.error(`Error in join logging for ${member.user.tag}:`, error);
    }
}
