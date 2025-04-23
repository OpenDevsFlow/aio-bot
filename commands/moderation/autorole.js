// Autorole command for configuring automatic role assignment for new members
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { checkPermissions, getMissingPermissions } = require('../../utils/permissions');
const db = require('../../utils/database');

module.exports = {
    name: 'autorole',
    aliases: ['autoroles', 'joinrole'],
    description: 'Configure automatic role assignment for new members',
    usage: 'autorole <enable|disable|status|add|remove|list>',
    cooldown: 5,
    /**
     * Executes the autorole command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if the user has the MANAGE_ROLES permission
        const requiredPermissions = ['ManageRoles'];
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
        
        // Check if the bot has the MANAGE_ROLES permission
        const botMember = message.guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Missing Bot Permissions',
                        `I don't have the required permissions to assign roles.`,
                        [{ name: 'Required Permissions', value: 'Manage Roles' }]
                    )
                ]
            });
        }
        
        // Get the subcommand
        const subCommand = args[0]?.toLowerCase();
        
        // Get the current autorole settings
        const autoroleSettings = db.getAutorole(message.guild.id);
        
        if (!subCommand) {
            // Show help if no subcommand provided
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Autorole Settings',
                        `Use these commands to configure automatic role assignment for new members:`,
                        [
                            { name: `${client.config.prefix}autorole enable`, value: 'Enable autorole' },
                            { name: `${client.config.prefix}autorole disable`, value: 'Disable autorole' },
                            { name: `${client.config.prefix}autorole status`, value: 'View current autorole settings' },
                            { name: `${client.config.prefix}autorole add <@role>`, value: 'Add a role to be automatically assigned' },
                            { name: `${client.config.prefix}autorole remove <@role>`, value: 'Remove a role from auto-assignment' },
                            { name: `${client.config.prefix}autorole list`, value: 'List all roles configured for auto-assignment' },
                        ]
                    )
                ]
            });
        }
        
        // Handle subcommands
        switch (subCommand) {
            case 'enable':
                // Enable autorole
                autoroleSettings.enabled = true;
                db.setAutorole(message.guild.id, autoroleSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autorole Enabled',
                            `Autorole has been enabled for this server.`,
                            [{ name: 'Configured Roles', value: autoroleSettings.roles.length > 0 
                                ? autoroleSettings.roles.map(id => `<@&${id}>`).join(', ')
                                : 'None (add roles with the add command)' }]
                        )
                    ]
                });
                break;
                
            case 'disable':
                // Disable autorole
                autoroleSettings.enabled = false;
                db.setAutorole(message.guild.id, autoroleSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Autorole Disabled',
                            `Autorole has been disabled for this server.`
                        )
                    ]
                });
                break;
                
            case 'status':
                // Show current autorole settings
                const rolesList = autoroleSettings.roles.length > 0 
                    ? autoroleSettings.roles.map(id => `<@&${id}>`).join('\n')
                    : 'No roles configured';
                
                const statusEmbed = infoEmbed(
                    'Autorole Status',
                    `Current autorole settings for ${message.guild.name}:`,
                    [
                        { name: 'Enabled', value: autoroleSettings.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Configured Roles', value: rolesList }
                    ]
                );
                
                message.reply({ embeds: [statusEmbed] });
                break;
                
            case 'add':
                // Add a role to autorole
                const roleToAdd = message.mentions.roles.first();
                
                if (!roleToAdd) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Role',
                                `Please mention a role to add.`,
                                [{ name: 'Usage', value: `${client.config.prefix}autorole add <@role>` }]
                            )
                        ]
                    });
                }
                
                // Check if the role is already configured
                if (autoroleSettings.roles.includes(roleToAdd.id)) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Role Already Added',
                                `The role ${roleToAdd} is already configured for auto-assignment.`
                            )
                        ]
                    });
                }
                
                // Check if the bot can assign this role (role hierarchy check)
                const botHighestRole = botMember.roles.highest;
                if (roleToAdd.position >= botHighestRole.position) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Role Hierarchy Error',
                                `I cannot assign the role ${roleToAdd} because it is positioned higher than or equal to my highest role.`,
                                [{ name: 'Solution', value: 'Move my highest role above the role you want to auto-assign.' }]
                            )
                        ]
                    });
                }
                
                // Add the role
                autoroleSettings.roles.push(roleToAdd.id);
                db.setAutorole(message.guild.id, autoroleSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Role Added',
                            `The role ${roleToAdd} will now be automatically assigned to new members.`,
                            [{ name: 'Note', value: autoroleSettings.enabled 
                                ? 'Autorole is currently enabled.' 
                                : 'Autorole is currently disabled. Enable it with `autorole enable`.' }]
                        )
                    ]
                });
                break;
                
            case 'remove':
                // Remove a role from autorole
                const roleToRemove = message.mentions.roles.first();
                
                if (!roleToRemove) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Missing Role',
                                `Please mention a role to remove.`,
                                [{ name: 'Usage', value: `${client.config.prefix}autorole remove <@role>` }]
                            )
                        ]
                    });
                }
                
                // Check if the role is configured
                if (!autoroleSettings.roles.includes(roleToRemove.id)) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Role Not Found',
                                `The role ${roleToRemove} is not configured for auto-assignment.`
                            )
                        ]
                    });
                }
                
                // Remove the role
                autoroleSettings.roles = autoroleSettings.roles.filter(id => id !== roleToRemove.id);
                db.setAutorole(message.guild.id, autoroleSettings);
                
                message.reply({
                    embeds: [
                        successEmbed(
                            'Role Removed',
                            `The role ${roleToRemove} will no longer be automatically assigned to new members.`
                        )
                    ]
                });
                break;
                
            case 'list':
                // List all autoroles
                if (autoroleSettings.roles.length === 0) {
                    return message.reply({
                        embeds: [
                            infoEmbed(
                                'Autoroles',
                                `There are no roles configured for auto-assignment.`,
                                [{ name: 'Add a Role', value: `Use \`${client.config.prefix}autorole add <@role>\` to add one.` }]
                            )
                        ]
                    });
                }
                
                // Create a list of roles with their positions
                const roles = [];
                for (const roleId of autoroleSettings.roles) {
                    const role = message.guild.roles.cache.get(roleId);
                    if (role) {
                        roles.push({
                            id: roleId,
                            name: role.name,
                            mention: `<@&${roleId}>`,
                            position: role.position
                        });
                    }
                }
                
                // Sort roles by position (highest first)
                roles.sort((a, b) => b.position - a.position);
                
                // Create the list embed
                const listEmbed = infoEmbed(
                    'Autoroles',
                    `The following roles will be automatically assigned to new members:`,
                    [
                        { 
                            name: 'Roles', 
                            value: roles.map(r => r.mention).join('\n') || 'None'
                        },
                        {
                            name: 'Status',
                            value: autoroleSettings.enabled ? 'Autorole is enabled' : 'Autorole is disabled'
                        }
                    ]
                );
                
                message.reply({ embeds: [listEmbed] });
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `"${subCommand}" is not a valid autorole subcommand.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};