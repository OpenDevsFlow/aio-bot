// Utility for checking and handling permissions
const { PermissionsBitField } = require('discord.odf');
const config = require('../config');

/**
 * Checks if a member has the required permissions
 * 
 * @param {GuildMember} member - The guild member to check permissions for
 * @param {Array} requiredPermissions - Array of required permission flags
 * @returns {boolean} Whether the member has the required permissions
 */
function checkPermissions(member, requiredPermissions) {
    if (!member || !member.permissions) return false;
    
    // Check if the member is a developer of the bot
    if (config.developers.includes(member.user.id)) return true;
    
    // Check if the member has administrator permissions
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    
    // Check each required permission
    return requiredPermissions.every(permission => 
        member.permissions.has(PermissionsBitField.Flags[permission])
    );
}

/**
 * Gets a formatted list of missing permissions
 * 
 * @param {GuildMember} member - The guild member to check permissions for
 * @param {Array} requiredPermissions - Array of required permission flags
 * @returns {Array} Array of missing permission names
 */
function getMissingPermissions(member, requiredPermissions) {
    if (!member || !member.permissions) return requiredPermissions;
    
    return requiredPermissions.filter(permission => 
        !member.permissions.has(PermissionsBitField.Flags[permission])
    ).map(permission => {
        return config.permissions[permission] || permission;
    });
}

/**
 * Checks if the bot has the required permissions
 * 
 * @param {GuildMember} botMember - The bot's guild member object
 * @param {Array} requiredPermissions - Array of required permission flags
 * @returns {boolean} Whether the bot has the required permissions
 */
function checkBotPermissions(botMember, requiredPermissions) {
    if (!botMember || !botMember.permissions) return false;
    
    // Check if the bot has administrator permissions
    if (botMember.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    
    // Check each required permission
    return requiredPermissions.every(permission => 
        botMember.permissions.has(PermissionsBitField.Flags[permission])
    );
}

/**
 * Gets a formatted list of missing bot permissions
 * 
 * @param {GuildMember} botMember - The bot's guild member object
 * @param {Array} requiredPermissions - Array of required permission flags
 * @returns {Array} Array of missing permission names
 */
function getMissingBotPermissions(botMember, requiredPermissions) {
    if (!botMember || !botMember.permissions) return requiredPermissions;
    
    return requiredPermissions.filter(permission => 
        !botMember.permissions.has(PermissionsBitField.Flags[permission])
    ).map(permission => {
        return config.permissions[permission] || permission;
    });
}

module.exports = {
    checkPermissions,
    getMissingPermissions,
    checkBotPermissions,
    getMissingBotPermissions
};
