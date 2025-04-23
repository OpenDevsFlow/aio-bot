// Ban command for permanently removing members from the server
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions, checkBotPermissions, getMissingBotPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'ban',
    description: 'Bans a member from the server',
    usage: 'ban <@user> [delete_days] [reason]',
    cooldown: 5,
    /**
     * Executes the ban command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to ban members
        const requiredPermissions = ['BanMembers'];
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
        
        // Check if bot has permission to ban members
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
                        `Please mention a member to ban.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Check if member can be banned
        if (!member.bannable) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Cannot Ban Member',
                        `I cannot ban this member. They may have a higher role than me or have administrative permissions.`
                    )
                ]
            });
        }
        
        // Check if user is trying to ban themselves
        if (member.id === message.author.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `You cannot ban yourself.`
                    )
                ]
            });
        }
        
        // Check if user is trying to ban the bot
        if (member.id === client.user.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `I cannot ban myself.`
                    )
                ]
            });
        }
        
        // Get delete days option (0-7)
        let deleteDays = 0;
        let reasonArgs = args.slice(1);
        
        if (args[1] && !isNaN(args[1]) && parseInt(args[1]) >= 0 && parseInt(args[1]) <= 7) {
            deleteDays = parseInt(args[1]);
            reasonArgs = args.slice(2);
        }
        
        // Get the reason
        const reason = reasonArgs.join(' ') || 'No reason provided';
        
        // Try to DM the banned user before the ban
        member.user.send({
            embeds: [
                errorEmbed(
                    'You have been banned',
                    `You have been banned from **${message.guild.name}**.`,
                    [{ name: 'Reason', value: reason }]
                )
            ]
        }).catch(() => {
            // Don't need to handle this error, it's common for users to have DMs disabled
        }).finally(() => {
            // Ban the member
            member.ban({ deleteMessageDays: deleteDays, reason: reason })
                .then(() => {
                    // Send confirmation message
                    message.reply({
                        embeds: [
                            successEmbed(
                                'Member Banned',
                                `**${member.user.tag}** has been banned from the server.`,
                                [
                                    { name: 'Reason', value: reason },
                                    { name: 'Message History Deleted', value: `${deleteDays} day(s)`, inline: true }
                                ]
                            )
                        ]
                    });
                    
                    // Log the ban if log channel exists
                    const logChannel = message.guild.channels.cache.find(
                        ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
                    );
                    
                    if (logChannel) {
                        logChannel.send({
                            embeds: [
                                successEmbed(
                                    'Member Banned',
                                    `**${member.user.tag}** has been banned from the server.`,
                                    [
                                        { name: 'User ID', value: member.user.id, inline: true },
                                        { name: 'Moderator', value: message.author.tag, inline: true },
                                        { name: 'Reason', value: reason },
                                        { name: 'Message History Deleted', value: `${deleteDays} day(s)`, inline: true }
                                    ]
                                )
                            ]
                        }).catch(error => console.error('Error logging ban:', error));
                    }
                })
                .catch(error => {
                    console.error('Error banning member:', error);
                    message.reply({
                        embeds: [
                            errorEmbed(
                                'Error',
                                `An error occurred while trying to ban the member.`
                            )
                        ]
                    });
                });
        });
    }
};
