// Daily command for claiming daily currency rewards
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const db = require('../../utils/database');

module.exports = {
    name: 'daily',
    description: 'Claim your daily currency reward',
    usage: 'daily',
    cooldown: 5,
    /**
     * Executes the daily command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Get the user's balance data using the database utility
        const userData = db.getEconomy(message.author.id);
        
        // Get current time
        const now = Date.now();
        
        // Check if the user has already claimed their daily reward today
        const lastDaily = userData.lastDaily || 0;
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // If the user has claimed within the last 24 hours
        if (now - lastDaily < oneDay) {
            // Calculate time until next claim
            const timeLeft = oneDay - (now - lastDaily);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Daily Reward Already Claimed',
                        `You've already claimed your daily reward.`,
                        [{ name: 'Next Claim Available', value: `${hours}h ${minutes}m` }]
                    )
                ]
            });
        }
        
        // Get the daily reward amount from config or use default
        const dailyAmount = client.config.economy?.dailyReward || 250;
        
        // Add the daily reward to the user's balance
        userData.balance += dailyAmount;
        userData.lastDaily = now;
        
        // Save the updated economy data using the database utility
        db.setEconomy(message.author.id, userData);
        
        // Send success message
        message.reply({
            embeds: [
                successEmbed(
                    'Daily Reward Claimed',
                    `You've claimed your daily reward of ${dailyAmount} ${client.config.economy?.currencyName || 'coins'}!`,
                    [
                        { name: 'New Balance', value: `${userData.balance} ${client.config.economy?.currencyName || 'coins'}` },
                        { name: 'Next Claim', value: 'Available in 24 hours' }
                    ]
                )
            ]
        });
    }
};