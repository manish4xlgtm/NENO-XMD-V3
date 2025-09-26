const axios = require('axios');
const { lite } = require('../lite');

const MANOJ_API_URL = 'https://manojapi.infinityapi.org/api/v1/cinesubz-search';
const MANOJ_API_KEY = '5d08a44e-4291-4244-922e-91cd57b769f5';

lite({
  pattern: 'movie',
  alias: ['film', 'mv', 'movie2'],
  react: '🎬',
  desc: 'Search for a movie/video and send it as a file.',
  category: 'download',
  use: '.movie <movie name>',
  filename: __filename
}, async (conn, mek, m, { from, reply, args, q }) => {
  try {
    // build the query (use q if provided, otherwise args)
    const query = (q && q.trim()) || (args && args.length ? args.join(' ').trim() : '');
    if (!query) return reply('Please provide a movie name. Example: `.movie the king`');

    // show processing reaction
    await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

    // call the API
    const apiRes = await axios.get(MANOJ_API_URL, {
      headers: { Authorization: `Bearer ${MANOJ_API_KEY}` },
      params: { q: query, apiKey: '' }
    });

    if (!apiRes || !apiRes.data) {
      await reply('❌ No response from API. Please try again later.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    const data = apiRes.data;
    // normalize common response shapes
    let item = null;
    if (Array.isArray(data.results) && data.results.length) item = data.results[0];
    else if (Array.isArray(data.data) && data.data.length) item = data.data[0];
    else if (data.result) item = data.result;
    else if (data.items && Array.isArray(data.items) && data.items.length) item = data.items[0];
    else item = data;

    if (!item) {
      await reply('❌ No movie found. Try a different name.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // try common fields for direct download URL
    const fileUrl = item.fileUrl || item.download || item.url || item.link || item.file || item.video || item.file_url || item.download_url || null;

    if (!fileUrl) {
      await reply('❌ No direct download link was found in the API result. Paste a sample API JSON and I will adapt the parser.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      console.log('Full API item:', JSON.stringify(item, null, 2));
      return;
    }

    // if the link is a torrent/magnet, refuse
    if (typeof fileUrl === 'string' && (fileUrl.startsWith('magnet:') || fileUrl.endsWith('.torrent') || fileUrl.includes('.torrent?'))) {
      await reply('⚠️ The link is a torrent/magnet. I cannot send torrent files directly via WhatsApp. Please provide a direct media link (http/https .mp4/.mkv/etc).');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // inform user
    await reply(`🔎 Searching for "${query}"... If found, will start download and send it.`);

    // download file (allow very large responses)
    const fileResp = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // optionally add headers if needed: headers: { Referer: '...', Cookie: '...' }
    });

    if (!fileResp || !fileResp.data) {
      await reply('❌ Failed to download the file. Try another source or try again later.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // determine content-type and filename
    const contentType = (fileResp.headers && (fileResp.headers['content-type'] || fileResp.headers['Content-Type'])) || '';
    let filename = item.title || item.name || item.filename || null;
    if (!filename) {
      try {
        const urlParts = String(fileUrl).split('/').pop().split('?')[0];
        filename = urlParts || query.replace(/\s+/g, '_');
      } catch (e) {
        filename = query.replace(/\s+/g, '_');
      }
    }
    // add extension when missing and we know content type
    if (!filename.includes('.') && contentType) {
      if (contentType.includes('mp4')) filename += '.mp4';
      else if (contentType.includes('mkv')) filename += '.mkv';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename += '.jpg';
      else if (contentType.includes('png')) filename += '.png';
      else if (contentType.includes('pdf')) filename += '.pdf';
    }

    const buffer = Buffer.from(fileResp.data);

    // send according to mimetype
    if (contentType.startsWith('image')) {
      await conn.sendMessage(from, {
        image: buffer,
        caption:
          `🎬 ${query}\n\n` +
          `🔖 Name: ${filename}\n` +
          `📏 Size: ${item.size || item.filesize || 'Unknown (not provided by API)'}\n\n` +
          `> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ sᴜɴɢ`,
        contextInfo: { mentionedJid: [m.sender], forwardingScore: 999, isForwarded: true }
      }, { quoted: mek });
    } else if (contentType.startsWith('video')) {
      await conn.sendMessage(from, {
        video: buffer,
        caption:
          `🎬 ${query}\n\n` +
          `🔖 Name: ${filename}\n` +
          `📏 Size: ${item.size || item.filesize || 'Unknown (not provided by API)'}\n\n` +
          `> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ sᴜɴɢ`,
        contextInfo: { mentionedJid: [m.sender], forwardingScore: 999, isForwarded: true }
      }, { quoted: mek });
    } else {
      await conn.sendMessage(from, {
        document: buffer,
        mimetype: contentType || 'application/octet-stream',
        fileName: filename,
        caption:
          `🎬 ${query}\n\n` +
          `🔖 Name: ${filename}\n` +
          `📏 Size: ${item.size || item.filesize || 'Unknown (not provided by API)'}\n\n` +
          `> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ sᴜɴɢ`,
        contextInfo: { mentionedJid: [m.sender], forwardingScore: 999, isForwarded: true }
      }, { quoted: mek });
    }

    // success reaction
    await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
  } catch (err) {
    console.error('Error in .movie command:', err?.response?.data || err.message || err);
    await reply('❌ Unable to download the movie. Try again later or use a different name/source.');
    await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
  }
});
