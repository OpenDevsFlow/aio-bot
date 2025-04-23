// Hangman game command
const { infoEmbed, successEmbed, errorEmbed, warningEmbed } = require('../../utils/embedBuilder');
const { Collection } = require('discord.js');

// Store active hangman games
const activeGames = new Collection();

module.exports = {
    name: 'hangman',
    description: 'Play a game of hangman',
    usage: 'hangman [start|guess <letter>|stop]',
    cooldown: 5,
    /**
     * Executes the hangman command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        const subCommand = args[0]?.toLowerCase();
        
        // If no subcommand, show usage
        if (!subCommand) {
            return message.reply({
                embeds: [
                    infoEmbed(
                        'Hangman Game',
                        'Play the classic hangman word-guessing game!',
                        [
                            { name: 'Start a Game', value: `${client.config.prefix}hangman start` },
                            { name: 'Guess a Letter', value: `${client.config.prefix}hangman guess <letter>` },
                            { name: 'Stop a Game', value: `${client.config.prefix}hangman stop` }
                        ]
                    )
                ]
            });
        }
        
        switch (subCommand) {
            case 'start':
                startGame(client, message);
                break;
                
            case 'guess':
                if (!args[1]) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Usage',
                                `Please provide a letter to guess.`,
                                [{ name: 'Usage', value: `${client.config.prefix}hangman guess <letter>` }]
                            )
                        ]
                    });
                }
                
                const letter = args[1].toLowerCase();
                
                // Validate the guess is a single letter
                if (letter.length !== 1 || !/[a-z]/i.test(letter)) {
                    return message.reply({
                        embeds: [
                            errorEmbed(
                                'Invalid Guess',
                                `Please guess a single letter (A-Z).`
                            )
                        ]
                    });
                }
                
                makeGuess(client, message, letter);
                break;
                
            case 'stop':
                stopGame(client, message);
                break;
                
            default:
                message.reply({
                    embeds: [
                        errorEmbed(
                            'Invalid Subcommand',
                            `That's not a valid hangman command.`,
                            [{ name: 'Usage', value: `${client.config.prefix}${this.usage}` }]
                        )
                    ]
                });
        }
    }
};

/**
 * Starts a new hangman game
 * @param {Client} client - The Discord client
 * @param {Message} message - The message that triggered the command
 */
function startGame(client, message) {
    // Check if there's already a game in this channel
    if (activeGames.has(message.channel.id)) {
        return message.reply({
            embeds: [
                errorEmbed(
                    'Game Already in Progress',
                    `There's already a hangman game in progress in this channel. Use \`${client.config.prefix}hangman stop\` to end it.`
                )
            ]
        });
    }
    
    // Get a random word
    const wordData = getRandomWord();
    const word = wordData.word.toLowerCase();
    const category = wordData.category;
    
    // Create the game state
    const gameState = {
        word: word,
        category: category,
        guessedLetters: [],
        incorrectGuesses: 0,
        maxIncorrectGuesses: 6,
        startedBy: message.author.id,
        startTime: Date.now()
    };
    
    // Save the game state
    activeGames.set(message.channel.id, gameState);
    
    // Show the initial game state
    showGameState(client, message, gameState);
}

/**
 * Makes a guess in the hangman game
 * @param {Client} client - The Discord client
 * @param {Message} message - The message that triggered the command
 * @param {string} letter - The letter being guessed
 */
function makeGuess(client, message, letter) {
    // Check if there's a game in this channel
    const gameState = activeGames.get(message.channel.id);
    
    if (!gameState) {
        return message.reply({
            embeds: [
                errorEmbed(
                    'No Game in Progress',
                    `There's no hangman game in progress in this channel. Use \`${client.config.prefix}hangman start\` to start one.`
                )
            ]
        });
    }
    
    // Check if the letter has already been guessed
    if (gameState.guessedLetters.includes(letter)) {
        return message.reply({
            embeds: [
                warningEmbed(
                    'Already Guessed',
                    `The letter "${letter.toUpperCase()}" has already been guessed!`
                )
            ]
        });
    }
    
    // Add the letter to guessed letters
    gameState.guessedLetters.push(letter);
    
    // Check if the letter is in the word
    if (gameState.word.includes(letter)) {
        // Correct guess - check if the word is complete
        const isComplete = isWordComplete(gameState);
        
        if (isComplete) {
            // Player won
            message.reply({
                embeds: [
                    successEmbed(
                        'You Win!',
                        `Congratulations! You've correctly guessed the word: **${gameState.word.toUpperCase()}**`,
                        [
                            { name: 'Category', value: gameState.category },
                            { name: 'Incorrect Guesses', value: `${gameState.incorrectGuesses}/${gameState.maxIncorrectGuesses}` }
                        ]
                    )
                ]
            });
            
            // Remove the game
            activeGames.delete(message.channel.id);
        } else {
            // Show updated game state
            message.reply({
                embeds: [
                    successEmbed(
                        'Correct Guess!',
                        `The letter "${letter.toUpperCase()}" is in the word!`
                    )
                ]
            });
            
            showGameState(client, message, gameState);
        }
    } else {
        // Incorrect guess
        gameState.incorrectGuesses++;
        
        // Check if the player lost
        if (gameState.incorrectGuesses >= gameState.maxIncorrectGuesses) {
            // Player lost
            message.reply({
                embeds: [
                    errorEmbed(
                        'Game Over',
                        `Sorry, you've run out of guesses! The word was: **${gameState.word.toUpperCase()}**`,
                        [{ name: 'Category', value: gameState.category }]
                    )
                ]
            });
            
            // Remove the game
            activeGames.delete(message.channel.id);
        } else {
            // Show updated game state
            message.reply({
                embeds: [
                    warningEmbed(
                        'Incorrect Guess!',
                        `The letter "${letter.toUpperCase()}" is not in the word!`
                    )
                ]
            });
            
            showGameState(client, message, gameState);
        }
    }
}

/**
 * Stops the current hangman game
 * @param {Client} client - The Discord client
 * @param {Message} message - The message that triggered the command
 */
function stopGame(client, message) {
    // Check if there's a game in this channel
    const gameState = activeGames.get(message.channel.id);
    
    if (!gameState) {
        return message.reply({
            embeds: [
                errorEmbed(
                    'No Game in Progress',
                    `There's no hangman game in progress in this channel.`
                )
            ]
        });
    }
    
    // Check if the user is the one who started the game or has manage messages permission
    if (gameState.startedBy !== message.author.id && !message.member.permissions.has('ManageMessages')) {
        return message.reply({
            embeds: [
                errorEmbed(
                    'Permission Denied',
                    `Only the person who started the game or a moderator can stop it.`
                )
            ]
        });
    }
    
    // End the game
    message.reply({
        embeds: [
            infoEmbed(
                'Game Stopped',
                `The hangman game has been stopped. The word was: **${gameState.word.toUpperCase()}**`,
                [{ name: 'Category', value: gameState.category }]
            )
        ]
    });
    
    // Remove the game
    activeGames.delete(message.channel.id);
}

/**
 * Shows the current game state
 * @param {Client} client - The Discord client
 * @param {Message} message - The message that triggered the command
 * @param {Object} gameState - The current game state
 */
function showGameState(client, message, gameState) {
    // Create the word display (with guessed letters revealed and unguessed letters as underscores)
    const wordDisplay = gameState.word.split('').map(letter => {
        return gameState.guessedLetters.includes(letter) ? letter.toUpperCase() : '_';
    }).join(' ');
    
    // Create the hangman ASCII art
    const hangmanArt = [
        '```',
        '  +---+',
        '  |   |',
        `  ${gameState.incorrectGuesses >= 1 ? 'O' : ' '}   |`,
        `  ${gameState.incorrectGuesses >= 3 ? '/' : ' '}${gameState.incorrectGuesses >= 2 ? '|' : ' '}${gameState.incorrectGuesses >= 4 ? '\\' : ' '}  |`,
        `  ${gameState.incorrectGuesses >= 5 ? '/' : ' '} ${gameState.incorrectGuesses >= 6 ? '\\' : ' '}  |`,
        '      |',
        '=========',
        '```'
    ].join('\n');
    
    // Create a list of guessed letters
    const guessedLettersDisplay = gameState.guessedLetters.length > 0 
        ? gameState.guessedLetters.map(l => l.toUpperCase()).join(', ')
        : 'None';
    
    // Send the game state
    message.channel.send({
        embeds: [
            infoEmbed(
                'Hangman Game',
                `Category: **${gameState.category}**\n\n${hangmanArt}\n\n**${wordDisplay}**`,
                [
                    { name: 'Guessed Letters', value: guessedLettersDisplay },
                    { name: 'Incorrect Guesses', value: `${gameState.incorrectGuesses}/${gameState.maxIncorrectGuesses}` },
                    { name: 'How to Play', value: `Use \`${client.config.prefix}hangman guess <letter>\` to guess a letter.` }
                ]
            )
        ]
    });
}

/**
 * Checks if the word has been completely guessed
 * @param {Object} gameState - The current game state
 * @returns {boolean} Whether the word is complete
 */
function isWordComplete(gameState) {
    return gameState.word.split('').every(letter => gameState.guessedLetters.includes(letter));
}

/**
 * Gets a random word for the hangman game
 * @returns {Object} An object containing the word and its category
 */
function getRandomWord() {
    const words = [
        { word: "JAVASCRIPT", category: "Programming Languages" },
        { word: "PYTHON", category: "Programming Languages" },
        { word: "DISCORD", category: "Applications" },
        { word: "SERVER", category: "Computing" },
        { word: "KEYBOARD", category: "Computer Hardware" },
        { word: "ALGORITHM", category: "Computing" },
        { word: "DATABASE", category: "Computing" },
        { word: "INTERNET", category: "Technology" },
        { word: "MODERATOR", category: "Discord Roles" },
        { word: "CHANNEL", category: "Discord Features" },
        { word: "EMOJI", category: "Communication" },
        { word: "GAMING", category: "Hobbies" },
        { word: "STREAMING", category: "Entertainment" },
        { word: "MUSIC", category: "Entertainment" },
        { word: "PIZZA", category: "Food" },
        { word: "COFFEE", category: "Beverages" },
        { word: "MOUNTAIN", category: "Nature" },
        { word: "GALAXY", category: "Astronomy" },
        { word: "ROBOT", category: "Technology" },
        { word: "PENGUIN", category: "Animals" }
    ];
    
    return words[Math.floor(Math.random() * words.length)];
}