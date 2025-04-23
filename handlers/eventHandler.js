// Event handler for Discord events
const fs = require('node:fs');
const path = require('node:path');

/**
 * Initializes the event handler
 * 
 * @param {Client} client - The Discord client instance
 */
function initialize(client) {
    // Get all event files
    const eventFiles = fs.readdirSync(path.join(__dirname, '../events'))
        .filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const event = require(`../events/${file}`);
        const eventName = file.slice(0, -3); // Remove the .js extension
        
        // Register once or on depending on the event configuration
        if (event.once) {
            client.once(eventName, (...args) => event.execute(client, ...args));
        } else {
            client.on(eventName, (...args) => event.execute(client, ...args));
        }
        
        console.log(`Loaded event: ${eventName}`);
    }
    
    console.log(`Loaded ${eventFiles.length} events`);
}

module.exports = {
    initialize
};
