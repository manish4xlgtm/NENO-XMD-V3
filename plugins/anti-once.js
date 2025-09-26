const { lite } = require("../lite");

lite({
  pattern: "vv2",
  alias: ["wah", "ohh", "oho", "🙂", "nice", "ok"],
  desc: "Owner Only - retrieve quoted message back to user",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isCreator }) => {
  try {
    if (!isCreator) {
      return; // Makima ignores anyone but her master 🩸
    }

    if (!match.quoted) {
      return await client.sendMessage(from, {
        text: "🔮 *Makima whispers:* You must reply to a *view once* message if you want me to reveal it..."
      }, { quoted: message });
    }

    const buffer = await match.quoted.download();
    const mtype = match.quoted.mtype;
    const options = { quoted: message };

    let messageContent = {};
    switch (mtype) {
      case "imageMessage":
        messageContent = {
          image: buffer,
          caption: match.quoted.text || 'NENO XMD V3 IS GET THIS HIDEIN😆✅...',
          mimetype: match.quoted.mimetype || "image/jpeg"
        };
        break;
      case "videoMessage":
        messageContent = {
          video: buffer,
          caption: match.quoted.text || 'NENO XMD V3 😆💥😍lets you see what was hidden...',
          mimetype: match.quoted.mimetype || "video/mp4"
        };
        break;
      case "audioMessage":
        messageContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: match.quoted.ptt || false
        };
        break;
      default:
        return await client.sendMessage(from, {
          text: "❌ NENO says: Only *image, video, and audio* can be controlled by me."
        }, { quoted: message });
    }

    // Forward secretly into master’s DM
    await client.sendMessage(message.sender, messageContent, options);
  } catch (error) {
    console.error("vv Error:", error);
    await client.sendMessage(from, {
      text: "💔 NENO sighs... An error occurred:\n" + error.message
    }, { quoted: message });
  }
});
