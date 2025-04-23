// 8ball command - ask a question and get a random response
const { infoEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: '8ball',
    aliases: ['eightball', 'magic8'],
    description: 'Ask the magic 8-ball a question',
    usage: '8ball <question>',
    cooldown: 3,
    /**
     * Executes the 8ball command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if a question was asked
        if (args.length === 0) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Invalid Usage',
                        `You need to ask a question!`,
                        [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                    )
                ]
            });
        }

        // Array of possible responses
        const responses = [
            // Positive responses
            'It is certain.',
            'It is decidedly so.',
            'Without a doubt.',
            'Yes – definitely.',
            'You may rely on it.',
            'As I see it, yes.',
            'Most likely.',
            'Outlook good.',
            'Yes.',
            'Signs point to yes.',
            // Neutral responses
            'Reply hazy, try again.',
            'Ask again later.',
            'Better not tell you now.',
            'Cannot predict now.',
            'Concentrate and ask again.',
            // Negative responses
            'Don\'t count on it.',
            'My reply is no.',
            'My sources say no.',
            'Outlook not so good.',
            'Very doubtful.'
        ];

        // Get a random response
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        // Create and send the embed
        message.reply({
            embeds: [
                infoEmbed(
                    'Magic 8-Ball',
                    `**Question:** ${args.join(' ')}`,
                    [{ name: 'Answer', value: randomResponse }]
                )
            ]
        });
    }
};