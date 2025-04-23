// Trivia game command
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { Collection } = require('discord.js');

// Store active trivia games
const activeGames = new Collection();

module.exports = {
    name: 'trivia',
    description: 'Play a trivia game with random questions',
    usage: 'trivia',
    cooldown: 10,
    /**
     * Executes the trivia command
     * 
     * @param {Client} client - The Discord client
     * @param {Message} message - The message that triggered the command
     * @param {Array} args - Command arguments
     */
    execute(client, message, args) {
        // Check if there's already a game in this channel
        if (activeGames.has(message.channel.id)) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Game In Progress',
                        `There's already a trivia game in progress in this channel. Answer the current question first!`
                    )
                ]
            });
        }
        
        // Get a random question
        const randomQuestion = getRandomQuestion();
        
        // Send the question
        message.reply({
            embeds: [
                infoEmbed(
                    'Trivia Question',
                    randomQuestion.question,
                    [
                        { name: 'Category', value: randomQuestion.category, inline: true },
                        { name: 'Difficulty', value: randomQuestion.difficulty, inline: true },
                        { name: 'Time Limit', value: '30 seconds', inline: true }
                    ]
                )
            ]
        });
        
        // Store the game info
        activeGames.set(message.channel.id, {
            question: randomQuestion,
            startTime: Date.now(),
            participants: new Set()
        });
        
        // Create a filter for correct answers
        const filter = m => {
            // Don't respond to bots
            if (m.author.bot) return false;
            
            // Check if the answer is correct (case insensitive)
            const isCorrect = m.content.toLowerCase() === randomQuestion.answer.toLowerCase();
            
            // Add participant to the participants set if they haven't answered yet
            if (isCorrect) {
                const gameInfo = activeGames.get(message.channel.id);
                gameInfo.participants.add(m.author.id);
            }
            
            return isCorrect;
        };
        
        // Start the collector
        const collector = message.channel.createMessageCollector({ filter, time: 30000 }); // 30 seconds
        
        // When a correct answer is received
        collector.on('collect', m => {
            collector.stop();
            
            message.channel.send({
                embeds: [
                    successEmbed(
                        'Correct Answer!',
                        `**${m.author.tag}** got the correct answer: **${randomQuestion.answer}**`,
                        [{ name: 'Explanation', value: randomQuestion.explanation || 'No additional explanation available.' }]
                    )
                ]
            });
            
            // Remove the game from active games
            activeGames.delete(message.channel.id);
        });
        
        // When the collector ends (time limit reached or correct answer)
        collector.on('end', collected => {
            // If no correct answers were collected and the game is still active
            if (collected.size === 0 && activeGames.has(message.channel.id)) {
                message.channel.send({
                    embeds: [
                        errorEmbed(
                            'Time\'s Up!',
                            `Nobody got the correct answer!`,
                            [
                                { name: 'The Answer Was', value: randomQuestion.answer },
                                { name: 'Explanation', value: randomQuestion.explanation || 'No additional explanation available.' }
                            ]
                        )
                    ]
                });
                
                // Remove the game from active games
                activeGames.delete(message.channel.id);
            }
        });
    }
};

/**
 * Gets a random trivia question
 * @returns {Object} A question object with question, answer, category, difficulty and explanation properties
 */
function getRandomQuestion() {
    // Array of trivia questions
    const questions = [
        {
            question: "What is the capital of France?",
            answer: "Paris",
            category: "Geography",
            difficulty: "Easy",
            explanation: "Paris is the capital and most populous city of France."
        },
        {
            question: "Who painted the Mona Lisa?",
            answer: "Leonardo da Vinci",
            category: "Art",
            difficulty: "Easy",
            explanation: "The Mona Lisa is a half-length portrait painting by Italian artist Leonardo da Vinci."
        },
        {
            question: "What is the largest planet in our solar system?",
            answer: "Jupiter",
            category: "Astronomy",
            difficulty: "Easy",
            explanation: "Jupiter is the fifth planet from the Sun and the largest in the Solar System."
        },
        {
            question: "What is the chemical symbol for gold?",
            answer: "Au",
            category: "Chemistry",
            difficulty: "Medium",
            explanation: "The symbol Au comes from the Latin word for gold, 'aurum'."
        },
        {
            question: "Who wrote 'Romeo and Juliet'?",
            answer: "William Shakespeare",
            category: "Literature",
            difficulty: "Easy",
            explanation: "Romeo and Juliet is a tragedy written by William Shakespeare early in his career."
        },
        {
            question: "What year did World War II end?",
            answer: "1945",
            category: "History",
            difficulty: "Medium",
            explanation: "World War II ended with the surrender of Japan in September 1945."
        },
        {
            question: "What is the hardest natural substance on Earth?",
            answer: "Diamond",
            category: "Science",
            difficulty: "Easy",
            explanation: "Diamond is the hardest known natural material on Earth, with a Mohs hardness of 10."
        },
        {
            question: "Who developed the theory of relativity?",
            answer: "Albert Einstein",
            category: "Physics",
            difficulty: "Medium",
            explanation: "Albert Einstein published the theory of relativity in the early 20th century."
        },
        {
            question: "What is the largest ocean on Earth?",
            answer: "Pacific Ocean",
            category: "Geography",
            difficulty: "Easy",
            explanation: "The Pacific Ocean is the largest and deepest ocean on Earth, covering more than 30% of the Earth's surface."
        },
        {
            question: "Which planet is known as the Red Planet?",
            answer: "Mars",
            category: "Astronomy",
            difficulty: "Easy",
            explanation: "Mars appears reddish because of iron oxide (rust) on its surface."
        },
        {
            question: "Who painted 'Starry Night'?",
            answer: "Vincent van Gogh",
            category: "Art",
            difficulty: "Medium",
            explanation: "The Starry Night is an oil on canvas painting by Dutch Post-Impressionist painter Vincent van Gogh."
        },
        {
            question: "What is the smallest prime number?",
            answer: "2",
            category: "Mathematics",
            difficulty: "Easy",
            explanation: "2 is the smallest prime number and the only even prime number."
        },
        {
            question: "Who wrote 'The Great Gatsby'?",
            answer: "F. Scott Fitzgerald",
            category: "Literature",
            difficulty: "Medium",
            explanation: "The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald."
        },
        {
            question: "What is the chemical symbol for water?",
            answer: "H2O",
            category: "Chemistry",
            difficulty: "Easy",
            explanation: "Water consists of two hydrogen atoms and one oxygen atom."
        },
        {
            question: "Who is known as the 'Father of Computer Science'?",
            answer: "Alan Turing",
            category: "Technology",
            difficulty: "Medium",
            explanation: "Alan Turing was a British mathematician and logician who made major contributions to computing, cryptanalysis, and artificial intelligence."
        }
    ];
    
    // Return a random question
    return questions[Math.floor(Math.random() * questions.length)];
}