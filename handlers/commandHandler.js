// Command handler for processing and executing commands
const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.odf');

/**
 * Initializes the command handler
 * 
 * @param {Client} client - The Discord client instance
 */
function initialize(client) {
    client.commands = new Collection();
    
    // Get all command category folders
    const commandFolders = fs.readdirSync(path.join(__dirname, '../commands'));
    
    for (const folder of commandFolders) {
        // Get all command files in each category
        const commandFiles = fs.readdirSync(path.join(__dirname, `../commands/${folder}`))
            .filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            
            // Set command's category based on folder name
            command.category = folder;
            
            // Add the command to the collection
            client.commands.set(command.name, command);
            console.log(`Loaded command: ${command.name}`);
        }
    }
    
    console.log(`Loaded ${client.commands.size} commands in ${commandFolders.length} categories`);
}

/**
 * Executes a command
 * 
 * @param {Client} client - The Discord client instance
 * @param {Message} message - The message that triggered the command
 * @param {Array} args - Command arguments
 * @param {string} commandName - Name of the command to execute
 */
function executeCommand(client, message, args, commandName) {
    // Get the command from the collection
    const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    // If command not found, return
    if (!command) return;
    
    // Handle command cooldowns
    if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
    }
    
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || client.config.defaultCooldown) * 1000;
    
    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            
            return message.reply({
                content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`
            });
        }
    }
    
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    
    // Execute the command
    try {
        command.execute(client, message, args);
    } catch (error) {
        console.error(`Error executing command ${command.name}:`, error);
        message.reply({
            content: 'There was an error executing that command. Please try again later.'
        });
    }
}

module.exports = {
    initialize,
    executeCommand
};
