// Dice roll command
const { infoEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'diceroll'],
    description: 'Roll one or more dice with a specified number of sides',
    usage: 'dice [number of dice]d[sides] (e.g., 1d6, 2d20, 3d4)',
    cooldown: 3,
    /**
     * Executes the dice roll command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        let numberOfDice = 1;
        let sides = 6;
        
        // Parse the dice arguments if provided
        if (args.length > 0) {
            const dicePattern = /^(\d+)?d(\d+)$/i;
            const match = args[0].match(dicePattern);
            
            if (match) {
                // If the first capture group exists, set numberOfDice
                if (match[1]) {
                    numberOfDice = parseInt(match[1]);
                }
                // Set the number of sides
                sides = parseInt(match[2]);
                
                // Check if the values are valid
                if (isNaN(numberOfDice) || isNaN(sides) || numberOfDice < 1 || sides < 2 || numberOfDice > 100 || sides > 1000) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Dice',
                                `Please use a valid dice format: 1-100 dice with 2-1000 sides each.`,
                                [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                            )
                        ]
                    });
                }
            } else {
                return message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Format',
                            `Please use the correct dice format.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
            }
        }
        
        // Roll the dice
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < numberOfDice; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }
        
        // Create results string
        let resultString = rolls.join(', ');
        
        // If there are multiple dice, add the total
        if (numberOfDice > 1) {
            resultString += ` (Total: ${total})`;
        }
        
        // Create and send the embed
        message.reply({
            embeds: [
                infoEmbed(
                    'Dice Roll',
                    `Rolling **${numberOfDice}d${sides}**`,
                    [{ name: 'Result', value: resultString }]
                )
            ]
        });
    }
};