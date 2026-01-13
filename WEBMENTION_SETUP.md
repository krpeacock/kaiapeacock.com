# Webmention Setup

This site now supports webmentions using Netlify Functions. Webmentions allow other websites to notify your site when they link to your content.

## How It Works

1. **Receiving Webmentions**: When another site links to your content, they can send a webmention to `/.netlify/functions/webmention`
2. **Verification**: The function verifies that the source URL actually contains a link to your target URL
3. **Storage**: Webmentions are stored and can be retrieved via GET request

## Current Implementation

The implementation uses **GitHub as storage** - webmentions are stored in `static/webmentions.json` in your repository. This is completely free and requires no additional infrastructure!

### Setting Up GitHub Storage

1. **Create a GitHub Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "Webmention Storage"
   - Select the `repo` scope (full control of private repositories)
   - Generate and copy the token

2. **Add the token to Netlify:**
   - Go to your Netlify site dashboard
   - Navigate to Site settings → Environment variables
   - Add a new variable:
     - Key: `GITHUB_TOKEN`
     - Value: (paste your token)
   - Save

3. **That's it!** The function will now automatically store webmentions in your GitHub repo.

The webmentions will be stored in `static/webmentions.json` in your repository, making them version-controlled and easily accessible.

### Security Considerations

The GitHub token is stored securely in Netlify's environment variables and is **never**:
- Logged to console
- Included in error messages
- Returned in API responses
- Exposed in the function code

The function code has been designed to prevent token leakage:
- Error messages are sanitized to exclude sensitive data
- Token is only used in Authorization headers to GitHub's API
- No token values are ever logged or returned

**Best practices:**
- Use a token with minimal required scopes (`repo` scope is needed)
- Regularly rotate your token (you can revoke and create a new one)
- Never commit the token to your repository
- If you suspect a leak, immediately revoke the token in GitHub settings

## API Endpoints

### POST `/.netlify/functions/webmention`

Receive a webmention.

**Request Body:**
```json
{
  "source": "https://example.com/post",
  "target": "https://kaiapeacock.com/blog/my-post"
}
```

**Response:**
- `202 Accepted`: Webmention received and verified
- `400 Bad Request`: Invalid request or verification failed
- `500 Internal Server Error`: Server error

### GET `/.netlify/functions/webmention?target=<URL>`

Retrieve webmentions for a specific URL.

**Query Parameters:**
- `target` (required): The URL to get webmentions for

**Response:**
```json
{
  "target": "https://kaiapeacock.com/blog/my-post",
  "webmentions": [
    {
      "source": "https://example.com/post",
      "target": "https://kaiapeacock.com/blog/my-post",
      "verified": true,
      "received": "2024-01-01T00:00:00.000Z",
      "title": "Example Post",
      "author": "John Doe"
    }
  ]
}
```

## Displaying Webmentions

To display webmentions on your pages, you can:

1. Fetch webmentions using the GET endpoint
2. Render them in your templates

Example JavaScript:
```javascript
async function loadWebmentions(targetUrl) {
  const response = await fetch(`/.netlify/functions/webmention?target=${encodeURIComponent(targetUrl)}`);
  const data = await response.json();
  return data.webmentions;
}
```

## Testing

### Automated Tests

Run the automated test suite:

```bash
node test-webmention.js
```

This will test:
- CORS handling
- GET requests (with and without parameters)
- POST requests (with various validation scenarios)
- Form-encoded data handling
- Error handling

### Test Against Deployed Site

To test against your deployed site:

```bash
node test-webmention.js --deployed https://kaiapeacock.com
```

### Manual Testing with curl

Test sending a webmention:

```bash
curl -X POST https://kaiapeacock.com/.netlify/functions/webmention \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "source=https://example.com/post&target=https://kaiapeacock.com/blog/my-post"
```

Or with JSON:

```bash
curl -X POST https://kaiapeacock.com/.netlify/functions/webmention \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://example.com/post",
    "target": "https://kaiapeacock.com/blog/my-post"
  }'
```

Test retrieving webmentions:

```bash
curl "https://kaiapeacock.com/.netlify/functions/webmention?target=https://kaiapeacock.com/blog/my-post"
```

### Interactive Test Page

You can also use the interactive test page (`test-webmention.html`) to test the webmention functionality in your browser. Just open it and use the form to send and retrieve webmentions.

## Next Steps

1. Set up the GitHub token (see instructions above)
2. Deploy to Netlify
3. Add webmention display to your article templates (see example template in `templates/partials/webmentions.html`)
4. Test with real webmentions from other sites

## Resources

- [Webmention Spec](https://www.w3.org/TR/webmention/)
- [Webmention.io](https://webmention.io/) - Alternative hosted solution
- [IndieWeb Webmention](https://indieweb.org/Webmention)
