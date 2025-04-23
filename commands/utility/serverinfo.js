// Server information command
const { infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'serverinfo',
    aliases: ['server', 'guild', 'guildinfo'],
    description: 'Displays information about the current server',
    usage: 'serverinfo',
    cooldown: 5,
    /**
     * Executes the serverinfo command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        const guild = message.guild;
        
        // Get verification level
        const verificationLevel = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Highest'
        }[guild.verificationLevel] || 'Unknown';
        
        // Get server creation date
        const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`;
        
        // Get role count
        const roleCount = guild.roles.cache.size - 1; // Subtract @everyone role
        
        // Get channel counts
        const textChannels = guild.channels.cache.filter(ch => ch.type === 0).size; // 0 is text channel
        const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2).size; // 2 is voice channel
        const categoryChannels = guild.channels.cache.filter(ch => ch.type === 4).size; // 4 is category channel
        
        // Get member counts
        const totalMembers = guild.memberCount;
        const humanCount = guild.members.cache.filter(member => !member.user.bot).size;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        
        // Get emoji count
        const emojiCount = guild.emojis.cache.size;
        
        // Get boost status
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount;
        
        // Create the embed fields
        const fields = [
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Created', value: createdAt },
            { name: 'Verification Level', value: verificationLevel, inline: true },
            {
                name: 'Members',
                value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`,
                inline: true
            },
            {
                name: 'Channels',
                value: `Categories: ${categoryChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}`,
                inline: true
            },
            { name: 'Roles', value: `${roleCount}`, inline: true },
            { name: 'Emojis', value: `${emojiCount}`, inline: true },
            {
                name: 'Boost Status',
                value: `Level: ${boostLevel}\nBoosts: ${boostCount}`,
                inline: true
            }
        ];
        
        // Create the embed
        const embed = infoEmbed(
            guild.name,
            `Information about **${guild.name}**`,
            fields
        );
        
        // Set the embed thumbnail to the server icon if it exists
        if (guild.iconURL()) {
            embed.setThumbnail(guild.iconURL({ dynamic: true }));
        }
        
        // Send the embed
        message.reply({ embeds: [embed] });
    }
};
