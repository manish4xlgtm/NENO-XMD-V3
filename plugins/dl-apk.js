const axios = require('axios');
const { lite, commands } = require('../lite');

lite({
    pattern: "apk",
    alias: ["modapk", "apkdownload"],
    react: '🩸',
    desc: "Download APK files using NexOracle API.",
    category: "download",
    use: ".apk <app name>",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const appName = args.join(" ");
        if (!appName) {
            return reply('❗ *Neno tilts her head...* Provide an app name. Example: `.apk whatsapp`');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const apiUrl = `https://api.nexoracle.com/downloader/apk`;
        const params = { apikey: 'free_key@maher_apis', q: appName };
        const response = await axios.get(apiUrl, { params });

        if (!response.data || response.data.status !== 200 || !response.data.result) {
            return reply('❌ *Neno frowns:* Unable to find the APK. Try again.');
        }

        const { name, lastup, package, size, icon, dllink } = response.data.result;

        // Sending initial thumbnail
        await conn.sendMessage(from, {
            image: { url: icon },
            caption: `🩸 *neno is fetching ${name}... Please wait.*`,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401225837204@newsletter',
                    newsletterName: '『 ɴᴇɴᴏ xᴍᴅ ᴠ3 』',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        const apkResponse = await axios.get(dllink, { responseType: 'arraybuffer' });
        if (!apkResponse.data) {
            return reply('❌ *Makima sighs:* Failed to download the APK.');
        }

        const apkBuffer = Buffer.from(apkResponse.data, 'binary');

        const message = `📦 *ᴀᴘᴋ ᴅᴇᴛᴀɪʟs* 🩸\n\n` +
            `🔖 *Name*: ${name}\n` +
            `📅 *Last Update*: ${lastup}\n` +
            `📦 *Package*: ${package}\n` +
            `📏 *Size*: ${size}\n\n` +
            `> *ʙʏ ɴᴇɴᴏ xᴍᴅ ᴠ3*`;

        await conn.sendMessage(from, {
            document: apkBuffer,
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${name}.apk`,
            caption: message,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401225837204@newsletter',
                    newsletterName: '『 ɴᴇɴᴏ xᴍᴅ ᴠ3 』',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('APK Error:', error);
        reply('❌ *Neno xmd whispers:* Unable to fetch APK. Try again later.');
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
