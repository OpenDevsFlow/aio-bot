// Ping command for checking the bot's latency
const { infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'ping',
    description: 'Displays the bot\'s latency and API ping',
    usage: 'ping',
    cooldown: 5,
    /**
     * Executes the ping command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Send initial message
        message.reply({
            embeds: [
                infoEmbed(
                    'Ping',
                    'Calculating ping...'
                )
            ]
        }).then(sent => {
            // Calculate the round-trip latency
            const latency = sent.createdTimestamp - message.createdTimestamp;
            
            // Get the WebSocket ping
            const apiPing = client.ws.ping;
            
            // Update the message with the ping information
            sent.edit({
                embeds: [
                    infoEmbed(
                        'Ping',
                        'Here are the current ping statistics:',
                        [
                            { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                            { name: 'API Latency', value: `${apiPing}ms`, inline: true }
                        ]
                    )
                ]
            });
        });
    }
};
