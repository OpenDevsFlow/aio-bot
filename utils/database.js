// Database utility for managing persistent data storage
const fs = require('node:fs');
const path = require('node:path');

/**
 * Database class for managing JSON-based data storage
 */
class Database {
    /**
     * Initialize the database
     * @param {string} dataDir - Directory to store database files
     */
    constructor(dataDir = 'database') {
        this.dataDir = dataDir;
        
        // Define specific subdirectories for different types of data
        this.serverDir = path.join(dataDir, 'servers');
        this.userDir = path.join(dataDir, 'users');
        this.economyDir = path.join(dataDir, 'economy');
        this.configDir = path.join(dataDir, 'config');
        
        // Ensure all directories exist
        const directories = [
            this.dataDir, 
            this.serverDir, 
            this.userDir, 
            this.economyDir, 
            this.configDir
        ];
        
        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    
    /**
     * Ensures a directory exists
     * @param {string} dir - Directory path to check/create
     * @private
     */
    _ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    /**
     * Gets data from a specific database file, creating it if it doesn't exist
     * @param {string} filePath - Full path to the JSON file
     * @param {Object} defaultData - Default data to use if file doesn't exist
     * @returns {Object} The data from the database file
     * @private
     */
    _getData(filePath, defaultData = {}) {
        // Ensure the directory exists
        const dirName = path.dirname(filePath);
        this._ensureDir(dirName);
        
        // Create the file with default data if it doesn't exist
        if (!fs.existsSync(filePath)) {
            this._setData(filePath, defaultData);
            return defaultData;
        }
        
        // Read and parse the data
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading database file ${filePath}:`, error);
            return defaultData;
        }
    }
    
    /**
     * Saves data to a specific database file
     * @param {string} filePath - Full path to the JSON file
     * @param {Object} data - Data to save to the file
     * @returns {boolean} Whether the operation was successful
     * @private
     */
    _setData(filePath, data) {
        // Ensure the directory exists
        const dirName = path.dirname(filePath);
        this._ensureDir(dirName);
        
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing to database file ${filePath}:`, error);
            return false;
        }
    }
    
    /**
     * Gets data from a config file
     * @param {string} name - Name of the config file (without .json extension)
     * @param {Object} defaultData - Default data to use if file doesn't exist
     * @returns {Object} The data from the config file
     */
    getConfig(name, defaultData = {}) {
        const filePath = path.join(this.configDir, `${name}.json`);
        return this._getData(filePath, defaultData);
    }
    
    /**
     * Saves data to a config file
     * @param {string} name - Name of the config file (without .json extension)
     * @param {Object} data - Data to save to the file
     * @returns {boolean} Whether the operation was successful
     */
    setConfig(name, data) {
        const filePath = path.join(this.configDir, `${name}.json`);
        return this._setData(filePath, data);
    }
    
    /**
     * Gets server-specific data
     * @param {string} serverId - ID of the server
     * @param {string} dataType - Type of data to get (e.g., 'settings', 'automod', 'logging')
     * @param {Object} defaultData - Default data to use if server data doesn't exist
     * @returns {Object} The server's data
     */
    getServerData(serverId, dataType, defaultData = {}) {
        const serverDir = path.join(this.serverDir, serverId);
        const filePath = path.join(serverDir, `${dataType}.json`);
        return this._getData(filePath, defaultData);
    }
    
    /**
     * Saves server-specific data
     * @param {string} serverId - ID of the server
     * @param {string} dataType - Type of data to save (e.g., 'settings', 'automod', 'logging')
     * @param {Object} data - Data to save for the server
     * @returns {boolean} Whether the operation was successful
     */
    setServerData(serverId, dataType, data) {
        const serverDir = path.join(this.serverDir, serverId);
        const filePath = path.join(serverDir, `${dataType}.json`);
        return this._setData(filePath, data);
    }
    
    /**
     * Gets user-specific data
     * @param {string} userId - ID of the user
     * @param {string} dataType - Type of data to get (e.g., 'profile', 'settings')
     * @param {Object} defaultData - Default data to use if user data doesn't exist
     * @returns {Object} The user's data
     */
    getUserData(userId, dataType, defaultData = {}) {
        const userDir = path.join(this.userDir, userId);
        const filePath = path.join(userDir, `${dataType}.json`);
        return this._getData(filePath, defaultData);
    }
    
    /**
     * Saves user-specific data
     * @param {string} userId - ID of the user
     * @param {string} dataType - Type of data to save (e.g., 'profile', 'settings')
     * @param {Object} data - Data to save for the user
     * @returns {boolean} Whether the operation was successful
     */
    setUserData(userId, dataType, data) {
        const userDir = path.join(this.userDir, userId);
        const filePath = path.join(userDir, `${dataType}.json`);
        return this._setData(filePath, data);
    }
    
    /**
     * Gets economy data for a specific user
     * @param {string} userId - ID of the user
     * @param {Object} defaultData - Default data to use if economy data doesn't exist
     * @returns {Object} The user's economy data
     */
    getEconomy(userId, defaultData = { balance: 100, lastDaily: 0, lastWork: 0, inventory: [] }) {
        const filePath = path.join(this.economyDir, `${userId}.json`);
        return this._getData(filePath, defaultData);
    }
    
    /**
     * Saves economy data for a specific user
     * @param {string} userId - ID of the user
     * @param {Object} data - Economy data to save for the user
     * @returns {boolean} Whether the operation was successful
     */
    setEconomy(userId, data) {
        const filePath = path.join(this.economyDir, `${userId}.json`);
        return this._setData(filePath, data);
    }
    
    /**
     * Gets auto-moderation settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's auto-moderation settings
     */
    getAutomod(serverId) {
        const defaultAutomod = {
            enabled: false,
            filteredWords: [],
            maxMentions: 5,
            action: 'delete', // delete, warn, mute, kick
            logChannel: null
        };
        
        return this.getServerData(serverId, 'automod', defaultAutomod);
    }
    
    /**
     * Saves auto-moderation settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} automodSettings - Auto-moderation settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setAutomod(serverId, automodSettings) {
        return this.setServerData(serverId, 'automod', automodSettings);
    }
    
    /**
     * Gets logging settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's logging settings
     */
    getLogging(serverId) {
        const defaultLogging = {
            enabled: false,
            logChannel: null,
            events: {
                memberJoin: true,
                memberLeave: true,
                messageDelete: true,
                messageEdit: true,
                modActions: true
            }
        };
        
        return this.getServerData(serverId, 'logging', defaultLogging);
    }
    
    /**
     * Saves logging settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} loggingSettings - Logging settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setLogging(serverId, loggingSettings) {
        return this.setServerData(serverId, 'logging', loggingSettings);
    }
    
    /**
     * Gets autoresponder settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's autoresponder settings
     */
    getAutoresponder(serverId) {
        const defaultAutoresponder = {
            enabled: false,
            responses: [],  // Array of {trigger: string, response: string, exactMatch: boolean}
        };
        
        return this.getServerData(serverId, 'autoresponder', defaultAutoresponder);
    }
    
    /**
     * Saves autoresponder settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} autoresponderSettings - Autoresponder settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setAutoresponder(serverId, autoresponderSettings) {
        return this.setServerData(serverId, 'autoresponder', autoresponderSettings);
    }
    
    /**
     * Gets autoreact settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's autoreact settings
     */
    getAutoreact(serverId) {
        const defaultAutoreact = {
            enabled: false,
            reactions: [],  // Array of {trigger: string, emojis: string[], exactMatch: boolean}
        };
        
        return this.getServerData(serverId, 'autoreact', defaultAutoreact);
    }
    
    /**
     * Saves autoreact settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} autoreactSettings - Autoreact settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setAutoreact(serverId, autoreactSettings) {
        return this.setServerData(serverId, 'autoreact', autoreactSettings);
    }
    
    /**
     * Gets autorole settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's autorole settings
     */
    getAutorole(serverId) {
        const defaultAutorole = {
            enabled: false,
            roles: [],  // Array of role IDs to assign to new members
        };
        
        return this.getServerData(serverId, 'autorole', defaultAutorole);
    }
    
    /**
     * Saves autorole settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} autoroleSettings - Autorole settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setAutorole(serverId, autoroleSettings) {
        return this.setServerData(serverId, 'autorole', autoroleSettings);
    }
    
    /**
     * Gets welcome settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's welcome settings
     */
    getWelcome(serverId) {
        const defaultWelcome = {
            enabled: false,
            channel: null,
            message: "Welcome to the server, {user}!",
            dmMessage: "",
            embedEnabled: false,
            embedColor: "#5865F2", // Discord blue
            embedThumbnail: true,
        };
        
        return this.getServerData(serverId, 'welcome', defaultWelcome);
    }
    
    /**
     * Saves welcome settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} welcomeSettings - Welcome settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setWelcome(serverId, welcomeSettings) {
        return this.setServerData(serverId, 'welcome', welcomeSettings);
    }
    
    /**
     * Gets global chat settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's global chat settings
     */
    getGlobalChat(serverId) {
        const defaultGlobalChat = {
            enabled: false,
            channel: null,
            filteredWords: [], // Words to filter from global chat
            blockImages: false, // Whether to block images in global chat
            blockLinks: true, // Whether to block links in global chat
            cooldown: 5, // Cooldown in seconds between messages
        };
        
        return this.getServerData(serverId, 'globalchat', defaultGlobalChat);
    }
    
    /**
     * Saves global chat settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} globalChatSettings - Global chat settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setGlobalChat(serverId, globalChatSettings) {
        return this.setServerData(serverId, 'globalchat', globalChatSettings);
    }
    
    /**
     * Gets the global network connections
     * @returns {Object} All servers connected to the global chat
     */
    getGlobalNetwork() {
        const defaultNetwork = {
            servers: {}, // Map of serverId -> channelId for all connected servers
            blockedServers: [], // Servers blocked from the network
            blockedUsers: [], // Users blocked from using global chat
            messageCount: 0, // Total messages sent through the network
        };
        
        return this.getConfig('globalnetwork', defaultNetwork);
    }
    
    /**
     * Saves the global network connections
     * @param {Object} networkData - The network data to save
     * @returns {boolean} Whether the operation was successful
     */
    setGlobalNetwork(networkData) {
        return this.setConfig('globalnetwork', networkData);
    }
    
    /**
     * Gets giveaway data for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's giveaway data
     */
    getGiveaways(serverId) {
        const defaultGiveaways = {
            active: [], // Array of active giveaways
            completed: [], // Array of completed giveaways
            settings: {
                defaultDuration: 86400000, // 24 hours in milliseconds
                defaultWinners: 1,
                embedColor: "#FF5555", // Pinkish-red
                allowMultipleWinners: true,
                requirementRoles: [], // Roles required to enter giveaways
                managerRoles: [], // Roles that can manage giveaways
            }
        };
        
        return this.getServerData(serverId, 'giveaways', defaultGiveaways);
    }
    
    /**
     * Saves giveaway data for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} giveawayData - Giveaway data to save
     * @returns {boolean} Whether the operation was successful
     */
    setGiveaways(serverId, giveawayData) {
        return this.setServerData(serverId, 'giveaways', giveawayData);
    }
    
    /**
     * Gets anti-nuke settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's anti-nuke settings
     */
    getAntiNuke(serverId) {
        const defaultAntiNuke = {
            enabled: false,
            logChannel: null,
            whitelistedUsers: [], // Users immune to anti-nuke
            whitelistedRoles: [], // Roles immune to anti-nuke
            settings: {
                maxBans: { enabled: true, threshold: 3, time: 10000, action: 'ban' }, // 10 seconds
                maxKicks: { enabled: true, threshold: 3, time: 10000, action: 'ban' }, // 10 seconds
                maxRoleDeletes: { enabled: true, threshold: 2, time: 10000, action: 'ban' }, // 10 seconds
                maxChannelDeletes: { enabled: true, threshold: 2, time: 10000, action: 'ban' }, // 10 seconds
                webhookCreate: { enabled: true, action: 'delete' },
                botAdd: { enabled: true, action: 'kick' },
            },
            actionHistory: [] // Records of past anti-nuke actions
        };
        
        return this.getServerData(serverId, 'antinuke', defaultAntiNuke);
    }
    
    /**
     * Saves anti-nuke settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} antiNukeSettings - Anti-nuke settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setAntiNuke(serverId, antiNukeSettings) {
        return this.setServerData(serverId, 'antinuke', antiNukeSettings);
    }
    
    /**
     * Gets ticket system settings for a specific server
     * @param {string} serverId - ID of the server
     * @returns {Object} The server's ticket system settings
     */
    getTicketSystem(serverId) {
        const defaultTicketSystem = {
            enabled: false,
            category: null, // Category ID where tickets will be created
            logChannel: null, // Channel for ticket logs
            supportRoles: [], // Roles that have access to tickets
            welcomeMessage: "Thanks for creating a ticket! Support will be with you shortly.",
            buttonColor: "PRIMARY", // Button style (PRIMARY, SECONDARY, SUCCESS, DANGER)
            buttonLabel: "Create Ticket",
            useEmbed: true,
            embedColor: "#3498DB", // Blue
            ticketCounter: 0, // Number of tickets created
            activeTickets: [], // Currently open tickets
            closedTickets: [], // Archive of closed tickets
            settings: {
                maxTicketsPerUser: 1,
                closeOnTimeout: true,
                timeoutMinutes: 1440, // 24 hours
                autoArchive: true,
                forceUsernameTopic: true
            }
        };
        
        return this.getServerData(serverId, 'tickets', defaultTicketSystem);
    }
    
    /**
     * Saves ticket system settings for a specific server
     * @param {string} serverId - ID of the server
     * @param {Object} ticketSettings - Ticket system settings to save
     * @returns {boolean} Whether the operation was successful
     */
    setTicketSystem(serverId, ticketSettings) {
        return this.setServerData(serverId, 'tickets', ticketSettings);
    }
}

// Export a singleton instance
module.exports = new Database();