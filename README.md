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
| `DOMO_CLIENT_ID` | OAuth Client ID from Domo | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `DOMO_CLIENT_SECRET` | OAuth Client Secret from Domo | `your-secret-key-here` |
| `DOMO_BASE_URL` | Your Domo instance URL | `https://yourcompany.domo.com` |
| `DOMO_APP_ID` | ID of your AI Agentguide app | `123456789` |
| `DOMO_EMBED_TYPE` | Type of embed (optional) | `card` (default for pro-code apps) |

### 3. Getting Your Domo App ID

1. Open your Domo instance
2. Navigate to your AI Agentguide app
3. Look at the URL: `https://yourcompany.domo.com/page/123456789`
4. The number at the end (`123456789`) is your `DOMO_APP_ID`

### 4. Creating Domo OAuth Application

1. Log into Domo as admin
2. Go to **Admin** → **Authentication** → **API Clients**
3. Click **Create API Client**
4. Fill out:
   - **Name**: `Webflow AI Agentguide Embed`
   - **Description**: `OAuth client for embedding AI Agentguide on Webflow`
   - **Scopes**: Check `Data` and `Dashboard`
5. Save the Client ID and Secret for environment variables

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

- ✅ Server-side OAuth authentication
- ✅ Credentials stored as Webflow Cloud secrets
- ✅ CORS protection
- ✅ Error handling and fallbacks
- ✅ Secure token generation

## 🐛 Troubleshooting

### Common Issues

**"Server configuration error"**
- Check all environment variables are set correctly
- Ensure variables are marked as "Secrets"
- Verify variable names match exactly (case-sensitive)

**"OAuth request failed"**
- Verify Client ID and Secret are correct
- Check OAuth app has correct scopes (`data` and `dashboard`)
- Ensure DOMO_BASE_URL doesn't have trailing slash

**"Embed token request failed"**
- Verify DOMO_APP_ID is correct
- Check app exists and is accessible
- Ensure OAuth app has appropriate permissions

### Debug Mode

Add this to enable detailed logging:
```javascript
window.DOMO_EMBED_DEBUG = true;
```

## 📋 Deployment Checklist

- [ ] GitHub repository created and linked to Webflow Cloud
- [ ] Environment variables configured as secrets
- [ ] Function deployed successfully
- [ ] Test function endpoint returns HTML
- [ ] Webflow site has container div with correct ID
- [ ] Integration JavaScript added with correct function URL
- [ ] Site published and tested end-to-end

## 🆘 Support

For issues:
1. Check Webflow Cloud function logs
2. Verify all environment variables
3. Test OAuth credentials directly in Domo
4. Review browser console for errors

## 📜 License

This project is for internal use with Domo platform integration.