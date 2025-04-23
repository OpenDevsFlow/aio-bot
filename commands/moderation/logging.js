// Logging command for configuring server-specific logging settings
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'logging',
    aliases: ['logs'],
    description: 'Configure logging settings for the server',
    usage: 'logging <enable|disable|status|channel|events>',
    cooldown: 5,
    /**
     * Executes the logging command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if the user has the MANAGE_GUILD permission
        const requiredPermissions = ['ManageGuild'];
        if (!checkPermissions(message.member, requiredPermissions)) {
            const missingPermissions = getMissingPermissions(message.member, requiredPermissions);
            
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Missing Permissions',
                        `You don't have the required permissions to use this command.`,
                        [{ name: 'Required Permissions', value: missingPermissions.join(', ') }]
                    )
                ]
            });
        }
        
        // Get the subcommand
        const subCommand = args[0]?.toLowerCase();
        
        // Get the current logging settings
        const loggingSettings = db.getLogging(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Logging Settings',
                        `Use these commands to configure logging for the server:`,
                        [
                            { name: `${client.config.prefix}logging enable`, value: 'Enable logging' },
                            { name: `${client.config.prefix}logging disable`, value: 'Disable logging' },
                            { name: `${client.config.prefix}logging status`, value: 'View current logging settings' },
                            { name: `${client.config.prefix}logging channel <#channel>`, value: 'Set the channel for logging events' },
                            { name: `${client.config.prefix}logging events`, value: 'Toggle which events to log' }
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable logging
                loggingSettings.enabled = true;
                db.setLogging(message.guild.id, loggingSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Logging Enabled',
                            `Logging has been enabled for this server.`,
                            [{ name: 'Log Channel', value: loggingSettings.logChannel ? `<#${loggingSettings.logChannel}>` : 'None set (use `logging channel` to set a channel)' }]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable logging
                loggingSettings.enabled = false;
                db.setLogging(message.guild.id, loggingSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Logging Disabled',
                            `Logging has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current logging settings
                const eventList = Object.entries(loggingSettings.events)
                    .map(([event, enabled]) => `${enabled ? '✅' : '❌'} ${formatEventName(event)}`)
                    .join('\n');
                
                const statusEmbed = infoEmbed(
                    'Logging Status',
                    `Current logging settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: loggingSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Log Channel', value: loggingSettings.logChannel ? `<#${loggingSettings.logChannel}>` : 'None set', inline: true },
                        { name: 'Logged Events', value: eventList }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'channel':
                // Set the log channel
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel',
                                `Please mention a valid channel.`,
                                [{ name: 'Usage', value: `${client.config.prefix}logging channel <#channel>` }]
                            )
                        ]
                    });
                }
                
                // Ensure the channel is a text channel
                if (channel.type !== 0) { // 0 is TextChannel type
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel Type',
                                `The log channel must be a text channel.`
                            )
                        ]
                    });
                }
                
                // Update the settings
                loggingSettings.logChannel = channel.id;
                db.setLogging(message.guild.id, loggingSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Log Channel Updated',
                            `Logs will now be sent to ${channel}.`
                        )
                    ]
                });
                break;
                
            case 'events':
                // Show event configuration menu
                const eventsEmbed = infoEmbed(
                    'Logging Events',
                    `Configure which events to log using the following commands:`,
                    [
                        { name: `${client.config.prefix}logging events memberjoin <on|off>`, value: 'Toggle logging for member joins' },
                        { name: `${client.config.prefix}logging events memberleave <on|off>`, value: 'Toggle logging for member leaves' },
                        { name: `${client.config.prefix}logging events messagedelete <on|off>`, value: 'Toggle logging for message deletions' },
                        { name: `${client.config.prefix}logging events messageedit <on|off>`, value: 'Toggle logging for message edits' },
                        { name: `${client.config.prefix}logging events modactions <on|off>`, value: 'Toggle logging for moderator actions' }
                    ]
                );
                
                // Handle event subcommands
                if (args[1]) {
                    const eventName = args[1].toLowerCase();
                    const toggle = args[2]?.toLowerCase();
                    
                    // Map command event names to the internal event names
                    const eventMap = {
                        'memberjoin': 'memberJoin',
                        'memberleave': 'memberLeave',
                        'messagedelete': 'messageDelete',
                        'messageedit': 'messageEdit',
                        'modactions': 'modActions'
                    };
                    
                    const internalEventName = eventMap[eventName];
                    
                    // Check if the event name is valid
                    if (!internalEventName) {
                        return message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Event',
                                    `"${eventName}" is not a valid event type.`,
                                    [{ name: 'Available Events', value: Object.keys(eventMap).join(', ') }]
                                )
                            ]
                        });
                    }
                    
                    // Check if toggle is valid
                    if (!toggle || !['on', 'off'].includes(toggle)) {
                        return message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Toggle',
                                    `Please specify either "on" or "off".`,
                                    [{ name: 'Usage', value: `${client.config.prefix}logging events ${eventName} <on|off>` }]
                                )
                            ]
                        });
                    }
                    
                    // Update the event setting
                    loggingSettings.events[internalEventName] = (toggle === 'on');
                    db.setLogging(message.guild.id, loggingSettings);
                    
                    message.reply({
                        embeds: [
                            successEmbed(
                                'Event Setting Updated',
                                `Logging for ${formatEventName(internalEventName)} is now ${toggle === 'on' ? 'enabled' : 'disabled'}.`
                            )
                        ]
                    });
                    
                    return;
                }
                
                // If no event specified, show the events menu
                message.reply({ embeds: [eventsEmbed] });
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid logging subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};

/**
 * Formats an event name for display
 * @param {string} eventName - The internal event name
 * @returns {string} The formatted event name
 */
function formatEventName(eventName) {
    const formatMap = {
        'memberJoin': 'Member Joins',
        'memberLeave': 'Member Leaves',
        'messageDelete': 'Message Deletions',
        'messageEdit': 'Message Edits',
        'modActions': 'Moderator Actions'
    };
    
    return formatMap[eventName] || eventName;
}