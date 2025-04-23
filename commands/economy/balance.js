// Balance command for checking a user's currency balance
const { infoEmbed } = require('../../utils/embedBuilder');
const db = require('../../utils/database');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'money', 'credits'],
    description: 'Check your or another user\'s currency balance',
    usage: 'balance [@user]',
    cooldown: 5,
    /**
     * Executes the balance command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Get the target user - mentioned user or the message author
        const target = message.mentions.users.first() || message.author;
        
        // Get the user's balance using the database utility
        const userData = db.getEconomy(target.id);
        
        // Create the embed
        const embed = infoEmbed(
            'Currency Balance',
            `Showing currency balance for ${target.tag}`,
            [
                { 
                    name: 'Balance', 
                    value: `${userData.balance} ${client.config.economy?.currencyName || 'coins'}`
                }
            ]
        );
        
        // Set the embed thumbnail to the user's avatar
        embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
        
        // Send the embed
        message.reply({ embeds: [embed] });
    }
};