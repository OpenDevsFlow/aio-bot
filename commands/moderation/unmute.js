// Unmute command for removing timeout from a member
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions, checkBotPermissions, getMissingBotPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'unmute',
    description: 'Removes a timeout from a member',
    usage: 'unmute <@user> [reason]',
    cooldown: 5,
    /**
     * Executes the unmute command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to moderate members
        const requiredPermissions = ['ModerateMembers'];
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
        
        // Check if bot has permission to moderate members
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
                        `Please mention a member to unmute.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Check if member can be managed
        if (!member.moderatable) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Cannot Manage Member',
                        `I cannot manage this member. They may have a higher role than me or have administrative permissions.`
                    )
                ]
            });
        }
        
        // Check if member is actually timed out
        if (!member.communicationDisabledUntil) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Not Muted',
                        `This member is not currently muted.`
                    )
                ]
            });
        }
        
        // Get the reason
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        // Remove timeout
        member.timeout(null, reason)
            .then(() => {
                // Send confirmation message
                message.reply({
                    embeds: [
                        successEmbed(
                            'Member Unmuted',
                            `**${member.user.tag}** has been unmuted.`,
                            [{ name: 'Reason', value: reason }]
                        )
                    ]
                });
                
                // Log the unmute if log channel exists
                const logChannel = message.guild.channels.cache.find(
                    ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
                );
                
                if (logChannel) {
                    logChannel.send({
                        embeds: [
                            successEmbed(
                                'Member Unmuted',
                                `**${member.user.tag}** has been unmuted.`,
                                [
                                    { name: 'User ID', value: member.user.id, inline: true },
                                    { name: 'Moderator', value: message.author.tag, inline: true },
                                    { name: 'Reason', value: reason }
                                ]
                            )
                        ]
                    }).catch(error => console.error('Error logging unmute:', error));
                }
                
                // Try to DM the unmuted user
                member.user.send({
                    embeds: [
                        successEmbed(
                            'You have been unmuted',
                            `You have been unmuted in **${message.guild.name}**.`,
                            [{ name: 'Reason', value: reason }]
                        )
                    ]
                }).catch(() => {
                    // Don't need to handle this error, it's common for users to have DMs disabled
                });
            })
            .catch(error => {
                console.error('Error unmuting member:', error);
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Error',
                            `An error occurred while trying to unmute the member.`
                        )
                    ]
                });
            });
    }
};
