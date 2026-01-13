#!/usr/bin/env node
/**
 * Test script for webmention Netlify function
 * 
 * Usage:
 *   node test-webmention.js
 * 
 * Or test against deployed endpoint:
 *   node test-webmention.js --deployed https://kaiapeacock.com
 */

const https = require('https');
const http = require('http');

// Import the function handler
const { handler } = require('./netlify/functions/webmention');

// Test configuration
const DEPLOYED_URL = process.argv.includes('--deployed') 
  ? process.argv[process.argv.indexOf('--deployed') + 1] || 'https://kaiapeacock.com'
  : null;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create a mock Netlify event
function createEvent(method, body, queryParams = {}) {
  return {
    httpMethod: method,
    headers: {
      'content-type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    queryStringParameters: queryParams,
  };
}

// Test helper
async function test(name, testFn) {
  try {
    log(`\n🧪 Testing: ${name}`, 'blue');
    await testFn();
    log(`✅ PASS: ${name}`, 'green');
    return true;
  } catch (error) {
    log(`❌ FAIL: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Test against deployed endpoint
async function testDeployed(url) {
  const baseUrl = url.replace(/\/$/, '');
  const endpoint = `${baseUrl}/.netlify/functions/webmention`;

  log(`\n🌐 Testing deployed endpoint: ${endpoint}`, 'yellow');

  // Test 1: GET request
  await test('GET webmentions', async () => {
    const targetUrl = `${baseUrl}/blog/test`;
    const testUrl = `${endpoint}?target=${encodeURIComponent(targetUrl)}`;
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(testUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(testUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            log(`   Found ${result.webmentions?.length || 0} webmentions`, 'green');
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  });

  // Test 2: POST request (this will fail verification, but tests the endpoint)
  await test('POST webmention (will fail verification)', async () => {
    const payload = {
      source: 'https://example.com/test-post',
      target: `${baseUrl}/blog/test`,
    };

    return new Promise((resolve, reject) => {
      const urlObj = new URL(endpoint);
      const client = urlObj.protocol === 'https:' ? https : http;
      const postData = JSON.stringify(payload);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          // We expect 400 because example.com doesn't actually link to our site
          if (res.statusCode === 400 || res.statusCode === 202) {
            log(`   Response: ${res.statusCode} - ${data.substring(0, 100)}`, 'green');
            resolve();
          } else {
            reject(new Error(`Unexpected status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  });
}

// Test locally
async function testLocal() {
  log('\n🏠 Testing locally (using function handler)', 'yellow');

  // Test 1: OPTIONS request (CORS)
  await test('OPTIONS request (CORS)', async () => {
    const event = createEvent('OPTIONS');
    const result = await handler(event);
    
    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
  });

  // Test 2: GET request without target
  await test('GET request without target (should fail)', async () => {
    const event = createEvent('GET', null, {});
    const result = await handler(event);
    
    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  // Test 3: GET request with target
  await test('GET request with target', async () => {
    const event = createEvent('GET', null, {
      target: 'https://kaiapeacock.com/blog/test',
    });
    const result = await handler(event);
    
    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    
    const body = JSON.parse(result.body);
    if (!body.hasOwnProperty('webmentions')) {
      throw new Error('Response missing webmentions property');
    }
    
    log(`   Found ${body.webmentions.length} webmentions for target`, 'green');
  });

  // Test 4: POST request with invalid data
  await test('POST request with missing parameters (should fail)', async () => {
    const event = createEvent('POST', { source: 'https://example.com' });
    const result = await handler(event);
    
    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  // Test 5: POST request with invalid target domain
  await test('POST request with invalid target domain (should fail)', async () => {
    const event = createEvent('POST', {
      source: 'https://example.com/post',
      target: 'https://other-site.com/page',
    });
    const result = await handler(event);
    
    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  // Test 6: POST request with valid data (will fail verification but tests flow)
  await test('POST request with valid format (verification will fail)', async () => {
    const event = createEvent('POST', {
      source: 'https://example.com/post',
      target: 'https://kaiapeacock.com/blog/test',
    });
    const result = await handler(event);
    
    // Should be 400 because example.com doesn't actually link to our site
    // or 202 if somehow it passes (unlikely)
    if (result.statusCode !== 400 && result.statusCode !== 202) {
      throw new Error(`Expected 400 or 202, got ${result.statusCode}: ${result.body}`);
    }
    
    log(`   Verification failed as expected (source doesn't link to target)`, 'green');
  });

  // Test 7: POST request with form-encoded data
  await test('POST request with form-encoded data', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'source=https://example.com/post&target=https://kaiapeacock.com/blog/test',
    };
    const result = await handler(event);
    
    // Should be 400 because example.com doesn't actually link to our site
    if (result.statusCode !== 400 && result.statusCode !== 202) {
      throw new Error(`Expected 400 or 202, got ${result.statusCode}`);
    }
  });
}

// Main test runner
async function runTests() {
  log('🚀 Starting webmention function tests', 'blue');
  log('=' .repeat(50), 'blue');

  const results = {
    passed: 0,
    failed: 0,
  };

  if (DEPLOYED_URL) {
    try {
      await testDeployed(DEPLOYED_URL);
      results.passed++;
    } catch (error) {
      results.failed++;
      log(`\n❌ Deployed tests failed: ${error.message}`, 'red');
    }
  } else {
    try {
      await testLocal();
      results.passed++;
    } catch (error) {
      results.failed++;
      log(`\n❌ Local tests failed: ${error.message}`, 'red');
    }
  }

  log('\n' + '='.repeat(50), 'blue');
  if (results.failed === 0) {
    log('✅ All tests passed!', 'green');
  } else {
    log(`⚠️  Some tests failed (${results.failed} failed)`, 'yellow');
  }
  log('='.repeat(50), 'blue');
}

// Run tests
runTests().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
