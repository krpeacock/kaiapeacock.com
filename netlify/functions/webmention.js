// Netlify function to receive webmentions
// Webmention spec: https://www.w3.org/TR/webmention/

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Helper to fetch URL content
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Verify that source URL contains a link to target URL
async function verifyWebmention(source, target) {
  try {
    const response = await fetchURL(source);
    const html = response.body;
    
    // Check if the HTML contains a link to the target URL
    // This is a simple check - in production you might want more sophisticated parsing
    const targetUrl = new URL(target);
    const targetPath = targetUrl.pathname;
    
    // Check for various link formats
    const linkPatterns = [
      new RegExp(`href=["']${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'),
      new RegExp(`href=["']${targetPath}["']`, 'i'),
      new RegExp(`href=["']${targetUrl.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'),
    ];
    
    return linkPatterns.some(pattern => pattern.test(html));
  } catch (error) {
    console.error('Error verifying webmention:', error);
    return false;
  }
}

// GitHub API storage - completely free!
// Uses GitHub API to store webmentions in a JSON file in the repo
const GITHUB_REPO = 'krpeacock/kaiapeacock.com';
const GITHUB_FILE_PATH = 'static/webmentions.json';
const GITHUB_BRANCH = 'main';

// Fetch file from GitHub using raw content API
async function loadWebmentionsFromGitHub() {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_FILE_PATH}`;
    const response = await fetchURL(url);
    return JSON.parse(response.body);
  } catch (error) {
    // File doesn't exist yet or network error
    console.log('No existing webmentions file found, starting fresh');
    return {};
  }
}

// Save webmentions to GitHub using GitHub API
async function saveWebmentionsToGitHub(webmentions) {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    // Don't log that token is missing - just fail silently
    return false;
  }

  try {
    // First, get the current file SHA (required for updates)
    let sha = null;
    try {
      const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
      const getResponse = await fetchURLWithAuth(getUrl, githubToken, 'GET');
      sha = getResponse.sha;
    } catch (error) {
      // File doesn't exist yet, that's okay
      console.log('File does not exist yet, will create new file');
    }

    // Prepare the file content
    const content = JSON.stringify(webmentions, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');

    // Create or update the file
    const updateUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    const payload = {
      message: `Update webmentions - ${new Date().toISOString()}`,
      content: encodedContent,
      branch: GITHUB_BRANCH,
    };

    if (sha) {
      payload.sha = sha;
    }

    await fetchURLWithAuth(updateUrl, githubToken, 'PUT', JSON.stringify(payload));
    return true;
  } catch (error) {
    // Log error but ensure token is never included
    console.error('Error saving to GitHub:', error.message || 'Unknown error');
    return false;
  }
}

// Helper to make authenticated GitHub API requests
function fetchURLWithAuth(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Netlify-Webmention-Function',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          // Sanitize error message to avoid leaking token
          // Parse error response but don't include full data in error
          let errorMessage = `GitHub API error: ${res.statusCode}`;
          try {
            const errorData = JSON.parse(data);
            if (errorData.message && !errorData.message.includes('token')) {
              errorMessage += ` - ${errorData.message}`;
            }
          } catch (e) {
            // If we can't parse, just use status code
          }
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      // Don't include token in error messages
      reject(new Error('GitHub API request failed'));
    });
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Load webmentions - try GitHub first, fallback to /tmp
async function loadWebmentions() {
  try {
    return await loadWebmentionsFromGitHub();
  } catch (error) {
    console.error('Error loading from GitHub, trying local fallback:', error);
    // Fallback to local storage
    try {
      const storagePath = path.join('/tmp', 'webmentions.json');
      if (fs.existsSync(storagePath)) {
        const data = fs.readFileSync(storagePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (localError) {
      console.error('Error loading local fallback:', localError);
    }
  }
  return {};
}

// Save webmentions - try GitHub first, fallback to /tmp
async function saveWebmentions(webmentions) {
  // Try GitHub first if token is available
  if (process.env.GITHUB_TOKEN) {
    const saved = await saveWebmentionsToGitHub(webmentions);
    if (saved) {
      return true;
    }
  }

  // Fallback to local storage
  try {
    const storagePath = path.join('/tmp', 'webmentions.json');
    fs.writeFileSync(storagePath, JSON.stringify(webmentions, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving webmentions:', error);
    return false;
  }
}

// Extract metadata from source URL (title, author, etc.)
async function extractMetadata(source) {
  try {
    const response = await fetchURL(source);
    const html = response.body;
    
    // Simple extraction - in production you might want to use a proper HTML parser
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                      html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);
    
    return {
      title: titleMatch ? titleMatch[1].trim() : null,
      author: authorMatch ? authorMatch[1].trim() : null,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {};
  }
}

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // GET request - return webmentions for a specific URL
  if (event.httpMethod === 'GET') {
    const target = event.queryStringParameters?.target;
    
    if (!target) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing target parameter' }),
      };
    }

    const webmentions = await loadWebmentions();
    const targetWebmentions = webmentions[target] || [];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        target,
        webmentions: targetWebmentions,
      }),
    };
  }

  // POST request - receive a webmention
  if (event.httpMethod === 'POST') {
    try {
      // Parse body - support both JSON and form-encoded (webmention spec uses form-encoded)
      let source, target;
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      
      if (contentType.includes('application/json')) {
        const body = JSON.parse(event.body || '{}');
        source = body.source;
        target = body.target;
      } else {
        // Parse form-encoded data (standard webmention format)
        const params = new URLSearchParams(event.body || '');
        source = params.get('source');
        target = params.get('target');
      }

      if (!source || !target) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required parameters: source and target are required' 
          }),
        };
      }

      // Validate URLs
      let sourceUrl, targetUrl;
      try {
        sourceUrl = new URL(source);
        targetUrl = new URL(target);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid URL format' }),
        };
      }

      // Verify that target is our domain
      const siteDomain = 'kaiapeacock.com';
      if (!targetUrl.hostname.includes(siteDomain)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Target must be on ' + siteDomain }),
        };
      }

      // Verify the webmention
      const isValid = await verifyWebmention(source, target);
      if (!isValid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Source URL does not contain a link to target URL' 
          }),
        };
      }

      // Extract metadata
      const metadata = await extractMetadata(source);

      // Create webmention object
      const webmention = {
        source,
        target,
        verified: true,
        received: new Date().toISOString(),
        ...metadata,
      };

      // Load existing webmentions
      const webmentions = await loadWebmentions();
      
      // Initialize array for this target if it doesn't exist
      if (!webmentions[target]) {
        webmentions[target] = [];
      }

      // Check if this webmention already exists
      const exists = webmentions[target].some(
        wm => wm.source === source
      );

      if (!exists) {
        webmentions[target].push(webmention);
        await saveWebmentions(webmentions);
      }

      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          message: 'Webmention received',
          webmention: webmention,
        }),
      };
    } catch (error) {
      console.error('Error processing webmention:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
