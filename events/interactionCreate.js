// Event handler for interactions (buttons, select menus, modals, etc.)
const { EmbedBuilder } = require('discord.odf');
const db = require('../utils/database');

module.exports = {
    name: 'interactionCreate',
    /**
     * Handles the interactionCreate event
     * 
     * @param {Client} client - The Discord client
     * @param {Interaction} interaction - The interaction that was created
     */
    async execute(client, interaction) {
        try {
            // Handle different types of interactions
            if (interaction.isButton()) {
                await handleButtonInteraction(client, interaction);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(client, interaction);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmitInteraction(client, interaction);
            } else if (interaction.isCommand()) {
                // In the future if we implement slash commands
                // await handleSlashCommandInteraction(client, interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            // Try to respond with an error message
            try {
                const content = {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('Error')
                            .setDescription('An error occurred while processing this interaction.')
                    ],
                    ephemeral: true
                };
                
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(content);
                } else {
                    await interaction.reply(content);
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    }
};

/**
 * Handles button interactions
 * 
 * @param {Client} client - The Discord client
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleButtonInteraction(client, interaction) {
    const { customId } = interaction;
    
    // Handle giveaway buttons
    if (customId === 'giveaway_enter') {
        await handleGiveawayEnter(client, interaction);
    } else if (customId === 'giveaway_info') {
        await handleGiveawayInfo(client, interaction);
    } 
    // Handle ticket buttons (to be implemented later)
    else if (customId === 'create_ticket') {
        await handleCreateTicket(client, interaction);
    } else if (customId.startsWith('ticket_')) {
        await handleTicketAction(client, interaction);
    }
}

/**
 * Handles select menu interactions
 * 
 * @param {Client} client - The Discord client
 * @param {SelectMenuInteraction} interaction - The select menu interaction
 */
async function handleSelectMenuInteraction(client, interaction) {
    const { customId } = interaction;
    
    // To be implemented if needed
}

/**
 * Handles modal submit interactions
 * 
 * @param {Client} client - The Discord client
 * @param {ModalSubmitInteraction} interaction - The modal submit interaction
 */
async function handleModalSubmitInteraction(client, interaction) {
    const { customId } = interaction;
    
    // To be implemented if needed
}

/**
 * Handles the giveaway enter button interaction
 * 
 * @param {Client} client - The Discord client
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleGiveawayEnter(client, interaction) {
    const { guild, user, message } = interaction;
    
    // Get the giveaway data for this server
    const giveawayData = db.getGiveaways(guild.id);
    
    // Find the giveaway that this message belongs to
    const giveaway = giveawayData.active.find(g => g.messageId === message.id);
    
    if (!giveaway) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Giveaway Not Found')
                    .setDescription('This giveaway no longer exists or has ended.')
            ],
            ephemeral: true
        });
    }
    
    // Check if the giveaway has already ended
    if (giveaway.ended) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Giveaway Ended')
                    .setDescription('This giveaway has already ended.')
            ],
            ephemeral: true
        });
    }
    
    // Check if the user has already entered
    if (giveaway.entries.includes(user.id)) {
        // Remove the user from the entries
        giveaway.entries = giveaway.entries.filter(id => id !== user.id);
        
        // Save the updated giveaway data
        db.setGiveaways(guild.id, giveawayData);
        
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF5555)
                    .setTitle('Entry Removed')
                    .setDescription(`You have been removed from the giveaway for **${giveaway.prize}**.`)
            ],
            ephemeral: true
        });
    }
    
    // Add the user to the entries
    giveaway.entries.push(user.id);
    
    // Save the updated giveaway data
    db.setGiveaways(guild.id, giveawayData);
    
    // Confirm to the user
    interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Entry Confirmed')
                .setDescription(`You have entered the giveaway for **${giveaway.prize}**!`)
                .addFields([
                    { name: 'Ends At', value: `<t:${Math.floor(giveaway.endTime / 1000)}:R>`, inline: true },
                    { name: 'Current Entries', value: `${giveaway.entries.length}`, inline: true },
                ])
        ],
        ephemeral: true
    });
}

/**
 * Handles the giveaway info button interaction
 * 
 * @param {Client} client - The Discord client
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleGiveawayInfo(client, interaction) {
    const { guild, user, message } = interaction;
    
    // Get the giveaway data for this server
    const giveawayData = db.getGiveaways(guild.id);
    
    // Find the giveaway that this message belongs to
    const giveaway = giveawayData.active.find(g => g.messageId === message.id);
    
    if (!giveaway) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Giveaway Not Found')
                    .setDescription('This giveaway no longer exists or has ended.')
            ],
            ephemeral: true
        });
    }
    
    // Check if user has entered
    const hasEntered = giveaway.entries.includes(user.id);
    
    // Show giveaway info
    interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(giveawayData.settings.embedColor)
                .setTitle('Giveaway Information')
                .setDescription(`Information about the giveaway for **${giveaway.prize}**:`)
                .addFields([
                    { name: 'Status', value: giveaway.ended ? 'Ended' : 'Active', inline: true },
                    { name: 'Ends At', value: `<t:${Math.floor(giveaway.endTime / 1000)}:R>`, inline: true },
                    { name: 'Hosted By', value: `<@${giveaway.hostedBy}>`, inline: true },
                    { name: 'Winners', value: `${giveaway.winners}`, inline: true },
                    { name: 'Entries', value: `${giveaway.entries.length}`, inline: true },
                    { name: 'Your Status', value: hasEntered ? 'Entered' : 'Not Entered', inline: true }
                ])
        ],
        ephemeral: true
    });
}

/**
 * Handles the create ticket button interaction
 * 
 * @param {Client} client - The Discord client
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleCreateTicket(client, interaction) {
    // To be implemented
}

/**
 * Handles ticket action buttons (close, delete, etc.)
 * 
 * @param {Client} client - The Discord client
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleTicketAction(client, interaction) {
    // To be implemented
}