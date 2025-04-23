// Warn command for issuing formal warnings to members
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'warn',
    description: 'Issues a formal warning to a member',
    usage: 'warn <@user> <reason>',
    cooldown: 5,
    /**
     * Executes the warn command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to manage messages (typically enough for warnings)
        const requiredPermissions = ['ManageMessages'];
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
        
        // Check for mentioned user
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Usage',
                        `Please mention a member to warn.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Check if user is trying to warn themselves
        if (member.id === message.author.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `You cannot warn yourself.`
                    )
                ]
            });
        }
        
        // Check if user is trying to warn the bot
        if (member.id === client.user.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Target',
                        `I cannot be warned.`
                    )
                ]
            });
        }
        
        // Check if reason is provided
        if (args.length < 2) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Usage',
                        `Please provide a reason for the warning.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Get the reason
        const reason = args.slice(1).join(' ');
        
        // Send confirmation message
        message.reply({
            embeds: [
                successEmbed(
                    'Member Warned',
                    `**${member.user.tag}** has been warned.`,
                    [{ name: 'Reason', value: reason }]
                )
            ]
        });
        
        // Log the warning if log channel exists
        const logChannel = message.guild.channels.cache.find(
            ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
        );
        
        if (logChannel) {
            logChannel.send({
                embeds: [
                    successEmbed(
                        'Member Warned',
                        `**${member.user.tag}** has been warned.`,
                        [
                            { name: 'User ID', value: member.user.id, inline: true },
                            { name: 'Moderator', value: message.author.tag, inline: true },
                            { name: 'Reason', value: reason }
                        ]
                    )
                ]
            }).catch(error => console.error('Error logging warning:', error));
        }
        
        // Try to DM the warned user
        member.user.send({
            embeds: [
                warningEmbed(
                    'You have received a warning',
                    `You have been warned in **${message.guild.name}**.`,
                    [{ name: 'Reason', value: reason }]
                )
            ]
        }).catch(() => {
            // Don't need to handle this error, it's common for users to have DMs disabled
        });
    }
};

// Import warningEmbed since it wasn't included in the destructuring at the top
const { warningEmbed } = require('../../utils/embedBuilder');
