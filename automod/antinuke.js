// Anti-nuke system for protecting servers from malicious actions
const { EmbedBuilder, AuditLogEvent } = require('discord.odf');
const db = require('../utils/database');

// Store action counts for each user (userId -> type -> timestamps[])
const actionCounts = new Map();

/**
 * Initialize the anti-nuke protection tracking
 * @param {Client} client - The Discord client
 */
function initAntiNuke(client) {
    // Set up event listeners for different actions
    client.on('guildBanAdd', (ban) => handleBan(client, ban));
    client.on('guildMemberRemove', (member) => handlePossibleKick(client, member));
    client.on('roleDelete', (role) => handleRoleDelete(client, role));
    client.on('channelDelete', (channel) => handleChannelDelete(client, channel));
    client.on('webhookCreate', (webhook) => handleWebhookCreate(client, webhook));
    client.on('guildMemberAdd', (member) => {
        if (member.user.bot) {
            handleBotAdd(client, member);
        }
    });
    
    // Clean up old action counts periodically (every 10 minutes)
    setInterval(() => cleanupActionCounts(), 10 * 60 * 1000);
}

/**
 * Handles a ban event
 * @param {Client} client - The Discord client
 * @param {GuildBan} ban - The ban that occurred
 */
async function handleBan(client, ban) {
    try {
        const { guild } = ban;
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or maxBans protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.maxBans.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest ban entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const banLog = auditLogs.entries.first();
        if (!banLog) return;
        
        const { executor } = banLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - banLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Track the ban action
        trackAction(executor.id, 'ban', antiNukeSettings.settings.maxBans);
        
        // Check if the threshold has been exceeded
        const actionCount = getActionCount(executor.id, 'ban', antiNukeSettings.settings.maxBans.time);
        
        if (actionCount >= antiNukeSettings.settings.maxBans.threshold) {
            // Take action against the executor
            await takeAction(client, guild, executor.id, 'maxBans', antiNukeSettings, actionCount);
        }
    } catch (error) {
        console.error('Error handling ban in anti-nuke:', error);
    }
}

/**
 * Handles a possible kick event
 * @param {Client} client - The Discord client
 * @param {GuildMember} member - The member who left
 */
async function handlePossibleKick(client, member) {
    try {
        const { guild } = member;
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or maxKicks protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.maxKicks.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest kick entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberKick,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const kickLog = auditLogs.entries.first();
        if (!kickLog || kickLog.target.id !== member.id) return;
        
        const { executor } = kickLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - kickLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Track the kick action
        trackAction(executor.id, 'kick', antiNukeSettings.settings.maxKicks);
        
        // Check if the threshold has been exceeded
        const actionCount = getActionCount(executor.id, 'kick', antiNukeSettings.settings.maxKicks.time);
        
        if (actionCount >= antiNukeSettings.settings.maxKicks.threshold) {
            // Take action against the executor
            await takeAction(client, guild, executor.id, 'maxKicks', antiNukeSettings, actionCount);
        }
    } catch (error) {
        console.error('Error handling kick in anti-nuke:', error);
    }
}

/**
 * Handles a role deletion event
 * @param {Client} client - The Discord client
 * @param {Role} role - The role that was deleted
 */
async function handleRoleDelete(client, role) {
    try {
        const { guild } = role;
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or maxRoleDeletes protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.maxRoleDeletes.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest role delete entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.RoleDelete,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const roleLog = auditLogs.entries.first();
        if (!roleLog) return;
        
        const { executor } = roleLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - roleLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Track the role delete action
        trackAction(executor.id, 'roleDelete', antiNukeSettings.settings.maxRoleDeletes);
        
        // Check if the threshold has been exceeded
        const actionCount = getActionCount(executor.id, 'roleDelete', antiNukeSettings.settings.maxRoleDeletes.time);
        
        if (actionCount >= antiNukeSettings.settings.maxRoleDeletes.threshold) {
            // Take action against the executor
            await takeAction(client, guild, executor.id, 'maxRoleDeletes', antiNukeSettings, actionCount);
        }
    } catch (error) {
        console.error('Error handling role delete in anti-nuke:', error);
    }
}

/**
 * Handles a channel deletion event
 * @param {Client} client - The Discord client
 * @param {GuildChannel} channel - The channel that was deleted
 */
async function handleChannelDelete(client, channel) {
    try {
        const { guild } = channel;
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or maxChannelDeletes protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.maxChannelDeletes.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest channel delete entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelDelete,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const channelLog = auditLogs.entries.first();
        if (!channelLog) return;
        
        const { executor } = channelLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - channelLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Track the channel delete action
        trackAction(executor.id, 'channelDelete', antiNukeSettings.settings.maxChannelDeletes);
        
        // Check if the threshold has been exceeded
        const actionCount = getActionCount(executor.id, 'channelDelete', antiNukeSettings.settings.maxChannelDeletes.time);
        
        if (actionCount >= antiNukeSettings.settings.maxChannelDeletes.threshold) {
            // Take action against the executor
            await takeAction(client, guild, executor.id, 'maxChannelDeletes', antiNukeSettings, actionCount);
        }
    } catch (error) {
        console.error('Error handling channel delete in anti-nuke:', error);
    }
}

/**
 * Handles a webhook creation event
 * @param {Client} client - The Discord client
 * @param {Webhook} webhook - The webhook that was created
 */
async function handleWebhookCreate(client, webhook) {
    try {
        const { guild } = webhook;
        if (!guild) return; // Skip if it's not a guild webhook
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or webhookCreate protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.webhookCreate.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest webhook create entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.WebhookCreate,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const webhookLog = auditLogs.entries.first();
        if (!webhookLog) return;
        
        const { executor } = webhookLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - webhookLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Take action based on the settings
        if (antiNukeSettings.settings.webhookCreate.action === 'delete') {
            // Delete the webhook
            await webhook.delete('Anti-nuke protection').catch(() => {});
            
            // Log the action
            logAction(client, guild, executor.id, 'webhookCreate', antiNukeSettings, 'Webhook was deleted');
        }
    } catch (error) {
        console.error('Error handling webhook create in anti-nuke:', error);
    }
}

/**
 * Handles a bot addition event
 * @param {Client} client - The Discord client
 * @param {GuildMember} botMember - The bot that was added
 */
async function handleBotAdd(client, botMember) {
    try {
        const { guild } = botMember;
        
        // Get anti-nuke settings
        const antiNukeSettings = db.getAntiNuke(guild.id);
        
        // Skip if anti-nuke is disabled or botAdd protection is disabled
        if (!antiNukeSettings.enabled || !antiNukeSettings.settings.botAdd.enabled) return;
        
        // Wait a moment to let the audit log update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the latest bot add entry from the audit logs
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.BotAdd,
            limit: 1
        }).catch(() => null);
        
        if (!auditLogs) return;
        
        const botLog = auditLogs.entries.first();
        if (!botLog || botLog.target.id !== botMember.id) return;
        
        const { executor } = botLog;
        
        // Skip if the executor is the bot itself or the action is too old
        if (executor.id === client.user.id || 
            Date.now() - botLog.createdTimestamp > 10000) return;
        
        // Skip if the executor is whitelisted
        if (isWhitelisted(executor.id, guild, antiNukeSettings)) return;
        
        // Take action based on the settings
        if (antiNukeSettings.settings.botAdd.action === 'kick') {
            // Kick the bot
            await botMember.kick('Anti-nuke protection').catch(() => {});
            
            // Log the action
            logAction(client, guild, executor.id, 'botAdd', antiNukeSettings, 'Bot was kicked');
        } else if (antiNukeSettings.settings.botAdd.action === 'ban') {
            // Ban the bot
            await guild.members.ban(botMember.id, { reason: 'Anti-nuke protection' }).catch(() => {});
            
            // Log the action
            logAction(client, guild, executor.id, 'botAdd', antiNukeSettings, 'Bot was banned');
        }
    } catch (error) {
        console.error('Error handling bot add in anti-nuke:', error);
    }
}

/**
 * Tracks an action for a user
 * @param {string} userId - The ID of the user
 * @param {string} actionType - The type of action
 * @param {Object} settings - Settings for this action type
 */
function trackAction(userId, actionType, settings) {
    if (!actionCounts.has(userId)) {
        actionCounts.set(userId, {});
    }
    
    const userActions = actionCounts.get(userId);
    
    if (!userActions[actionType]) {
        userActions[actionType] = [];
    }
    
    userActions[actionType].push(Date.now());
}

/**
 * Gets the count of actions for a user within a time window
 * @param {string} userId - The ID of the user
 * @param {string} actionType - The type of action
 * @param {number} timeWindow - The time window in milliseconds
 * @returns {number} The number of actions within the time window
 */
function getActionCount(userId, actionType, timeWindow) {
    if (!actionCounts.has(userId)) return 0;
    
    const userActions = actionCounts.get(userId);
    if (!userActions[actionType]) return 0;
    
    const now = Date.now();
    const recentActions = userActions[actionType].filter(timestamp => now - timestamp < timeWindow);
    
    // Update the action list to only include recent actions
    userActions[actionType] = recentActions;
    
    return recentActions.length;
}

/**
 * Checks if a user is whitelisted
 * @param {string} userId - The ID of the user
 * @param {Guild} guild - The guild to check in
 * @param {Object} antiNukeSettings - The anti-nuke settings
 * @returns {boolean} Whether the user is whitelisted
 */
function isWhitelisted(userId, guild, antiNukeSettings) {
    // Server owner is always whitelisted
    if (userId === guild.ownerId) return true;
    
    // Check user whitelist
    if (antiNukeSettings.whitelistedUsers.includes(userId)) return true;
    
    // Check role whitelist
    const member = guild.members.cache.get(userId);
    if (member) {
        for (const roleId of antiNukeSettings.whitelistedRoles) {
            if (member.roles.cache.has(roleId)) return true;
        }
    }
    
    return false;
}

/**
 * Takes action against a user who exceeded a threshold
 * @param {Client} client - The Discord client
 * @param {Guild} guild - The guild where the action occurred
 * @param {string} userId - The ID of the user to take action against
 * @param {string} actionType - The type of action that triggered this
 * @param {Object} antiNukeSettings - The anti-nuke settings
 * @param {number} actionCount - The number of actions performed
 */
async function takeAction(client, guild, userId, actionType, antiNukeSettings, actionCount) {
    try {
        const settings = antiNukeSettings.settings[actionType];
        const action = settings.action;
        
        // Get the user and member objects
        const user = await client.users.fetch(userId).catch(() => null);
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!user) return;
        
        let actionTaken = 'No action taken';
        
        switch (action) {
            case 'ban':
                if (member) {
                    await guild.members.ban(userId, { reason: `Anti-nuke protection: ${actionType}` }).catch(() => {});
                    actionTaken = 'User was banned';
                }
                break;
                
            case 'kick':
                if (member) {
                    await member.kick(`Anti-nuke protection: ${actionType}`).catch(() => {});
                    actionTaken = 'User was kicked';
                }
                break;
                
            case 'derank':
                if (member) {
                    // Remove all roles from the member
                    await member.roles.set([], `Anti-nuke protection: ${actionType}`).catch(() => {});
                    actionTaken = 'User was deranked (all roles removed)';
                }
                break;
        }
        
        // Log the action
        logAction(client, guild, userId, actionType, antiNukeSettings, actionTaken);
        
        // Add to action history
        const historyEntry = {
            userId,
            username: user ? user.tag : 'Unknown User',
            actionType,
            actionTaken,
            count: actionCount,
            timestamp: Date.now()
        };
        
        antiNukeSettings.actionHistory.push(historyEntry);
        
        // Limit history to 100 entries
        if (antiNukeSettings.actionHistory.length > 100) {
            antiNukeSettings.actionHistory = antiNukeSettings.actionHistory.slice(-100);
        }
        
        // Save the updated settings
        db.setAntiNuke(guild.id, antiNukeSettings);
        
    } catch (error) {
        console.error('Error taking anti-nuke action:', error);
    }
}

/**
 * Logs an anti-nuke action to the configured log channel
 * @param {Client} client - The Discord client
 * @param {Guild} guild - The guild where the action occurred
 * @param {string} userId - The ID of the user who triggered the action
 * @param {string} actionType - The type of action that was triggered
 * @param {Object} antiNukeSettings - The anti-nuke settings
 * @param {string} actionTaken - Description of the action taken
 */
function logAction(client, guild, userId, actionType, antiNukeSettings, actionTaken) {
    try {
        if (!antiNukeSettings.logChannel) return;
        
        const logChannel = guild.channels.cache.get(antiNukeSettings.logChannel);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('ЁЯЫбя╕П Anti-Nuke Protection Triggered')
            .setDescription(`Anti-nuke protection was triggered for **${formatProtectionName(actionType)}**.`)
            .addFields([
                { name: 'User', value: `<@${userId}> (${userId})`, inline: true },
                { name: 'Trigger', value: formatProtectionName(actionType), inline: true },
                { name: 'Action Taken', value: actionTaken || 'None' },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
            ])
            .setFooter({ text: 'Anti-Nuke Protection System' })
            .setTimestamp();
        
        logChannel.send({ embeds: [embed] }).catch(() => {});
        
    } catch (error) {
        console.error('Error logging anti-nuke action:', error);
    }
}

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

/**
 * Cleans up old action counts
 */
function cleanupActionCounts() {
    const now = Date.now();
    
    for (const [userId, actions] of actionCounts.entries()) {
        let hasActiveActions = false;
        
        for (const actionType in actions) {
            // Keep only actions within the last hour
            actions[actionType] = actions[actionType].filter(timestamp => now - timestamp < 3600000);
            
            if (actions[actionType].length > 0) {
                hasActiveActions = true;
            }
        }
        
        // Remove users with no recent actions
        if (!hasActiveActions) {
            actionCounts.delete(userId);
        }
    }
}

module.exports = {
    initAntiNuke
};