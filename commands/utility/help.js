// Help command for displaying command information
const { infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
    name: 'help',
    description: 'Displays help information for commands',
    usage: 'help [command]',
    cooldown: 3,
    /**
     * Executes the help command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        const { commands } = client;
        const prefix = client.config.prefix;
        
        // If no arguments, show all commands grouped by category
        if (!args.length) {
            // Group commands by category
            const categories = {};
            
            commands.forEach(command => {
                const category = command.category || 'Uncategorized';
                
                if (!categories[category]) {
                    categories[category] = [];
                }
                
                categories[category].push(command.name);
            });
            
            // Create fields for each category
            const fields = [];
            
            for (const [category, commandList] of Object.entries(categories)) {
                fields.push({
                    name: `${category.charAt(0).toUpperCase() + category.slice(1)}`,
                    value: commandList.map(name => `\`${name}\``).join(', ')
                });
            }
            
            fields.push({
                name: 'Detailed Help',
                value: `Use \`${prefix}help <command>\` to get detailed information about a specific command.`
            });
            
            // Send the help message
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Command Help',
                        `Here's a list of all available commands.`,
                        fields
                    )
                ]
            });
        }
        
        // Get the requested command
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName) || 
                       commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) {
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Unknown Command',
                        `I couldn't find a command called \`${commandName}\`.`,
                        [{ name: 'Available Commands', value: `Use \`${prefix}help\` to see a list of all commands.` }]
                    )
                ]
            });
        }
        
        // Build the command help embed
        const fields = [];
        
        if (command.aliases) {
            fields.push({ name: 'Aliases', value: command.aliases.map(alias => `\`${alias}\``).join(', ') });
        }
        
        if (command.usage) {
            fields.push({ name: 'Usage', value: `\`${prefix}${command.usage}\`` });
        }
        
        if (command.cooldown) {
            fields.push({ name: 'Cooldown', value: `${command.cooldown} second(s)` });
        }
        
        // Send the command help
        message.reply({
            embeds: [
                infoEmbed(
                    `Command: ${command.name}`,
                    command.description || 'No description provided.',
                    fields
                )
            ]
        });
    }
};
