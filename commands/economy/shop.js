// Shop command to view and purchase items
const { infoEmbed, errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const db = require('../../utils/database');

module.exports = {
    name: 'shop',
    description: 'View the shop or purchase items',
    usage: 'shop [buy <item>]',
    cooldown: 5,
    /**
     * Executes the shop command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        const subCommand = args[0]?.toLowerCase();
        
        // Define shop items
        const shopItems = [
            {
                id: 'vip',
                name: 'VIP Status',
                description: 'Special VIP status with a custom role color',
                price: 5000,
                role: true
            },
            {
                id: 'cookie',
                name: 'Cookie',
                description: 'A delicious digital cookie',
                price: 50,
                consumable: true
            },
            {
                id: 'coffee',
                name: 'Coffee',
                description: 'A hot cup of digital coffee',
                price: 75,
                consumable: true
            },
            {
                id: 'pizza',
                name: 'Pizza',
                description: 'A tasty digital pizza',
                price: 150,
                consumable: true
            },
            {
                id: 'ticket',
                name: 'Lottery Ticket',
                description: 'A ticket for a chance to win big',
                price: 250,
                consumable: true
            },
            {
                id: 'badge',
                name: 'Collector\'s Badge',
                description: 'A special collector\'s badge for your profile',
                price: 1000,
                badge: true
            }
        ];
        
        // Buy subcommand
        if (subCommand === 'buy') {
            const itemId = args[1]?.toLowerCase();
            
            // Check if an item ID was provided
            if (!itemId) {
                return message.reply({
                    embeds: [
                        errorEmbed(
                            'Missing Item',
                            `Please specify an item to buy.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
            }
            
            // Find the item in the shop
            const item = shopItems.find(item => item.id === itemId);
            
            // Check if the item exists
            if (!item) {
                return message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Item',
                            `That item doesn't exist in the shop.`,
                            [{ name: 'Tip', value: `Use \`${client.config.prefix}shop\` to see available items.` }]
                        )
                    ]
                });
            }
            
            // Get the user's balance data using the database utility
            const userData = db.getEconomy(message.author.id);
            
            // Check if the user has enough currency
            if (userData.balance < item.price) {
                return message.reply({
                    embeds: [
                        errorEmbed(
                            'Insufficient Funds',
                            `You don't have enough ${client.config.economy?.currencyName || 'coins'} to buy this item.`,
                            [
                                { name: 'Item Price', value: `${item.price} ${client.config.economy?.currencyName || 'coins'}` },
                                { name: 'Your Balance', value: `${userData.balance} ${client.config.economy?.currencyName || 'coins'}` }
                            ]
                        )
                    ]
                });
            }
            
            // Process the purchase
            userData.balance -= item.price;
            
            // Add the item to the user's inventory if they don't already have it
            if (!userData.inventory) {
                userData.inventory = [];
            }
            
            // For role items, try to give them the role
            if (item.role) {
                const roleName = `VIP - ${message.author.id}`;
                let role = message.guild.roles.cache.find(r => r.name === roleName);
                
                if (!role) {
                    // Try to create the role if it doesn't exist
                    try {
                        role = message.guild.roles.create({
                            name: roleName,
                            color: '#FFD700', // Gold color
                            reason: 'VIP purchase from shop'
                        });
                        
                        // Wait for role creation
                        setTimeout(() => {
                            const createdRole = message.guild.roles.cache.find(r => r.name === roleName);
                            if (createdRole) {
                                message.member.roles.add(createdRole).catch(error => {
                                    console.error('Error adding VIP role:', error);
                                });
                            }
                        }, 1000);
                    } catch (error) {
                        console.error('Error creating VIP role:', error);
                    }
                } else {
                    // Add the role to the member
                    message.member.roles.add(role).catch(error => {
                        console.error('Error adding VIP role:', error);
                    });
                }
            }
            
            // Add the item to inventory
            userData.inventory.push({
                id: item.id,
                name: item.name,
                obtained: Date.now()
            });
            
            // Save the updated economy data using the database utility
            db.setEconomy(message.author.id, userData);
            
            // Send success message
            message.reply({
                embeds: [
                    successEmbed(
                        'Purchase Successful',
                        `You've purchased **${item.name}** for ${item.price} ${client.config.economy?.currencyName || 'coins'}.`,
                        [
                            { name: 'New Balance', value: `${userData.balance} ${client.config.economy?.currencyName || 'coins'}` },
                            { name: 'Item', value: item.description }
                        ]
                    )
                ]
            });
            
            return;
        }
        
        // Default shop display (no subcommand or invalid subcommand)
        const shopEmbed = infoEmbed(
            'Shop',
            `Welcome to the shop! Use \`${client.config.prefix}shop buy <item>\` to purchase items.`,
            []
        );
        
        // Add each item as a field
        shopItems.forEach(item => {
            shopEmbed.addFields([{
                name: `${item.name} (${item.price} ${client.config.economy?.currencyName || 'coins'})`,
                value: `ID: \`${item.id}\`\n${item.description}`
            }]);
        });
        
        // Send the shop embed
        message.reply({ embeds: [shopEmbed] });
    }
};