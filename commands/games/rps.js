// Rock-Paper-Scissors game command
const { infoEmbed, errorEmbed, successEmbed, warningEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'rps',
    aliases: ['rockpaperscissors'],
    description: 'Play Rock-Paper-Scissors with the bot',
    usage: 'rps <rock|paper|scissors>',
    cooldown: 3,
    /**
     * Executes the rock-paper-scissors command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Valid choices
        const validChoices = ['rock', 'paper', 'scissors'];
        
        // Check if a valid choice was provided
        if (args.length === 0 || !validChoices.includes(args[0].toLowerCase())) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Choice',
                        `Please choose either rock, paper, or scissors.`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }
        
        // Get player's choice
        const playerChoice = args[0].toLowerCase();
        
        // Get bot's random choice
        const botChoice = validChoices[Math.floor(Math.random() * validChoices.length)];
        
        // Determine winner
        let result;
        let resultEmbed;
        let description = `You chose **${playerChoice}**. I chose **${botChoice}**.`;
        
        if (playerChoice === botChoice) {
            // Tie
            result = "It's a tie!";
            resultEmbed = infoEmbed(
                'Rock Paper Scissors',
                description,
                [{ name: 'Result', value: result }]
            );
        } else if (
            (playerChoice === 'rock' && botChoice === 'scissors') ||
            (playerChoice === 'paper' && botChoice === 'rock') ||
            (playerChoice === 'scissors' && botChoice === 'paper')
        ) {
            // Player wins
            result = "You win!";
            resultEmbed = successEmbed(
                'Rock Paper Scissors',
                description,
                [{ name: 'Result', value: result }]
            );
        } else {
            // Bot wins
            result = "I win!";
            resultEmbed = warningEmbed(
                'Rock Paper Scissors',
                description,
                [{ name: 'Result', value: result }]
            );
        }
        
        // Send the result
        message.reply({
            embeds: [resultEmbed]
        });
    }
};