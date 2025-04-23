// Event handler for when the bot is ready
const { ActivityType } = require('discord.odf');

module.exports = {
    name: 'ready',
    once: true,
    /**
     * Handles the ready event
     * 
     * @param {Client} client - The Discord client
     */
    execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        console.log(`Serving ${client.guilds.cache.size} guilds`);
        
        // Set bot status and activity
        client.user.setPresence({
            status: 'online',
            activities: [
                {
                    name: `${client.config.prefix}help`,
                    type: ActivityType.Watching
                }
            ]
        });
        
        // Log information about servers the bot is in
        client.guilds.cache.forEach(guild => {
            console.log(`Connected to guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
        });
    }
};
