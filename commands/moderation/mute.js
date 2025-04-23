// Mute command for restricting a member's ability to speak in channels
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions, checkBotPermissions, getMissingBotPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'mute',
    description: 'Mutes a member to prevent them from sending messages',
    usage: 'mute <@user> [duration] [reason]',
    cooldown: 5,
    /**
     * Executes the mute command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to mute members
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
        
        // Check if bot has permission to mute members
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
                        `Please mention a member to mute.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Check if member can be muted
        if (!member.moderatable) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Cannot Mute Member',
                        `I cannot mute this member. They may have a higher role than me or have administrative permissions.`
                    )
                ]
            });
        }
        
        // Check if user is trying to mute themselves
        if (member.id === message.author.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `You cannot mute yourself.`
                    )
                ]
            });
        }
        
        // Check if user is trying to mute the bot
        if (member.id === client.user.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `I cannot mute myself.`
                    )
                ]
            });
        }
        
        // Parse duration (in minutes)
        let duration = 60; // Default: 60 minutes
        let reasonArgs = args.slice(1);
        
        if (args[1] && !isNaN(args[1]) && parseInt(args[1]) > 0) {
            duration = parseInt(args[1]);
            reasonArgs = args.slice(2);
        }
        
        // Ensure duration doesn't exceed Discord's 28-day limit
        const maxDuration = 28 * 24 * 60; // 28 days in minutes
        if (duration > maxDuration) {
            duration = maxDuration;
        }
        
        // Get the reason
        const reason = reasonArgs.join(' ') || 'No reason provided';
        
        // Calculate timeout expiration
        const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
        
        // Timeout the member
        member.timeout(duration * 60 * 1000, reason)
            .then(() => {
                // Format the duration for display
                let durationText = `${duration} minute(s)`;
                if (duration >= 60) {
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;
                    durationText = `${hours} hour(s)`;
                    if (minutes > 0) {
                        durationText += ` ${minutes} minute(s)`;
                    }
                }
                if (duration >= 1440) { // More than a day
                    const days = Math.floor(duration / 1440);
                    const hours = Math.floor((duration % 1440) / 60);
                    durationText = `${days} day(s)`;
                    if (hours > 0) {
                        durationText += ` ${hours} hour(s)`;
                    }
                }
                
                // Send confirmation message
                message.reply({
                    embeds: [
                        successEmbed(
                            'Member Muted',
                            `**${member.user.tag}** has been muted.`,
                            [
                                { name: 'Duration', value: durationText, inline: true },
                                { name: 'Expires', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`, inline: true },
                                { name: 'Reason', value: reason }
                            ]
                        )
                    ]
                });
                
                // Log the mute if log channel exists
                const logChannel = message.guild.channels.cache.find(
                    ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
                );
                
                if (logChannel) {
                    logChannel.send({
                        embeds: [
                            successEmbed(
                                'Member Muted',
                                `**${member.user.tag}** has been muted.`,
                                [
                                    { name: 'User ID', value: member.user.id, inline: true },
                                    { name: 'Moderator', value: message.author.tag, inline: true },
                                    { name: 'Duration', value: durationText, inline: true },
                                    { name: 'Expires', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`, inline: true },
                                    { name: 'Reason', value: reason }
                                ]
                            )
                        ]
                    }).catch(error => console.error('Error logging mute:', error));
                }
                
                // Try to DM the muted user
                member.user.send({
                    embeds: [
                        errorEmbed(
                            'You have been muted',
                            `You have been muted in **${message.guild.name}**.`,
                            [
                                { name: 'Duration', value: durationText, inline: true },
                                { name: 'Expires', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`, inline: true },
                                { name: 'Reason', value: reason }
                            ]
                        )
                    ]
                }).catch(() => {
                    // Don't need to handle this error, it's common for users to have DMs disabled
                });
            })
            .catch(error => {
                console.error('Error muting member:', error);
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Error',
                            `An error occurred while trying to mute the member.`
                        )
                    ]
                });
            });
    }
};
