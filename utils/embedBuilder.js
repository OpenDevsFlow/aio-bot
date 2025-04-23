// Utility for creating consistent Discord embeds
const { EmbedBuilder } = require('discord.odf');
const config = require('../config');

/**
 * Creates a standardized embed with the given parameters
 * 
 * @param {Object} options - Options for the embed
 * @param {string} options.title - Title of the embed
 * @param {string} options.description - Description of the embed
 * @param {string} options.color - Color of the embed
 * @param {Object[]} options.fields - Fields to add to the embed
 * @param {Object} options.footer - Footer object with text and icon_url
 * @param {string} options.thumbnail - URL for the thumbnail
 * @param {string} options.image - URL for the main image
 * @param {string} options.url - URL for the title
 * @param {string} options.author - Author object with name, icon_url, and url
 * @returns {EmbedBuilder} The created embed
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder();
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.color) {
        embed.setColor(config.colors[options.color] || options.color);
    } else {
        embed.setColor(config.colors.primary);
    }
    if (options.fields) embed.addFields(options.fields);
    if (options.footer) {
        embed.setFooter(options.footer);
    } else {
        embed.setFooter({
            name: "Made by OpenDevsFlow.",
            iconURL: client.user.displayAvatarURL({ dynamic: true })
        });
    }
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.url) embed.setURL(options.url);
    if (options.author) embed.setAuthor(options.author);
    
    embed.setTimestamp();
    
    return embed;
}

/**
 * Creates a success embed
 * 
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the embed
 * @param {Object[]} fields - Fields to add to the embed
 * @returns {EmbedBuilder} The created embed
 */
function successEmbed(title, description, fields = []) {
    return createEmbed({
        title,
        description,
        color: 'success',
        fields
    });
}

/**
 * Creates an error embed
 * 
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the embed
 * @param {Object[]} fields - Fields to add to the embed
 * @returns {EmbedBuilder} The created embed
 */
function errorEmbed(title, description, fields = []) {
    return createEmbed({
        title,
        description,
        color: 'danger',
        fields
    });
}

/**
 * Creates an info embed
 * 
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the embed
 * @param {Object[]} fields - Fields to add to the embed
 * @returns {EmbedBuilder} The created embed
 */
function infoEmbed(title, description, fields = []) {
    return createEmbed({
        title,
        description,
        color: 'info',
        fields
    });
}

/**
 * Creates a warning embed
 * 
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the embed
 * @param {Object[]} fields - Fields to add to the embed
 * @returns {EmbedBuilder} The created embed
 */
function warningEmbed(title, description, fields = []) {
    return createEmbed({
        title,
        description,
        color: 'warning',
        fields
    });
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    infoEmbed,
    warningEmbed
};
