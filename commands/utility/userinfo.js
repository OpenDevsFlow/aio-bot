// User information command
const { infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'userinfo',
    aliases: ['user', 'whois', 'profile'],
    description: 'Displays information about a user',
    usage: 'userinfo [@user]',
    cooldown: 5,
    /**
     * Executes the userinfo command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Get the target user - mentioned user or the message author
        const target = message.mentions.members.first() || message.member;
        const user = target.user;
        
        // Get user's account creation date
        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;
        
        // Get user's join date
        const joinedAt = `<t:${Math.floor(target.joinedTimestamp / 1000)}:F> (<t:${Math.floor(target.joinedTimestamp / 1000)}:R>)`;
        
        // Get user's roles
        const roles = target.roles.cache
            .filter(role => role.id !== message.guild.id) // Filter out @everyone role
            .sort((a, b) => b.position - a.position) // Sort by position (highest to lowest)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'None';
        
        // Get user's permission flags
        const permissions = target.permissions.toArray().map(perm => {
            return perm
                .replace(/_/g, ' ') // Replace underscores with spaces
                .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); // Capitalize each word
        });
        
        // Get user's presence status (online, idle, dnd, offline)
        let status = 'Offline';
        if (target.presence) {
            status = {
                online: 'Online',
                idle: 'Idle',
                dnd: 'Do Not Disturb',
                offline: 'Offline'
            }[target.presence.status] || 'Unknown';
        }
        
        // Create the embed fields
        const fields = [
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Account Created', value: createdAt },
            { name: 'Joined Server', value: joinedAt },
            { name: 'Roles', value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles }
        ];
        
        // Add key permissions if they exist
        if (permissions.length) {
            const keyPermissions = [
                'Administrator', 'Manage Server', 'Manage Roles', 'Manage Channels',
                'Kick Members', 'Ban Members', 'Mention Everyone', 'Manage Messages'
            ];
            
            const userKeyPermissions = permissions.filter(perm => keyPermissions.includes(perm));
            
            if (userKeyPermissions.length) {
                fields.push({
                    name: 'Key Permissions',
                    value: userKeyPermissions.join(', ')
                });
            }
        }
        
        // Create the embed
        const embed = infoEmbed(
            user.tag,
            `Information about **${user.username}**`,
            fields
        );
        
        // Set the embed thumbnail to the user's avatar
        embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
        
        // Send the embed
        message.reply({ embeds: [embed] });
    }
};
