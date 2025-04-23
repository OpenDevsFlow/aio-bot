// Purge command for bulk-deleting messages
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions, checkBotPermissions, getMissingBotPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'purge',
    aliases: ['clear', 'prune'],
    description: 'Deletes a specified number of messages from the channel',
    usage: 'purge <amount>',
    cooldown: 5,
    /**
     * Executes the purge command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if user has permission to manage messages
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
        
        // Check if bot has permission to manage messages
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
        
        // Get the amount of messages to delete
        const amount = parseInt(args[0]);
        
        // Validate amount
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Amount',
                        `Please provide a number between 1 and 100.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Delete messages
        message.channel.bulkDelete(amount + 1, true) // +1 to include the command message
            .then(deletedMessages => {
                // Account for the command message
                const actualDeleted = deletedMessages.size - 1;
                
                // Send confirmation message that will delete itself after 5 seconds
                message.channel.send({
                    embeds: [
                        successEmbed(
                            'Messages Purged',
                            `Successfully deleted ${actualDeleted} message(s).`
                        )
                    ]
                }).then(msg => {
                    setTimeout(() => {
                        msg.delete().catch(() => {});
                    }, 5000);
                });
                
                // Log the purge if log channel exists
                const logChannel = message.guild.channels.cache.find(
                    ch => ch.name === client.config.logChannel && ch.type === 0 // 0 is TextChannel type
                );
                
                if (logChannel) {
                    logChannel.send({
                        embeds: [
                            successEmbed(
                                'Messages Purged',
                                `**${message.author.tag}** purged ${actualDeleted} message(s) in ${message.channel}.`,
                                [
                                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Moderator', value: message.author.tag, inline: true }
                                ]
                            )
                        ]
                    }).catch(error => console.error('Error logging purge:', error));
                }
            })
            .catch(error => {
                console.error('Error purging messages:', error);
                
                // Special handler for common errors
                if (error.code === 10008) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Error',
                                `Some messages are too old to be deleted. Discord only allows bulk deletion of messages that are less than 14 days old.`
                            )
                        ]
                    });
                }
                
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Error',
                            `An error occurred while trying to delete messages.`
                        )
                    ]
                });
            });
    }
};
