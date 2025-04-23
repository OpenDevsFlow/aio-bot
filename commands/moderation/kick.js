// Kick command for removing members from the server
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions, checkBotPermissions, getMissingBotPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'kick',
    description: 'Kicks a member from the server',
    usage: 'kick <@user> [reason]',
    cooldown: 5,
    /**
     * Executes the kick command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to kick members
        const requiredPermissions = ['KickMembers'];
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
        
        // Check if bot has permission to kick members
        if (!checkBotPermissions(message.guild.members.me, requiredPermissions)) {
            const missingPermissions = getMissingBotPermissions(message.guild.members.me, requiredPermissions);
            
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Missing Bot Permissions',
                        `I don't have the required permissions to execute this command.`,
                        [{ name: 'Required Permissions', value: missingPermissions.join(', ') }]
                    )
                ]
            });
        }
        
        // Check for mentioned user
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Usage',
                        `Please mention a member to kick.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Check if member can be kicked
        if (!member.kickable) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Cannot Kick Member',
                        `I cannot kick this member. They may have a higher role than me or have administrative permissions.`
                    )
                ]
            });
        }
        
        // Check if user is trying to kick themselves
        if (member.id === message.author.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `You cannot kick yourself.`
                    )
                ]
            });
        }
        
        // Check if user is trying to kick the bot
        if (member.id === client.user.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `I cannot kick myself.`
                    )
                ]
            });
        }
        
        // Get the reason
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        // Kick the member
        member.kick(reason)
            .then(() => {
                // Send confirmation message
                message.reply({
                    embeds: [
                        successEmbed(
                            'Member Kicked',
                            `**${member.user.tag}** has been kicked from the server.`,
                            [{ name: 'Reason', value: reason }]
                        )
                    ]
                });
                
                // Log the kick if log channel exists
                const logChannel = message.guild.channels.cache.find(
                    ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
                );
                
                if (logChannel) {
                    logChannel.send({
                        embeds: [
                            successEmbed(
                                'Member Kicked',
                                `**${member.user.tag}** has been kicked from the server.`,
                                [
                                    { name: 'User ID', value: member.user.id, inline: true },
                                    { name: 'Moderator', value: message.author.tag, inline: true },
                                    { name: 'Reason', value: reason }
                                ]
                            )
                        ]
                    }).catch(error => console.error('Error logging kick:', error));
                }
                
                // Try to DM the kicked user
                member.user.send({
                    embeds: [
                        errorEmbed(
                            'You have been kicked',
                            `You have been kicked from **${message.guild.name}**.`,
                            [{ name: 'Reason', value: reason }]
                        )
                    ]
                }).catch(() => {
                    // Don't need to handle this error, it's common for users to have DMs disabled
                });
            })
            .catch(error => {
                console.error('Error kicking member:', error);
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Error',
                            `An error occurred while trying to kick the member.`
                        )
                    ]
                });
            });
    }
};
