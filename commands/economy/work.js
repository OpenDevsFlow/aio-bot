// Work command for earning currency through "jobs"
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const db = require('../../utils/database');

module.exports = {
    name: 'work',
    description: 'Work to earn currency',
    usage: 'work',
    cooldown: 5,
    /**
     * Executes the work command
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
        
        // Check if the user has worked recently
        const lastWork = userData.lastWork || 0;
        const cooldownTime = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        // If the user has worked within the cooldown period
        if (now - lastWork < cooldownTime) {
            // Calculate time until next work session
            const timeLeft = cooldownTime - (now - lastWork);
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Work Cooldown',
                        `You're still tired from your last shift.`,
                        [{ name: 'Next Work Available', value: `${minutes}m ${seconds}s` }]
                    )
                ]
            });
        }
        
        // Generate random amount to earn (between 50 and 150)
        const earnedAmount = Math.floor(Math.random() * 101) + 50;
        
        // Add the earned amount to the user's balance
        userData.balance += earnedAmount;
        userData.lastWork = now;
        
        // Save the updated economy data using the database utility
        db.setEconomy(message.author.id, userData);
        
        // Work responses with their payouts
        const workResponses = [
            { job: "delivered some packages", pay: earnedAmount },
            { job: "wrote some code", pay: earnedAmount },
            { job: "moderated a Discord server", pay: earnedAmount },
            { job: "fixed a computer", pay: earnedAmount },
            { job: "created a website", pay: earnedAmount },
            { job: "designed a logo", pay: earnedAmount },
            { job: "walked someone's dog", pay: earnedAmount },
            { job: "mowed a lawn", pay: earnedAmount },
            { job: "cleaned a house", pay: earnedAmount },
            { job: "taught a class", pay: earnedAmount },
            { job: "cooked for a restaurant", pay: earnedAmount },
            { job: "drove a taxi", pay: earnedAmount },
            { job: "hosted a podcast", pay: earnedAmount },
            { job: "sold some art", pay: earnedAmount },
            { job: "performed on the street", pay: earnedAmount }
        ];
        
        // Choose a random work response
        const workResponse = workResponses[Math.floor(Math.random() * workResponses.length)];
        
        // Send success message
        message.reply({
            embeds: [
                successEmbed(
                    'Work Complete',
                    `You ${workResponse.job} and earned ${workResponse.pay} ${client.config.economy?.currencyName || 'coins'}!`,
                    [
                        { name: 'New Balance', value: `${userData.balance} ${client.config.economy?.currencyName || 'coins'}` },
                        { name: 'Next Work', value: 'Available in 30 minutes' }
                    ]
                )
            ]
        });
    }
};