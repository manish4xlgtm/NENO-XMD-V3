// .movie command using the kavi-public-apis endpoint (NO SIZE LIMIT — streams to disk)
// USE ONLY FOR LEGAL CONTENT. Do NOT use to download/distribute copyrighted movies without permission.

const axios = require('axios');
const { lite } = require('../lite');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const KAVI_API_URL = 'https://kavi-public-apis.vercel.app/api/v2/public/download/movie/sinhalasub/download/';

function pickFileUrl(item) {
  if (!item) return null;
  
  // Primary download links
  const primaryKeys = [
    'download_url', 'direct_url', 'file_url', 'movie_url', 'video_url',
    'download', 'file', 'url', 'link', 'video', 'media', 'source', 'src'
  ];
  
  for (const k of primaryKeys) {
    if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
      const url = item[k].trim();
      if (isDirectMediaUrl(url)) return url;
    }
  }
  
  // Check nested objects
  for (const k of Object.keys(item)) {
    try {
      const v = item[k];
      if (v && typeof v === 'object') {
        if (typeof v.url === 'string' && v.url.trim() && isDirectMediaUrl(v.url)) return v.url.trim();
        if (typeof v.link === 'string' && v.link.trim() && isDirectMediaUrl(v.link)) return v.link.trim();
        if (typeof v.download === 'string' && v.download.trim() && isDirectMediaUrl(v.download)) return v.download.trim();
      }
    } catch (e) { /* ignore */ }
  }
  
  // Check arrays of links
  if (Array.isArray(item.links) && item.links.length) {
    for (const link of item.links) {
      if (typeof link === 'string' && link.trim() && isDirectMediaUrl(link)) {
        return link.trim();
      }
      if (typeof link === 'object' && link.url && isDirectMediaUrl(link.url)) {
        return link.url.trim();
      }
    }
  }
  
  // Last resort: scan all string fields for media URLs
  for (const k of Object.keys(item)) {
    if (typeof item[k] === 'string' && isDirectMediaUrl(item[k])) {
      return item[k].trim();
    }
  }
  
  return null;
}

function isDirectMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Must be HTTP URL and end with media extension
  return /^https?:\/\/.+\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v)(\?.*)?$/i.test(url);
}

function isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

async function extractDirectLinksFromPage(pageUrl) {
  try {
    const response = await axios.get(pageUrl, { 
      responseType: 'text', 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const found = new Set();
    
    try {
      const dom = new JSDOM(html, { url: pageUrl });
      const doc = dom.window.document;
      
      // Look for video elements, download links, and source tags
      const selectors = [
        'video[src]',
        'source[src]', 
        'a[href*=".mp4"]',
        'a[href*=".mkv"]',
        'a[href*=".webm"]',
        'a[href*=".avi"]',
        '[data-src*=".mp4"]',
        '[data-url*=".mp4"]'
      ];
      
      selectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
          const url = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data-src') || el.getAttribute('data-url');
          if (url && isDirectMediaUrl(url)) {
            try {
              found.add(new URL(url, pageUrl).href);
            } catch (e) {
              if (isDirectMediaUrl(url)) found.add(url);
            }
          }
        });
      });
      
      // Look for download buttons or links with specific text
      const downloadLinks = doc.querySelectorAll('a');
      downloadLinks.forEach(link => {
        const text = link.textContent?.toLowerCase() || '';
        const href = link.getAttribute('href');
        if (href && (text.includes('download') || text.includes('direct') || text.includes('file')) && isDirectMediaUrl(href)) {
          try {
            found.add(new URL(href, pageUrl).href);
          } catch (e) {
            if (isDirectMediaUrl(href)) found.add(href);
          }
        }
      });
      
    } catch (domError) {
      // Fallback to regex if DOM parsing fails
      const mediaRegex = /(?:href|src|data-src|data-url)=["']([^"']+\.(?:mp4|mkv|webm|avi|mov|wmv)(?:\?[^"']*)?)["']/gi;
      let match;
      while ((match = mediaRegex.exec(html)) !== null) {
        try {
          found.add(new URL(match[1], pageUrl).href);
        } catch (e) {
          if (isDirectMediaUrl(match[1])) found.add(match[1]);
        }
      }
    }
    
    return Array.from(found).filter(url => isDirectMediaUrl(url));
  } catch (error) {
    console.error('Page extraction error:', error.message);
    return [];
  }
}

async function getFileInfo(url) {
  try {
    const response = await axios.head(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return {
      contentType: response.headers['content-type'] || '',
      contentLength: parseInt(response.headers['content-length'] || '0', 10) || 0,
      acceptRanges: response.headers['accept-ranges'] === 'bytes'
    };
  } catch (e) {
    return { contentType: '', contentLength: 0, acceptRanges: false };
  }
}

lite({
  pattern: 'movie',
  alias: ['film', 'mv', 'cinema', 'download'],
  react: '🎬',
  desc: 'Search and download movies via kavi-public-apis (legal content only).',
  category: 'download',
  use: '.movie <movie name>',
  filename: __filename
}, async (conn, mek, m, { from, reply, args, q }) => {
  try {
    const query = (q && q.trim()) || (args && args.length ? args.join(' ').trim() : '');
    if (!query) return reply('🎬 Please provide a movie name.\n\n📝 Example: `.movie Avengers Endgame`');

    await conn.sendMessage(from, { react: { text: '🔍', key: m.key } });
    await reply('🔍 Searching for movie...');

    // Search via API
    const apiResponse = await axios.get(KAVI_API_URL, { 
      params: { q: query }, 
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!apiResponse?.data) {
      await reply('❌ No response from movie API. Please try again later.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // Parse API response
    const data = apiResponse.data;
    let movieItem = null;
    
    // Try different response structures
    if (Array.isArray(data.results) && data.results.length) movieItem = data.results[0];
    else if (Array.isArray(data.data) && data.data.length) movieItem = data.data[0];
    else if (Array.isArray(data.items) && data.items.length) movieItem = data.items[0];
    else if (Array.isArray(data) && data.length) movieItem = data[0];
    else if (data.result) movieItem = data.result;
    else if (data.movie) movieItem = data.movie;
    else if (typeof data === 'object' && Object.keys(data).length) movieItem = data;

    if (!movieItem) {
      await reply('❌ No movies found for your search. Try different keywords.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    await conn.sendMessage(from, { react: { text: '📥', key: m.key } });
    await reply('📥 Found movie! Extracting download link...');

    // Extract direct download URL
    let downloadUrl = pickFileUrl(movieItem);
    
    // If no direct URL found, check if there's a page URL to scrape
    if (!downloadUrl) {
      const pageUrls = [];
      
      // Look for page URLs
      ['page_url', 'movie_page', 'watch_url', 'view_url', 'page', 'url'].forEach(key => {
        if (movieItem[key] && isHttpUrl(movieItem[key])) {
          pageUrls.push(movieItem[key]);
        }
      });
      
      // Try to extract from pages
      for (const pageUrl of pageUrls) {
        await reply(`🔄 Checking page for direct links...`);
        const extractedUrls = await extractDirectLinksFromPage(pageUrl);
        if (extractedUrls.length > 0) {
          downloadUrl = extractedUrls[0];
          break;
        }
      }
    }

    if (!downloadUrl) {
      await reply('❌ Could not find a direct download link for this movie. The movie might be protected or require authentication.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    if (!isDirectMediaUrl(downloadUrl)) {
      await reply('⚠️ The found link doesn\'t appear to be a direct media file. Cannot download streaming links or torrents.');
      await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
      return;
    }

    // Get file info
    const fileInfo = await getFileInfo(downloadUrl);
    const fileSizeMB = Math.round(fileInfo.contentLength / (1024 * 1024));
    
    if (fileInfo.contentLength > 0) {
      await reply(`📊 File size: ${fileSizeMB} MB\n⏬ Starting download...`);
    } else {
      await reply('⏬ Starting download (size unknown)...');
    }

    // Download file to temp location
    const tmpDir = os.tmpdir();
    const fileExt = path.extname(new URL(downloadUrl.split('?')[0]).pathname) || '.mp4';
    const movieTitle = (movieItem.title || movieItem.name || query).replace(/[^a-zA-Z0-9\s\-_.]/g, '').replace(/\s+/g, '_');
    const tempFileName = `${movieTitle}_${Date.now()}${fileExt}`;
    const tempFilePath = path.join(tmpDir, tempFileName);

    // Stream download
    const downloadResponse = await axios.get(downloadUrl, { 
      responseType: 'stream',
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(tempFilePath);
    await streamPipeline(downloadResponse.data, writer);

    // Verify file was downloaded
    const stats = fs.statSync(tempFilePath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    const finalSizeMB = Math.round(stats.size / (1024 * 1024));
    await reply(`✅ Download complete! File size: ${finalSizeMB} MB\n📤 Sending movie...`);

    // Read and send file
    const fileBuffer = fs.readFileSync(tempFilePath);
    const finalFileName = `${movieTitle}${fileExt}`;
    
    const contentType = fileInfo.contentType || 'video/mp4';
    
    // Send as video if it's a video file
    if (contentType.startsWith('video/') || ['.mp4', '.mkv', '.webm', '.avi'].includes(fileExt.toLowerCase())) {
      await conn.sendMessage(from, {
        video: fileBuffer,
        caption: `🎬 **${movieItem.title || movieItem.name || query}**\n📁 Size: ${finalSizeMB} MB\n🎞️ Format: ${fileExt.replace('.', '').toUpperCase()}\n\n⚠️ For legal viewing only`,
        fileName: finalFileName
      }, { quoted: mek });
    } else {
      // Send as document for other formats
      await conn.sendMessage(from, {
        document: fileBuffer,
        fileName: finalFileName,
        mimetype: contentType || 'application/octet-stream',
        caption: `🎬 **${movieItem.title || movieItem.name || query}**\n📁 Size: ${finalSizeMB} MB\n\n⚠️ For legal viewing only`
      }, { quoted: mek });
    }

    // Cleanup temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn('Temp file cleanup failed:', cleanupError.message);
    }

    await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
    
  } catch (error) {
    console.error('Movie download error:', error.message);
    
    let errorMsg = '❌ Failed to download movie. ';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMsg += 'Network connection issue.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg += 'Download timed out. Try again.';
    } else if (error.message.includes('403') || error.message.includes('401')) {
      errorMsg += 'Access denied. Movie might be protected.';
    } else if (error.message.includes('404')) {
      errorMsg += 'Movie file not found.';
    } else {
      errorMsg += 'Please try again or use a different movie name.';
    }
    
    await reply(errorMsg);
    await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
  }
});