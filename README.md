# Domo AI Agentguide - Webflow Cloud Embed

This repository contains the Webflow Cloud serverless function for embedding the Domo AI Agentguide application.

## 🚀 Quick Setup

### 1. Webflow Cloud Project Configuration

When creating your Webflow Cloud project:
- **Name**: `Domo AI Agentguide Embed`
- **Description**: `Serverless functions for embedding Domo AI Use Case Chat`
- **GitHub Repository**: Link this repository
- **Directory Path**: Leave empty (uses repo root)

### 2. Environment Variables

Set these as **Secrets** in Webflow Cloud:

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMO_CLIENT_ID` | OAuth Client ID from Domo | `533cbc9b-7ce3-4acb-bbfe-2002c132cb9f` |
| `DOMO_CLIENT_SECRET` | OAuth Client Secret from Domo | `your-secret-key-here` |
| `DOMO_BASE_URL` | Your Domo instance URL | `https://yourcompany.domo.com` |
| `DOMO_EMBED_ID` | Embed ID from your AI Agentguide card | `MZLNO` |
| `DOMO_EMBED_TYPE` | Type of embed (optional) | `card` (default for pro-code apps) |

**Note**: Uses service account OAuth authentication to generate secure embed tokens.

### 3. Getting Your Domo Embed ID

1. Open your Domo instance
2. Navigate to your AI Agentguide card
3. Click the card's **3-dot menu** → **Embed**
4. Copy the **Embed ID** (e.g., `MZLNO`) from the embed configuration
5. Ensure the card is set to **"Public"** in the embed settings

### 4. Creating Domo OAuth Application

1. Log into Domo as admin
2. Go to **Admin** → **Authentication** → **API Clients**
3. Click **Create API Client**
4. Fill out:
   - **Name**: `Webflow AI Agentguide Embed V2`
   - **Description**: `OAuth client for embedding AI Agentguide on Webflow`
   - **Scopes**: Check `User`, `Account`, `Data`
5. Save the Client ID and Secret for environment variables
6. Ensure the service account has access to the AI Agentguide card

## 📁 Repository Structure

```
/
├── functions/
│   └── embed-domo-app.js     # Webflow Cloud function
├── README.md                 # This file
└── package.json              # Project configuration
```

## 🔧 Function Endpoint

After deployment, your function will be available at:
```
https://your-site.webflow.io/.wf/functions/embed-domo-app
```

## 💻 Webflow Site Integration

Add this HTML to your Webflow page where you want the app to appear:

```html
<div id="domo-embed-container"></div>
```

Then add this JavaScript to your page's custom code:

```javascript
// Update with your actual function URL
const CLOUD_FUNCTION_URL = 'https://your-site.webflow.io/.wf/functions/embed-domo-app';

// Integration code (see webflow-integration.js in main project)
```

## 🔒 Security Features

- ✅ Server-side OAuth authentication with service account
- ✅ Credentials stored as Webflow Cloud secrets
- ✅ CORS protection
- ✅ Error handling and fallbacks
- ✅ Secure embed token generation

## 🐛 Troubleshooting

### Common Issues

**"Server configuration error"**
- Check all environment variables are set correctly in Webflow Cloud secrets
- Ensure variable names match exactly (case-sensitive)
- Verify OAuth client ID and secret are correct

**"OAuth request failed"**
- Verify Client ID and Secret are correct
- Check OAuth app has correct scopes (`User`, `Account`, `Data`)
- Ensure service account has access to the AI Agentguide card

**"Embed token request failed"**
- Verify DOMO_EMBED_ID is the correct Embed ID (not regular card ID)
- Ensure service account that created the OAuth client has access to the card
- Check that the card is shared with the service account
- Verify using correct endpoint: `/v1/stories/embed/auth` (not `/v1/cards/embed/auth`)

### Debug Mode

Add this to enable detailed logging:
```javascript
window.DOMO_EMBED_DEBUG = true;
```

## 📋 Deployment Checklist

- [ ] GitHub repository created and linked to Webflow Cloud
- [ ] DOMO_EMBED_ID configured as secret in Webflow Cloud
- [ ] Domo card set to "Public" in embed settings
- [ ] Function deployed successfully
- [ ] Test function endpoint returns HTML with embedded card
- [ ] Webflow site has container div with correct ID
- [ ] Integration JavaScript added with correct function URL
- [ ] Site published and tested end-to-end

## 🆘 Support

For issues:
1. Check Webflow Cloud function logs
2. Verify all environment variables (CLIENT_ID, CLIENT_SECRET, BASE_URL, EMBED_ID)
3. Test OAuth credentials directly in Domo
4. Ensure service account has access to the card
5. Review browser console for errors

## 📜 License

This project is for internal use with Domo platform integration.