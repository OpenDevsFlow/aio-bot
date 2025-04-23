// Coin flip command
const { infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'coin'],
    description: 'Flips a coin and shows heads or tails',
    usage: 'coinflip [number of coins]',
    cooldown: 3,
    /**
     * Executes the coinflip command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        let numberOfFlips = 1;
        
        // Check if a number of flips was specified
        if (args.length > 0) {
            const num = parseInt(args[0]);
            
            // Validate the number
            if (!isNaN(num) && num > 0 && num <= 10) {
                numberOfFlips = num;
            } else if (!isNaN(num) && num > 10) {
                // Limit to 10 flips
                numberOfFlips = 10;
                message.reply(`I'll only flip up to 10 coins at a time.`);
            }
        }
        
        // Perform the coin flips
        const results = [];
        let heads = 0;
        let tails = 0;
        
        for (let i = 0; i < numberOfFlips; i++) {
            // 50% chance for heads or tails
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            results.push(result);
            
            // Count the results
            if (result === 'Heads') {
                heads++;
            } else {
                tails++;
            }
        }
        
        // Create the results message
        let resultText = '';
        
        if (numberOfFlips === 1) {
            // For a single flip
            resultText = `The coin landed on **${results[0]}**!`;
        } else {
            // For multiple flips
            resultText = results.map((result, index) => `Flip ${index + 1}: **${result}**`).join('\n');
            resultText += `\n\n**Summary:** ${heads} Heads, ${tails} Tails`;
        }
        
        // Send the embed
        message.reply({
            embeds: [
                infoEmbed(
                    'Coin Flip',
                    `Flipping ${numberOfFlips} coin${numberOfFlips > 1 ? 's' : ''}...`,
                    [{ name: 'Results', value: resultText }]
                )
            ]
        });
    }
};