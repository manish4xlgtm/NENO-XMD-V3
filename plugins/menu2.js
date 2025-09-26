const { lite } = require('../lite');
const config = require('../settings');

lite({
  pattern: "menu",
  react: "⚡",
  desc: "Show bot main menu",
  category: "main",
  use: ".menu",
  filename: __filename
}, async (conn, m, mek, { from, reply, pushname }) => {
  try {
    const title = `┏━❐  \`H E L L O W\`
┃ *⭔ Bot:* ɴᴇɴᴏ xᴍᴅ ᴍɪɴɪ
┃ *⭔ Type:* MINI BOT
┃ *⭔ Owner:* ɴɪᴍᴇꜱʜᴋᴀ ᴍɪʜɪʀᴀɴ
┗━❐`;

    const content = `👋 Hello *${pushname || "User"}*,  
Welcome to *NENO XMD MINI* 🤖  

⚡ Available Menus ⚡  
1. Download Menu  
2. Convert Tools  
3. Other Features  
4. Owner Info`;

    await conn.sendMessage(from, {
      image: { url: "https://files.catbox.moe/mw8mam.jpg" },
      caption: `${title}\n\n${content}`,
      footer: config.BOT_FOOTER || "© NENO MINI",
      buttons: [
        { buttonId: `${config.PREFIX}downloadmenu`, buttonText: { displayText: '⬇️ DOWNLOAD' }, type: 1 },
        { buttonId: `${config.PREFIX}ping`, buttonText: { displayText: '⚡ CONVERT' }, type: 1 },
        { buttonId: `${config.PREFIX}other`, buttonText: { displayText: '🎭 OTHER' }, type: 1 },
        { buttonId: `${config.PREFIX}owner`, buttonText: { displayText: '👤 OWNER' }, type: 1 }
      ],
      headerType: 4
    }, { quoted: mek });

  } catch (e) {
    console.error("Menu Error:", e);
    await reply("❌ Failed to send menu.");
  }
});
