const fs = require('fs');
const config = require('../settings');
const { lite, commands } = require('../lite');
const axios = require('axios');

// Store user menu sessions for number replies
const menuSessions = new Map();

lite({
    pattern: "menu3",
    react: "💫",
    alias: ["allmenu", "help", "commands"],
    desc: "Get interactive command list with number selection",
    category: "main",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, pushname, reply
}) => {
    try {
        // Organize commands by category with enhanced info
        let categories = {
            download: { name: '📥 Downloader Commands', icon: '📥', commands: [] },
            group: { name: '🛠️ Admin Commands', icon: '🛠️', commands: [] },
            main: { name: '🏠 Main Commands', icon: '🏠', commands: [] },
            owner: { name: '🧑‍💻 Owner Commands', icon: '🧑‍💻', commands: [] },
            ai: { name: '🧠 AI Commands', icon: '🧠', commands: [] },
            anime: { name: '✨ Anime/Logo Commands', icon: '✨', commands: [] },
            convert: { name: '🔄 Convert Commands', icon: '🔄', commands: [] },
            reaction: { name: '🎭 Reaction Commands', icon: '🎭', commands: [] },
            fun: { name: '🎉 Fun Commands', icon: '🎉', commands: [] },
            other: { name: '📂 Other Commands', icon: '📂', commands: [] }
        };

        // Collect and organize commands
        let totalCommands = 0;
        for (let cmd of commands) {
            if (cmd.pattern && !cmd.dontAddCommandList) {
                let category = cmd.category || 'other';
                if (categories[category]) {
                    categories[category].commands.push({
                        pattern: cmd.pattern,
                        desc: cmd.desc || 'No description',
                        usage: cmd.use || `.${cmd.pattern}`,
                        aliases: cmd.alias || []
                    });
                    totalCommands++;
                }
            }
        }

        // Create main menu with category selection
        let categoryList = '';
        let categoryIndex = 1;
        let sessionData = { categories: [], timestamp: Date.now() };

        for (let [key, category] of Object.entries(categories)) {
            if (category.commands.length > 0) {
                categoryList += `│ ${categoryIndex}. ${category.icon} ${category.name.replace(/^[🎭🎉🧠🛠️📥🏠🧑‍💻✨🔄📂]\s+/, '')} (${category.commands.length})\n`;
                sessionData.categories.push({ key, category, index: categoryIndex });
                categoryIndex++;
            }
        }

        // Store session for number replies
        menuSessions.set(from, sessionData);

        // Auto-cleanup old sessions (older than 5 minutes)
        setTimeout(() => {
            if (menuSessions.has(from)) {
                const session = menuSessions.get(from);
                if (Date.now() - session.timestamp > 300000) {
                    menuSessions.delete(from);
                }
            }
        }, 300000);

        let mainMenu = `
╭──────────────────────────╮
│    🌟 ${config.BOT_NAME} COMMAND MENU 🌟    │
├──────────────────────────┤
│ 👤 User: ${pushname}
│ 🌐 Mode: ${config.MODE}
│ ✨ Prefix: ${config.PREFIX}
│ 📦 Total Commands: ${totalCommands}
│ 📌 Version: ${config.version} v3
│ ⏰ ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour12: true })}
╰──────────────────────────╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📋 SELECT CATEGORY     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${categoryList}│
│ 0️⃣ Show All Commands
│ ❌ Type 'menu close' to exit
│
╰─────────────────────────✨

💡 *How to use:*
• Reply with a number (1-${categoryIndex-1}) to see commands in that category
• Reply with 0 to see all commands at once
• Each command will show usage examples and description

🔍 *Quick Access:*
• Type \`${config.PREFIX}menu <category>\` for direct access
• Example: \`${config.PREFIX}menu download\`

> ${config.DESCRIPTION}
`;

        // Send main menu with image
        await conn.sendMessage(
            from,
            {
                image: { url: config.MENU_IMAGE_URL },
                caption: mainMenu,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363158701754973@newsletter',
                        newsletterName: `${config.BOT_NAME} Menu System`,
                        serverMessageId: Math.floor(Math.random() * 1000)
                    },
                    externalAdReply: {
                        title: `${config.BOT_NAME} Command Menu`,
                        body: `Total ${totalCommands} commands available`,
                        thumbnailUrl: config.MENU_IMAGE_URL,
                        sourceUrl: 'https://github.com/Nimeshkamihiran/NENO-XMD-V3',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            },
            { quoted: mek }
        );

        // Send menu audio if available
        if (fs.existsSync('./all/menu.m4a')) {
            await conn.sendMessage(from, {
                audio: fs.readFileSync('./all/menu.m4a'),
                mimetype: 'audio/mp4',
                ptt: true,
                waveform: [100,0,100,0,100,0,100]
            }, { quoted: mek });
        }

    } catch (e) {
        console.error('Menu Error:', e);
        reply(`❌ Menu Error: ${e.message}`);
    }
});

// Handle number replies for menu navigation
lite({
    pattern: "^[0-9]+$",
    react: "🔢",
    desc: "Handle menu number selections",
    category: "system",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, mek, m, {
    from, body, reply, pushname
}) => {
    try {
        if (!menuSessions.has(from)) return; // No active menu session
        
        const session = menuSessions.get(from);
        const selectedNumber = parseInt(body);
        
        // Check if session is still valid (5 minutes)
        if (Date.now() - session.timestamp > 300000) {
            menuSessions.delete(from);
            return reply('⏰ Menu session expired. Please type `menu` again.');
        }

        if (selectedNumber === 0) {
            // Show all commands
            await showAllCommands(conn, mek, from, pushname);
            menuSessions.delete(from);
            return;
        }

        // Find selected category
        const selectedCategory = session.categories.find(cat => cat.index === selectedNumber);
        if (!selectedCategory) {
            return reply(`❌ Invalid selection. Please choose a number between 0-${session.categories.length}.`);
        }

        await showCategoryCommands(conn, mek, from, selectedCategory, pushname);
        menuSessions.delete(from);

    } catch (e) {
        console.error('Number Reply Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

// Handle menu close command
lite({
    pattern: "menu close",
    react: "❌",
    desc: "Close active menu session",
    category: "system",
    dontAddCommandList: true,
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    if (menuSessions.has(from)) {
        menuSessions.delete(from);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        reply('✅ Menu session closed successfully.');
    } else {
        reply('ℹ️ No active menu session found.');
    }
});

// Function to show all commands
async function showAllCommands(conn, mek, from, pushname) {
    let allCommandsList = `
╭──────────────────────────╮
│   🌟 ALL COMMANDS LIST 🌟   │
├──────────────────────────┤
│ 👤 User: ${pushname}
│ 📦 Complete Command Guide
╰──────────────────────────╯

`;

    let categories = {
        download: { name: '📥 DOWNLOAD COMMANDS', icon: '📥', commands: [] },
        group: { name: '🛠️ ADMIN COMMANDS', icon: '🛠️', commands: [] },
        main: { name: '🏠 MAIN COMMANDS', icon: '🏠', commands: [] },
        owner: { name: '🧑‍💻 OWNER COMMANDS', icon: '🧑‍💻', commands: [] },
        ai: { name: '🧠 AI COMMANDS', icon: '🧠', commands: [] },
        anime: { name: '✨ ANIME/LOGO COMMANDS', icon: '✨', commands: [] },
        convert: { name: '🔄 CONVERT COMMANDS', icon: '🔄', commands: [] },
        reaction: { name: '🎭 REACTION COMMANDS', icon: '🎭', commands: [] },
        fun: { name: '🎉 FUN COMMANDS', icon: '🎉', commands: [] },
        other: { name: '📂 OTHER COMMANDS', icon: '📂', commands: [] }
    };

    // Collect commands
    for (let cmd of commands) {
        if (cmd.pattern && !cmd.dontAddCommandList) {
            let category = cmd.category || 'other';
            if (categories[category]) {
                categories[category].commands.push({
                    pattern: cmd.pattern,
                    desc: cmd.desc || 'No description'
                });
            }
        }
    }

    // Build command list
    for (let [key, category] of Object.entries(categories)) {
        if (category.commands.length > 0) {
            allCommandsList += `
┏━━━ ${category.name} ━━━┓
`;
            for (let cmd of category.commands) {
                allCommandsList += `┃ ⬡ .${cmd.pattern}\n`;
            }
            allCommandsList += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
        }
    }

    allCommandsList += `\n💡 Type .help <command> for detailed usage\n📝 Example: .help movie`;

    await conn.sendMessage(from, {
        text: allCommandsList,
        contextInfo: {
            externalAdReply: {
                title: `${config.BOT_NAME} - All Commands`,
                body: `Complete list of ${commands.length} available commands`,
                thumbnailUrl: config.MENU_IMAGE_URL,
                sourceUrl: 'https://github.com/CYBER-x-SACHIYA/Lite-X',
                mediaType: 1
            }
        }
    }, { quoted: mek });
}

// Function to show specific category commands
async function showCategoryCommands(conn, mek, from, selectedCategory, pushname) {
    const category = selectedCategory.category;
    
    let categoryMenu = `
╭──────────────────────────╮
│  ${category.icon} ${category.name.toUpperCase()}  │
├──────────────────────────┤
│ 👤 User: ${pushname}
│ 📦 Commands: ${category.commands.length}
╰──────────────────────────╯

`;

    let commandIndex = 1;
    for (let cmd of category.commands) {
        let aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
        categoryMenu += `
┏━━━ ${commandIndex}. ${cmd.pattern}${aliases} ━━━┓
┃ 📝 ${cmd.desc}
┃ 💡 Usage: ${cmd.usage}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`;
        commandIndex++;
    }

    categoryMenu += `
🔙 Reply 'back' to return to main menu
📱 Type any command to use it directly
`;

    await conn.sendMessage(from, {
        text: categoryMenu,
        contextInfo: {
            externalAdReply: {
                title: `${category.name}`,
                body: `${category.commands.length} commands available in this category`,
                thumbnailUrl: config.MENU_IMAGE_URL,
                sourceUrl: 'https://github.com/CYBER-x-SACHIYA/Lite-X',
                mediaType: 1
            }
        }
    }, { quoted: mek });
}

// Handle 'back' command to return to main menu
lite({
    pattern: "back",
    react: "🔙",
    desc: "Return to main menu",
    category: "system", 
    dontAddCommandList: true,
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    // Re-trigger main menu
    const { pushname } = m;
    await conn.sendMessage(from, { text: `${config.PREFIX}menu` });
});

// Direct category access
lite({
    pattern: "menu (.*)",
    react: "🎯",
    desc: "Direct access to specific category",
    category: "main",
    use: ".menu <category>",
    filename: __filename
},
async (conn, mek, m, { from, match, pushname, reply }) => {
    try {
        const requestedCategory = match[1].toLowerCase().trim();
        
        let categories = {
            download: { name: '📥 Download Commands', commands: [] },
            admin: { name: '🛠️ Admin Commands', commands: [] },
            group: { name: '🛠️ Group Commands', commands: [] },
            main: { name: '🏠 Main Commands', commands: [] },
            owner: { name: '🧑‍💻 Owner Commands', commands: [] },
            ai: { name: '🧠 AI Commands', commands: [] },
            anime: { name: '✨ Anime Commands', commands: [] },
            convert: { name: '🔄 Convert Commands', commands: [] },
            reaction: { name: '🎭 Reaction Commands', commands: [] },
            fun: { name: '🎉 Fun Commands', commands: [] }
        };

        // Map aliases
        const categoryMap = {
            'dl': 'download',
            'downloader': 'download', 
            'group': 'group',
            'admin': 'group',
            'artificial': 'ai',
            'bot': 'ai',
            'logo': 'anime',
            'sticker': 'convert',
            'conv': 'convert',
            'react': 'reaction',
            'emoji': 'reaction'
        };

        const targetCategory = categoryMap[requestedCategory] || requestedCategory;
        
        if (!categories[targetCategory]) {
            return reply(`❌ Category "${requestedCategory}" not found.\n\n📋 Available categories:\n${Object.keys(categories).join(', ')}`);
        }

        // Find commands for this category
        for (let cmd of commands) {
            if (cmd.pattern && !cmd.dontAddCommandList && (cmd.category === targetCategory || (targetCategory === 'group' && cmd.category === 'group'))) {
                categories[targetCategory].commands.push({
                    pattern: cmd.pattern,
                    desc: cmd.desc || 'No description',
                    usage: cmd.use || `.${cmd.pattern}`,
                    aliases: cmd.alias || []
                });
            }
        }

        if (categories[targetCategory].commands.length === 0) {
            return reply(`📂 No commands found in "${requestedCategory}" category.`);
        }

        // Show category commands directly
        await showCategoryCommands(conn, mek, from, {
            key: targetCategory,
            category: categories[targetCategory],
            index: 1
        }, pushname);

    } catch (e) {
        console.error('Direct Category Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});