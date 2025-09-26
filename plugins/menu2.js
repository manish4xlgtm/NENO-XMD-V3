const { lite } = require('../lite');
const config = require('../settings');

// MENU COMMAND
lite({
  pattern: "menu2",
  desc: "Show main bot menu",
  category: "general",
  react: "⚡",
  filename: __filename
}, async (socket, msg, mek, { from, reply, sender }) => {
  try {
    const startTime = socketCreationTime.get(sender) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const title = `┏━❐  \`H E L L O W\`\n┃ *⭔ Itz:* ɴᴇɴᴏ ᴍɪɴɪ ᴠ1\n┃ *⭔ Type:* ᴍɪɴɪ ʙᴏᴛ\n┃ *⭔ Platform:* ɴᴇɴᴏ ʜᴏꜱᴛ\n┃ *⭔ UpTime:* ${hours}h ${minutes}m ${seconds}s\n┗━❐`;
    const content = `*© ༺ɴᴇɴᴏ ᴍɪɴɪ༻*\n` +
                    `*◯ A B O U T*\n` +
                    `> ɴᴇɴᴏ ᴍɪɴɪ ʙᴏᴛ ɪꜱ ᴠᴇʀʏ ꜱɪᴍᴘʟᴇ ᴍɪɴɪ ʙᴏᴛ ...\n` +
                    `*◯ D E P L O Y*\n` +
                    `> *Website* https://neno-pair-v3-tirh.onrender.com`;

    await socket.sendMessage(from, {
      image: { url: config.BUTTON_IMAGES.MENU },
      caption: `${title}\n\n${content}\n\n${config.BOT_FOOTER || ''}`,
      buttons: [
        { buttonId: `${config.PREFIX}downloadmenu`, buttonText: { displayText: 'DOWNLOAD' }, type: 1 },
        { buttonId: `${config.PREFIX}ping`, buttonText: { displayText: 'CONVERT' }, type: 1 },
        { buttonId: `${config.PREFIX}other`, buttonText: { displayText: 'OTHER' }, type: 1 },
        { buttonId: `${config.PREFIX}owner`, buttonText: { displayText: 'OWNER' }, type: 1 }
      ],
      quoted: msg
    });

  } catch (e) {
    console.error('Menu command error:', e);
    await reply('❌ Failed to send menu.');
  }
});

// DOWNLOAD MENU
lite({
  pattern: "downloadmenu",
  desc: "Show download commands",
  category: "general",
  react: "⬇️",
  filename: __filename
}, async (socket, msg, mek, { from, reply }) => {
  try {
    const kariyane = `┏━❐  \`H E L L O W\`
┃ *⭔ This:* ɴᴇɴᴏ xᴍᴅ ᴍɪɴɪ
┃ *⭔ Type:* MINI BOT
┃ *⭔ Platform:* ɴᴇɴᴏ ʜᴏꜱᴛ
┃ *⭔ Owner:* ɴɪᴍᴇꜱʜᴋᴀ ᴍɪʜɪʀᴀɴ
┗━❐

┏━❐
┃ ⭔| song
┃ ⭔| video
┃ ⭔| fb
┃ ⭔| tiktok
┗━❐

*│➤ ABOUT*
│ ◦ Check bot = ping
│ ◦ ConnectUs = owner
│ ◦ deploy = pair`;

    await socket.sendMessage(from, {
      image: { url: "https://files.catbox.moe/ukjr05.jpg" },
      caption: kariyane,
      quoted: msg
    });
  } catch (e) {
    console.error('DownloadMenu error:', e);
    await reply('❌ Failed to send download menu.');
  }
});

// PING
lite({
  pattern: "ping2",
  desc: "Check bot speed",
  category: "general",
  react: "💖",
  filename: __filename
}, async (socket, msg, mek, { from }) => {
  var inital = new Date().getTime();
  let ping = await socket.sendMessage(from, { text: '*_ᴘɪɴɢɪɴɢ ʙʏ ɴᴇɴᴏ ᴍɪɴɪ💖..._* ❗' });
  var final = new Date().getTime();

  await socket.sendMessage(from, { text: '《 █▒▒▒▒▒▒▒▒▒▒▒》10%', edit: ping.key });
  await socket.sendMessage(from, { text: '《 ████▒▒▒▒▒▒▒▒》30%', edit: ping.key });
  await socket.sendMessage(from, { text: '《 ███████▒▒▒▒▒》50%', edit: ping.key });
  await socket.sendMessage(from, { text: '《 ██████████▒▒》80%', edit: ping.key });
  await socket.sendMessage(from, { text: '《 ████████████》100%', edit: ping.key });

  return await socket.sendMessage(from, {
    text: '☁ *ᴘᴏɴɢ ᴡɪᴛʜ ɴᴇɴᴏ ' + (final - inital) + ' Ms*', edit: ping.key 
  });
});

// OWNER
lite({
  pattern: "owner1",
  desc: "Show owner contacts",
  category: "general",
  react: "👤",
  filename: __filename
}, async (socket, msg, mek, { from }) => {
  const ownerContact = {
    contacts: {
      displayName: 'My Contacts',
      contacts: [
        {
          vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN;CHARSET=UTF-8:ɴɪᴍᴇꜱʜᴋᴀ➇\nTEL;TYPE=Coder,VOICE:94721584279\nEND:VCARD',
        },
        {
          vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN;CHARSET=UTF-8:ɴᴇɴᴏ ᴏᴡɴᴇʀ\nTEL;TYPE=Coder,VOICE:94760771665\nEND:VCARD',
        },
      ],
    },
  };

  const ownerLocation = {
    location: {
      degreesLatitude: 37.7749,
      degreesLongitude: -122.4194,
      name: 'ɴᴇɴᴏ ᴡʜᴇʀᴇ',
      address: 'Colombo, SriLanka',
    },
  };

  await socket.sendMessage(from, ownerContact, { quoted: msg });
  await socket.sendMessage(from, ownerLocation, { quoted: msg });
});
