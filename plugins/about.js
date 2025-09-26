const { lite } = require('../lite');
const config = require('../settings');

lite({
    pattern: "about",
    alias: ["info","contract"],
    desc: "Shows bot & owner info + rules of obedience",
    category: "main",
    react: "👁️",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        const caption = `
╔═══ ❖ • ✦ • ❖ ═══╗
       👁️ *ᴀʙᴏᴜᴛ ᴍᴀᴋɪᴍᴀ-ʙᴏᴛ* 🩸
╚═══ ❖ • ✦ • ❖ ═══╝

🤖 *Bot Name:* ${config.BOT_NAME || "NENO XMD V3"}  
⚡ *Version:* ${config.version}  
🛠️ *Prefix:* ${config.PREFIX}  
👑 *Mode:* ${config.MODE}  

━━━━━━━━━━━━━━━━━━━
👑 *Bot Owner:*  
   ${config.OWNER_NAME}  
   wa.me/${config.OWNER_NUMBER || "###########"}  

▶️ *YouTube:*  
   https://youtube.com/@malvintech2  

━━━━━━━━━━━━━━━━━━━
🩸 *Rules of Obedience*  
━━━━━━━━━━━━━━━━━━━
1. Use commands with respect.  
2. Do not spam or flood Neno xmd.  
3. Obey the prefix: [ ${config.PREFIX} ]  
4. Remember — Neno xmd *sees all*.  

━━━━━━━━━━━━━━━━━━━
👁️ *Neno xmd whispers:*  
“Power flows only through the contract.  
Disobey… and you will be consumed.”  
━━━━━━━━━━━━━━━━━━━
        `.trim();

        await conn.sendMessage(from, {
            image: { url: config.MENU_IMAGE_URL || "https://files.catbox.moe/y65ffs.jpg" },
            caption,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 666,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401225837204@newsletter',
                    newsletterName: 'ɴᴇɴᴏ xᴍᴅ ᴠ3',
                    serverMessageId: 111
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in about command:", e);
        reply(`❌ *ɴᴇɴᴏ ᴇʀʀʀᴇ:* ${e.message}`);
    }
});
