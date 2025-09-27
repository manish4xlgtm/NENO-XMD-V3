// .movie command - NO MAX SIZE (streams to disk). Use only for legal content.
const axios = require('axios');
const { lite } = require('../lite');
const { JSDOM } = require('jsdom'); // optional; fallback uses regex
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const MANOJ_API_URL = 'https://manojapi.infinityapi.org/api/v1/cinesubz-search';
const MANOJ_API_KEY = '5d08a44e-4291-4244-922e-91cd57b769f5';

// If true, allow any host returned by API (set to true if you trust API)
const ALLOW_ANY_HOST = true;

function pickFileUrl(item) {
  if (!item) return null;
  const keys = ['fileUrl','download','url','link','file','video','file_url','download_url','source','src'];
  for (const k of keys) {
    if (item[k] && typeof item[k] === 'string' && item[k].trim()) return item[k].trim();
  }
  if (Array.isArray(item.links) && item.links.length) {
    const first = item.links.find(l => typeof l === 'string' && l.trim());
    if (first) return first.trim();
  }
  return null;
}
function isHttpUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u); }

function extractMediaFromHtml(html, baseUrl = '') {
  const found = new Set();
  try {
    const dom = new JSDOM(html, { url: baseUrl || undefined });
    const doc = dom.window.document;
    const nodes = Array.from(doc.querySelectorAll('video, source, a'));
    nodes.forEach(el => {
      const src = el.getAttribute && (el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('href'));
      if (src && /\.(mp4|mkv|webm|avi)(\?|$)/i.test(src)) {
        try { found.add(new URL(src, baseUrl).href); } catch (e) { found.add(src); }
      }
    });
  } catch (e) {
    const re = /(?:src|data-src|href)=["']([^"']+\.(?:mp4|mkv|webm|avi)(?:\?[^"']*)?)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      try { found.add(new URL(m[1], baseUrl).href); } catch (err) { found.add(m[1]); }
    }
  }
  return Array.from(found);
}

lite({
  pattern: 'moviedl',
  alias: ['film','mv','movie2'],
  react: '🎬',
  desc: 'Search for a movie/video and send it as a file (legal sources only).',
  category: 'download',
  use: '.movie <movie name>',
  filename: __filename
}, async (conn, mek, m, { from, reply, args, q }) => {
  try {
    const query = (q && q.trim()) || (args && args.length ? args.join(' ').trim() : '');
    if (!query) return reply('Please provide a movie name. Example: `.movie ironman 3`');

    await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

    const apiRes = await axios.get(MANOJ_API_URL, {
      headers: { Authorization: `Bearer ${MANOJ_API_KEY}` },
      params: { q: query }
    });

    if (!apiRes || !apiRes.data) {
      await reply('❌ No response from API. Try again later.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    const data = apiRes.data;
    let item = null;
    if (Array.isArray(data.results) && data.results.length) item = data.results[0];
    else if (Array.isArray(data.data) && data.data.length) item = data.data[0];
    else if (data.result) item = data.result;
    else if (data.items && Array.isArray(data.items) && data.items.length) item = data.items[0];
    else item = data;

    if (!item) {
      await reply('❌ No movie found. Try different name.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    const candidate = pickFileUrl(item);
    if (!candidate) {
      await reply('❌ No link found in API response. Paste a sample API JSON `item` and I will adapt the parser.');
      console.log('API item (no candidate):', JSON.stringify(item, null, 2));
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    if (!isHttpUrl(candidate)) {
      await reply('⚠️ Found non-http link (magnet/torrent or invalid). I cannot handle torrent/magnet links.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    if (!ALLOW_ANY_HOST) {
      // edit allowed hosts list as needed
      const allowed = ['archive.org','sample-videos.com','your-trusted-host.com'];
      try {
        const hostname = new URL(candidate).hostname.toLowerCase();
        if (!allowed.some(d => hostname === d || hostname.endsWith('.' + d))) {
          await reply('⚠️ Media host not in whitelist. Add host or set ALLOW_ANY_HOST=true.');
          await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
          return;
        }
      } catch (e) { /* ignore */ }
    }

    // HEAD to get content-type if possible
    let headInfo = {};
    try {
      const h = await axios.head(candidate, { timeout: 10000 });
      headInfo.contentType = h.headers['content-type'] || '';
      headInfo.contentLength = parseInt(h.headers['content-length'] || '0', 10) || 0;
    } catch (e) {
      headInfo = { contentType: '', contentLength: 0 };
    }

    // refuse HLS/DASH manifests
    if (headInfo.contentType && (headInfo.contentType.includes('application/vnd.apple.mpegurl') || headInfo.contentType.includes('application/x-mpegURL') || candidate.endsWith('.m3u8') || candidate.endsWith('.mpd'))) {
      await reply('⚠️ The link appears to be an HLS/DASH stream (m3u8/mpd). This script cannot download/convert such streams.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // If HTML, fetch page, send page, and try to extract direct media links
    if (headInfo.contentType && headInfo.contentType.includes('text/html')) {
      const pageResp = await axios.get(candidate, { responseType: 'text' });
      const html = pageResp.data || '';
      const baseName = (item.title || item.name || query).replace(/\s+/g,'_') + '.html';
      await conn.sendMessage(from, {
        document: Buffer.from(String(html)),
        fileName: baseName,
        mimetype: 'text/html',
        caption: `HTML page for "${query}"`
      }, { quoted: mek });

      const mediaLinks = extractMediaFromHtml(html, candidate);
      if (!mediaLinks.length) {
        await reply('ℹ️ No direct media (.mp4/.mkv/etc) links found in HTML. If page uses JS streaming or protected players, I cannot extract them.');
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        return;
      }
      // use first media link
      const mediaUrl = mediaLinks[0];
      // proceed to stream & send mediaUrl below by replacing candidate with mediaUrl
      // set candidate and update headInfo
      candidateToDownload = mediaUrl;
    } else {
      candidateToDownload = candidate;
    }

    // STREAM download to temp file (no size limit)
    const tmpDir = os.tmpdir();
    const ext = (() => {
      const p = candidateToDownload.split('?')[0];
      const e = path.extname(p);
      return e || '';
    })();
    const tmpName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    const tmpPath = path.join(tmpDir, tmpName);

    await reply(`Downloading full file. This may take a while depending on size and connection...`);
    // stream
    const response = await axios.get(candidateToDownload, { responseType: 'stream', timeout: 0, maxContentLength: Infinity, maxBodyLength: Infinity });
    const contentType = response.headers['content-type'] || headInfo.contentType || '';
    // refuse if it is an HLS/dash again
    if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL'))) {
      await reply('⚠️ The media is an HLS/DASH manifest (m3u8/mpd). Cannot download as a single file.');
      return;
    }
    const writer = fs.createWriteStream(tmpPath);
    await streamPipeline(response.data, writer);

    // file downloaded, read and send
    const stat = fs.statSync(tmpPath);
    const fileSize = stat.size;
    const filename = item.title || item.name || path.basename(tmpPath) || query.replace(/\s+/g,'_');

    const fileBuffer = fs.readFileSync(tmpPath);

    if (contentType.startsWith('image')) {
      await conn.sendMessage(from, { image: fileBuffer, caption: `🎬 ${query}\n🔖 ${filename}\n📏 ${Math.round(fileSize/1024)} KB` }, { quoted: mek });
    } else if (contentType.startsWith('video')) {
      await conn.sendMessage(from, { video: fileBuffer, caption: `🎬 ${query}\n🔖 ${filename}\n📏 ${Math.round(fileSize/1024)} KB` }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { document: fileBuffer, fileName: filename, mimetype: contentType || 'application/octet-stream', caption: `🎬 ${query}\n🔖 ${filename}\n📏 ${Math.round(fileSize/1024)} KB` }, { quoted: mek });
    }

    // cleanup
    try { fs.unlinkSync(tmpPath); } catch (e) { console.warn('Temp file cleanup failed', e); }

    await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
  } catch (err) {
    console.error('.movie command (no limit) error:', err?.response?.data || err.message || err);
    await reply('❌ Unable to download/send file. If you are testing with a direct (legal) link, paste a sample API `item` and I will help adapt the parser.');
    await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
  }
});
