const config = require('../settings');
const { lite } = require('../lite');
const DY_SCRAP = require('@dark-yasiya/scrap');
const dy_scrap = new DY_SCRAP();

function replaceYouTubeID(url) {
    const regex = /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

lite({
    pattern: "song",
    alias: ["s","play"],
    react: "🩸",
    desc: "Makima Song Downloader",
    category: "download",
    use: ".song <Text or YT URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("🩸 *NENO V3 orders you... Provide a query or YouTube URL!*");

        let id = q.startsWith("https://") ? replaceYouTubeID(q) : null;

        if (!id) {
            const searchResults = await dy_scrap.ytsearch(q);
            if (!searchResults?.results?.length) return await reply("❌ *NENO found nothing...*");
            id = searchResults.results[0].videoId;
        }

        const data = await dy_scrap.ytsearch(`https://youtube.com/watch?v=${id}`);
        if (!data?.results?.length) return await reply("❌ *Makima cannot fetch this video...*");

        const { url, title, image, timestamp, ago, views, author } = data.results[0];

        let info = `👁️ *ɴᴇɴᴏ ᴠ3 ꜱᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 👁️\n\n` +
            `🎵 *Title:* ${title || "Unknown"}\n` +
            `⏳ *Duration:* ${timestamp || "Unknown"}\n` +
            `👀 *Views:* ${views || "Unknown"}\n` +
            `🌙 *Released:* ${ago || "Unknown"}\n` +
            `👤 *Author:* ${author?.name || "Unknown"}\n` +
            `🖇 *Url:* ${url || "Unknown"}\n\n` +
            `⚖️ *Reply with your choice, human:*\n` +
            `> 1 *Audio Type* 🎶\n` +
            `> 2 *Document Type* 📂\n\n` +
            `${config.FOOTER || "ɴᴇɴᴏ xᴍᴅ ᴠ3"}`;

        const sentMsg = await conn.sendMessage(from, { image: { url: image }, caption: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '👁️', key: sentMsg.key } });

        conn.ev.on('messages.upsert', async (messageUpdate) => { 
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let userReply = messageType.trim();
                let msg;
                let type;
                let response;
                
                if (userReply === "1") {
                    msg = await conn.sendMessage(from, { text: "🩸 *NENO XMD is preparing your audio...*" }, { quoted: mek });
                    response = await dy_scrap.ytmp3(`https://youtube.com/watch?v=${id}`);
                    let downloadUrl = response?.result?.download?.url;
                    if (!downloadUrl) return await reply("❌ *NENO couldn’t find the download link!*");
                    type = { audio: { url: downloadUrl }, mimetype: "audio/mpeg" };
                    
                } else if (userReply === "2") {
                    msg = await conn.sendMessage(from, { text: "🩸 *NENO is preparing your file...*" }, { quoted: mek });
                    const response = await dy_scrap.ytmp3(`https://youtube.com/watch?v=${id}`);
                    let downloadUrl = response?.result?.download?.url;
                    if (!downloadUrl) return await reply("❌ *NENO couldn’t find the download link!*");
                    type = { document: { url: downloadUrl }, fileName: `${title}.mp3`, mimetype: "audio/mpeg", caption: title };
                    
                } else { 
                    return await reply("❌ *NENO says: Invalid choice. Reply with 1 or 2.*");
                }

                await conn.sendMessage(from, type, { quoted: mek });
                await conn.sendMessage(from, { text: '✅ *Obey Makima — Upload Successful!* ✅', edit: msg.key });

            } catch (error) {
                console.error(error);
                await reply(`❌ *NENO detected an error:* ${error.message || "Error!"}`);
            }
        });

    } catch (error) {
        console.error(error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ *NENO encountered an error:* ${error.message || "Error!"}`);
    }
});
