// Anti-nuke command for configuring server protection against nuking
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'antinuke',
    aliases: ['anti-nuke', 'security'],
    description: 'Configure anti-nuke protection for the server',
    usage: 'antinuke <enable|disable|status|settings|whitelist>',
    cooldown: 5,
    /**
     * Executes the anti-nuke command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if the user has the ADMINISTRATOR permission
        const requiredPermissions = ['Administrator'];
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
        
        // Only allow server owner to use this command
        if (message.guild.ownerId !== message.author.id) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Owner Only Command',
                        `Only the server owner can use the anti-nuke system for security reasons.`
                    )
                ]
            });
        }
        
        // Get the subcommand
        const subCommand = args[0]?.toLowerCase();
        
        // Get the current anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Anti-Nuke Settings',
                        `The anti-nuke system helps protect your server from malicious actions like mass bans, channel deletions, and more.`,
                        [
                            { name: `${client.config.prefix}antinuke enable`, value: 'Enable anti-nuke protection' },
                            { name: `${client.config.prefix}antinuke disable`, value: 'Disable anti-nuke protection' },
                            { name: `${client.config.prefix}antinuke status`, value: 'View current anti-nuke settings' },
                            { name: `${client.config.prefix}antinuke settings <protection> <option> <value>`, value: 'Configure anti-nuke protection settings' },
                            { name: `${client.config.prefix}antinuke whitelist <add|remove|list> <user|role>`, value: 'Manage the anti-nuke whitelist' },
                            { name: `${client.config.prefix}antinuke log <#channel>`, value: 'Set the log channel for anti-nuke actions' },
                            { name: 'Available Protections', value: 'maxBans, maxKicks, maxRoleDeletes, maxChannelDeletes, webhookCreate, botAdd' }
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable anti-nuke
                antiNukeSettings.enabled = true;
                db.setAntiNuke(message.guild.id, antiNukeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Anti-Nuke Enabled',
                            `Anti-nuke protection has been enabled for this server.`,
                            [
                                { name: 'Important', value: 'Make sure to whitelist trusted staff members and bots to prevent false positives.' },
                                { name: 'Log Channel', value: antiNukeSettings.logChannel ? `<#${antiNukeSettings.logChannel}>` : 'Not set - use `antinuke log <#channel>` to set one' }
                            ]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable anti-nuke
                antiNukeSettings.enabled = false;
                db.setAntiNuke(message.guild.id, antiNukeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Anti-Nuke Disabled',
                            `Anti-nuke protection has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current anti-nuke settings
                const protectionInfoFields = [];
                
                // Add information for each protection
                for (const [protection, settings] of Object.entries(antiNukeSettings.settings)) {
                    let value = settings.enabled ? 'Enabled' : 'Disabled';
                    
                    if (protection.startsWith('max') && settings.enabled) {
                        value += ` (Threshold: ${settings.threshold} in ${settings.time / 1000}s, Action: ${settings.action})`;
                    } else if (settings.enabled) {
                        value += ` (Action: ${settings.action})`;
                    }
                    
                    protectionInfoFields.push({ name: formatProtectionName(protection), value });
                }
                
                // Add whitelist information
                const whitelistedUsers = antiNukeSettings.whitelistedUsers.length > 0
                    ? antiNukeSettings.whitelistedUsers.map(id => `<@${id}>`).join(', ')
                    : 'None';
                    
                const whitelistedRoles = antiNukeSettings.whitelistedRoles.length > 0
                    ? antiNukeSettings.whitelistedRoles.map(id => `<@&${id}>`).join(', ')
                    : 'None';
                
                const statusEmbed = infoEmbed(
                    'Anti-Nuke Status',
                    `Current anti-nuke settings for ${message.guild.name}:`,
                    [
                        { name: 'Status', value: antiNukeSettings.enabled ? 'Enabled' : 'Disabled', inline: true },
                        { name: 'Log Channel', value: antiNukeSettings.logChannel ? `<#${antiNukeSettings.logChannel}>` : 'Not set', inline: true },
                        { name: 'Actions Taken', value: antiNukeSettings.actionHistory.length.toString(), inline: true },
                        { name: 'Protections', value: '------------------' },
                        ...protectionInfoFields,
                        { name: 'Whitelisted Users', value: whitelistedUsers },
                        { name: 'Whitelisted Roles', value: whitelistedRoles }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'settings':
                // Configure anti-nuke settings
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Anti-Nuke Settings',
                                `Configure settings for specific anti-nuke protections:`,
                                [
                                    { name: `${client.config.prefix}antinuke settings <protection> enable <true|false>`, value: 'Enable or disable a specific protection' },
                                    { name: `${client.config.prefix}antinuke settings <protection> threshold <number>`, value: 'Set the threshold for detection (for max* protections)' },
                                    { name: `${client.config.prefix}antinuke settings <protection> time <seconds>`, value: 'Set the time window for detection (for max* protections)' },
                                    { name: `${client.config.prefix}antinuke settings <protection> action <action>`, value: 'Set the action to take (ban, kick, derank, delete)' },
                                    { name: 'Available Protections', value: 'maxBans, maxKicks, maxRoleDeletes, maxChannelDeletes, webhookCreate, botAdd' }
                                ]
                            )
                        ]
                    });
                }
                
                const protection = args[1].toLowerCase();
                
                // Check if the protection exists
                if (!antiNukeSettings.settings[protection]) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Protection',
                                `"${protection}" is not a valid anti-nuke protection.`,
                                [{ name: 'Available Protections', value: 'maxBans, maxKicks, maxRoleDeletes, maxChannelDeletes, webhookCreate, botAdd' }]
                            )
                        ]
                    });
                }
                
                // Get the setting to change
                const setting = args[2]?.toLowerCase();
                const value = args[3]?.toLowerCase();
                
                if (!setting || !value) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Parameters',
                                `Please specify both a setting and value.`,
                                [{ name: 'Usage', value: `${client.config.prefix}antinuke settings ${protection} <setting> <value>` }]
                            )
                        ]
                    });
                }
                
                switch (setting) {
                    case 'enable':
                        // Enable or disable the protection
                        if (value !== 'true' && value !== 'false') {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify either 'true' or 'false'.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke settings ${protection} enable <true|false>` }]
                                    )
                                ]
                            });
                        }
                        
                        antiNukeSettings.settings[protection].enabled = value === 'true';
                        db.setAntiNuke(message.guild.id, antiNukeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `The ${formatProtectionName(protection)} protection has been ${antiNukeSettings.settings[protection].enabled ? 'enabled' : 'disabled'}.`
                                )
                            ]
                        });
                        break;
                        
                    case 'threshold':
                        // Check if this protection supports thresholds
                        if (!protection.startsWith('max')) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Unsupported Setting',
                                        `The ${formatProtectionName(protection)} protection does not use thresholds.`
                                    )
                                ]
                            });
                        }
                        
                        // Parse the threshold
                        const threshold = parseInt(value);
                        
                        if (isNaN(threshold) || threshold < 1) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify a positive number.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke settings ${protection} threshold <number>` }]
                                    )
                                ]
                            });
                        }
                        
                        antiNukeSettings.settings[protection].threshold = threshold;
                        db.setAntiNuke(message.guild.id, antiNukeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `The threshold for ${formatProtectionName(protection)} has been set to ${threshold}.`
                                )
                            ]
                        });
                        break;
                        
                    case 'time':
                        // Check if this protection supports time windows
                        if (!protection.startsWith('max')) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Unsupported Setting',
                                        `The ${formatProtectionName(protection)} protection does not use time windows.`
                                    )
                                ]
                            });
                        }
                        
                        // Parse the time (in seconds)
                        const time = parseInt(value);
                        
                        if (isNaN(time) || time < 1) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Value',
                                        `Please specify a positive number of seconds.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke settings ${protection} time <seconds>` }]
                                    )
                                ]
                            });
                        }
                        
                        antiNukeSettings.settings[protection].time = time * 1000; // Convert to milliseconds
                        db.setAntiNuke(message.guild.id, antiNukeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `The time window for ${formatProtectionName(protection)} has been set to ${time} seconds.`
                                )
                            ]
                        });
                        break;
                        
                    case 'action':
                        // Validate the action
                        const validActions = protection === 'botAdd' ? ['kick', 'ban'] : 
                                            protection === 'webhookCreate' ? ['delete'] : 
                                            ['ban', 'kick', 'derank'];
                        
                        if (!validActions.includes(value)) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Invalid Action',
                                        `Please specify a valid action: ${validActions.join(', ')}.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke settings ${protection} action <action>` }]
                                    )
                                ]
                            });
                        }
                        
                        antiNukeSettings.settings[protection].action = value;
                        db.setAntiNuke(message.guild.id, antiNukeSettings);
                        
                        message.reply({
                            embeds: [
                                successEmbed(
                                    'Setting Updated',
                                    `The action for ${formatProtectionName(protection)} has been set to "${value}".`
                                )
                            ]
                        });
                        break;
                        
                    default:
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Setting',
                                    `"${setting}" is not a valid setting for anti-nuke protections.`,
                                    [{ name: 'Available Settings', value: 'enable, threshold, time, action' }]
                                )
                            ]
                        });
                }
                break;
                
            case 'whitelist':
                // Manage the anti-nuke whitelist
                if (args.length < 2) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Anti-Nuke Whitelist',
                                `Manage the whitelist of users and roles exempt from anti-nuke detection:`,
                                [
                                    { name: `${client.config.prefix}antinuke whitelist add <@user|@role>`, value: 'Add a user or role to the whitelist' },
                                    { name: `${client.config.prefix}antinuke whitelist remove <@user|@role>`, value: 'Remove a user or role from the whitelist' },
                                    { name: `${client.config.prefix}antinuke whitelist list`, value: 'List all whitelisted users and roles' },
                                    { name: 'Note', value: 'The server owner is always whitelisted by default.' }
                                ]
                            )
                        ]
                    });
                }
                
                const whitelistSubCommand = args[1].toLowerCase();
                
                switch (whitelistSubCommand) {
                    case 'add':
                        // Check if a user or role was mentioned
                        const userToAdd = message.mentions.users.first();
                        const roleToAdd = message.mentions.roles.first();
                        
                        if (!userToAdd && !roleToAdd) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Missing Mention',
                                        `Please mention a user or role to add to the whitelist.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke whitelist add <@user|@role>` }]
                                    )
                                ]
                            });
                        }
                        
                        if (userToAdd) {
                            // Check if the user is already whitelisted
                            if (antiNukeSettings.whitelistedUsers.includes(userToAdd.id)) {
                                return message.reply({
                                    embeds: [
                                        errorEmbed(
                                            'Already Whitelisted',
                                            `${userToAdd} is already on the whitelist.`
                                        )
                                    ]
                                });
                            }
                            
                            // Add the user to the whitelist
                            antiNukeSettings.whitelistedUsers.push(userToAdd.id);
                            db.setAntiNuke(message.guild.id, antiNukeSettings);
                            
                            message.reply({
                                embeds: [
                                    successEmbed(
                                        'User Whitelisted',
                                        `${userToAdd} has been added to the anti-nuke whitelist.`
                                    )
                                ]
                            });
                        } else if (roleToAdd) {
                            // Check if the role is already whitelisted
                            if (antiNukeSettings.whitelistedRoles.includes(roleToAdd.id)) {
                                return message.reply({
                                    embeds: [
                                        errorEmbed(
                                            'Already Whitelisted',
                                            `${roleToAdd} is already on the whitelist.`
                                        )
                                    ]
                                });
                            }
                            
                            // Add the role to the whitelist
                            antiNukeSettings.whitelistedRoles.push(roleToAdd.id);
                            db.setAntiNuke(message.guild.id, antiNukeSettings);
                            
                            message.reply({
                                embeds: [
                                    successEmbed(
                                        'Role Whitelisted',
                                        `${roleToAdd} has been added to the anti-nuke whitelist.`
                                    )
                                ]
                            });
                        }
                        break;
                        
                    case 'remove':
                        // Check if a user or role was mentioned
                        const userToRemove = message.mentions.users.first();
                        const roleToRemove = message.mentions.roles.first();
                        
                        if (!userToRemove && !roleToRemove) {
                            return message.reply({
                                embeds: [
                                    errorEmbed(
                                        'Missing Mention',
                                        `Please mention a user or role to remove from the whitelist.`,
                                        [{ name: 'Usage', value: `${client.config.prefix}antinuke whitelist remove <@user|@role>` }]
                                    )
                                ]
                            });
                        }
                        
                        if (userToRemove) {
                            // Check if the user is on the whitelist
                            if (!antiNukeSettings.whitelistedUsers.includes(userToRemove.id)) {
                                return message.reply({
                                    embeds: [
                                        errorEmbed(
                                            'Not Whitelisted',
                                            `${userToRemove} is not on the whitelist.`
                                        )
                                    ]
                                });
                            }
                            
                            // Remove the user from the whitelist
                            antiNukeSettings.whitelistedUsers = antiNukeSettings.whitelistedUsers.filter(id => id !== userToRemove.id);
                            db.setAntiNuke(message.guild.id, antiNukeSettings);
                            
                            message.reply({
                                embeds: [
                                    successEmbed(
                                        'User Removed',
                                        `${userToRemove} has been removed from the anti-nuke whitelist.`
                                    )
                                ]
                            });
                        } else if (roleToRemove) {
                            // Check if the role is on the whitelist
                            if (!antiNukeSettings.whitelistedRoles.includes(roleToRemove.id)) {
                                return message.reply({
                                    embeds: [
                                        errorEmbed(
                                            'Not Whitelisted',
                                            `${roleToRemove} is not on the whitelist.`
                                        )
                                    ]
                                });
                            }
                            
                            // Remove the role from the whitelist
                            antiNukeSettings.whitelistedRoles = antiNukeSettings.whitelistedRoles.filter(id => id !== roleToRemove.id);
                            db.setAntiNuke(message.guild.id, antiNukeSettings);
                            
                            message.reply({
                                embeds: [
                                    successEmbed(
                                        'Role Removed',
                                        `${roleToRemove} has been removed from the anti-nuke whitelist.`
                                    )
                                ]
                            });
                        }
                        break;
                        
                    case 'list':
                        // List all whitelisted users and roles
                        const whitelistedUsersStr = antiNukeSettings.whitelistedUsers.length > 0
                            ? antiNukeSettings.whitelistedUsers.map(id => `<@${id}>`).join(', ')
                            : 'None';
                            
                        const whitelistedRolesStr = antiNukeSettings.whitelistedRoles.length > 0
                            ? antiNukeSettings.whitelistedRoles.map(id => `<@&${id}>`).join(', ')
                            : 'None';
                        
                        message.reply({
                            embeds: [
                                infoEmbed(
                                    'Anti-Nuke Whitelist',
                                    `Users and roles exempt from anti-nuke detection:`,
                                    [
                                        { name: 'Whitelisted Users', value: whitelistedUsersStr },
                                        { name: 'Whitelisted Roles', value: whitelistedRolesStr },
                                        { name: 'Note', value: 'The server owner is always whitelisted by default.' }
                                    ]
                                )
                            ]
                        });
                        break;
                        
                    default:
                        message.reply({
                            embeds: [
                                errorEmbed(
                                    'Invalid Subcommand',
                                    `"${whitelistSubCommand}" is not a valid whitelist subcommand.`,
                                    [{ name: 'Available Subcommands', value: 'add, remove, list' }]
                                )
                            ]
                        });
                }
                break;
                
            case 'log':
                // Set the log channel for anti-nuke actions
                const logChannel = message.mentions.channels.first();
                
                if (!logChannel) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Channel',
                                `Please mention a channel to set as the anti-nuke log channel.`,
                                [{ name: 'Usage', value: `${client.config.prefix}antinuke log <#channel>` }]
                            )
                        ]
                    });
                }
                
                // Check if the channel is in this guild
                if (logChannel.guild.id !== message.guild.id) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Channel',
                                `The mentioned channel must be in this server.`
                            )
                        ]
                    });
                }
                
                // Check if the bot can send messages to this channel
                if (!logChannel.permissionsFor(message.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Permissions',
                                `I don't have permission to send messages or embeds to ${logChannel}.`,
                                [{ name: 'Required Permissions', value: 'Send Messages, Embed Links' }]
                            )
                        ]
                    });
                }
                
                // Update the settings
                antiNukeSettings.logChannel = logChannel.id;
                db.setAntiNuke(message.guild.id, antiNukeSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Log Channel Updated',
                            `Anti-nuke logs will now be sent to ${logChannel}.`
                        )
                    ]
                });
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid anti-nuke subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};

/**
 * Formats a protection name for display
 * @param {string} protection - The internal protection name
 * @returns {string} The formatted protection name
 */
function formatProtectionName(protection) {
    const formatMap = {
        'maxBans': 'Mass Ban Detection',
        'maxKicks': 'Mass Kick Detection',
        'maxRoleDeletes': 'Mass Role Deletion',
        'maxChannelDeletes': 'Mass Channel Deletion',
        'webhookCreate': 'Webhook Creation',
        'botAdd': 'Bot Addition'
    };
    
    return formatMap[protection] || protection;
}