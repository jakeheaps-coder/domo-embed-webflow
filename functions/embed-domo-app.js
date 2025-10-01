/**
 * Webflow Cloud Function: Embed Domo AI Use Case Chat App
 *
 * This serverless function handles:
 * 1. OAuth authentication with Domo using client credentials
 * 2. Generate embed authentication token
 * 3. Return HTML with embedded Domo app iframe
 *
 * Environment Variables Required (set as Secrets in Webflow Cloud):
 * - DOMO_CLIENT_ID: OAuth client ID from Domo
 * - DOMO_CLIENT_SECRET: OAuth client secret from Domo
 * - DOMO_BASE_URL: Base Domo instance URL (e.g., https://company.domo.com)
 * - DOMO_APP_ID: The ID of the ai-use-case-chat-combined app
 */

export default async function handler(request, context) {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Get environment variables
    const {
      DOMO_CLIENT_ID,
      DOMO_CLIENT_SECRET,
      DOMO_BASE_URL,
      DOMO_APP_ID
    } = context.env;

    // Validate required environment variables
    if (!DOMO_CLIENT_ID || !DOMO_CLIENT_SECRET || !DOMO_BASE_URL || !DOMO_APP_ID) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required Domo credentials'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 1: Get OAuth access token from Domo
    console.log('Getting OAuth access token from Domo...');
    const accessToken = await getDomoAccessToken(
      DOMO_BASE_URL,
      DOMO_CLIENT_ID,
      DOMO_CLIENT_SECRET
    );

    if (!accessToken) {
      throw new Error('Failed to obtain Domo access token');
    }

    // Step 2: Generate embed authentication token
    console.log('Generating embed authentication token...');
    const embedToken = await generateEmbedToken(
      DOMO_BASE_URL,
      accessToken,
      DOMO_APP_ID
    );

    if (!embedToken) {
      throw new Error('Failed to generate embed token');
    }

    // Step 3: Generate HTML with embedded iframe
    console.log('Generating embedded HTML...');
    const embedHtml = generateEmbedHtml(
      DOMO_BASE_URL,
      DOMO_APP_ID,
      embedToken
    );

    // Return HTML response
    return new Response(embedHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    });

  } catch (error) {
    console.error('Error in embed-domo-app function:', error);

    // Return error HTML with fallback content
    const errorHtml = generateErrorHtml(error.message);

    return new Response(errorHtml, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    });
  }
}

/**
 * Get OAuth access token from Domo using client credentials flow
 */
async function getDomoAccessToken(baseUrl, clientId, clientSecret) {
  try {
    const tokenUrl = `${baseUrl}/oauth/token`;

    // Encode credentials for basic auth
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=data%20dashboard'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth token request failed:', response.status, errorText);
      throw new Error(`OAuth request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    console.log('Successfully obtained access token');

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting Domo access token:', error);
    throw error;
  }
}

/**
 * Generate embed authentication token for the specific Domo app
 */
async function generateEmbedToken(baseUrl, accessToken, appId) {
  try {
    const embedUrl = `${baseUrl}/api/content/v2/mobile`;

    // Embed request payload
    const embedPayload = {
      sessionLength: 3600, // 1 hour session
      authorizations: [
        {
          token: appId,
          permissions: ['READ', 'FILTER']
        }
      ]
    };

    const response = await fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(embedPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Embed token request failed:', response.status, errorText);
      throw new Error(`Embed token request failed: ${response.status}`);
    }

    const embedData = await response.json();
    console.log('Successfully generated embed token');

    return embedData.authentication;
  } catch (error) {
    console.error('Error generating embed token:', error);
    throw error;
  }
}

/**
 * Generate HTML with embedded Domo app iframe
 */
function generateEmbedHtml(baseUrl, appId, embedToken) {
  const embedUrl = `${baseUrl}/content/${appId}?embedId=${embedToken}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Use Case Chat</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }

        .embed-container {
            position: relative;
            width: 100%;
            height: 100vh;
            min-height: 600px;
        }

        .embed-iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }

        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f8fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            z-index: 10;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e1e5e9;
            border-top: 4px solid #1B8CE3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        .loading-text {
            color: #53565A;
            font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Hide loading overlay after iframe loads */
        .loaded .loading-overlay {
            display: none;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .embed-container {
                min-height: 500px;
            }
        }
    </style>
</head>
<body>
    <div class="embed-container" id="embedContainer">
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading AI Use Case Chat...</div>
        </div>
        <iframe
            id="domoEmbed"
            class="embed-iframe"
            src="${embedUrl}"
            allow="fullscreen"
            allowfullscreen
            onload="handleIframeLoad()"
            onerror="handleIframeError()"
        ></iframe>
    </div>

    <script>
        // Handle iframe load event
        function handleIframeLoad() {
            console.log('Domo app loaded successfully');
            document.getElementById('embedContainer').classList.add('loaded');
        }

        // Handle iframe error
        function handleIframeError() {
            console.error('Failed to load Domo app');
            const overlay = document.getElementById('loadingOverlay');
            overlay.innerHTML = \`
                <div style="text-align: center; color: #E94B35;">
                    <div style="font-size: 18px; margin-bottom: 8px;">⚠️ Unable to load app</div>
                    <div style="font-size: 14px;">Please refresh the page or try again later.</div>
                </div>
            \`;
        }

        // Timeout fallback - hide loading after 10 seconds regardless
        setTimeout(() => {
            const container = document.getElementById('embedContainer');
            if (!container.classList.contains('loaded')) {
                container.classList.add('loaded');
                console.warn('Loading timeout - hiding overlay');
            }
        }, 10000);

        // Send height updates to parent window (if embedded in iframe)
        function updateParentHeight() {
            if (window.parent !== window) {
                const height = Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );
                window.parent.postMessage({
                    type: 'resize',
                    height: height
                }, '*');
            }
        }

        // Update height on load and resize
        window.addEventListener('load', updateParentHeight);
        window.addEventListener('resize', updateParentHeight);
    </script>
</body>
</html>`;
}

/**
 * Generate error HTML when embedding fails
 */
function generateErrorHtml(errorMessage) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Use Case Chat - Error</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #f8fafb;
            font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .error-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            padding: 20px;
            text-align: center;
        }

        .error-content {
            max-width: 400px;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }

        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .error-title {
            font-size: 20px;
            font-weight: 600;
            color: #2A2C2E;
            margin-bottom: 12px;
        }

        .error-message {
            font-size: 14px;
            color: #53565A;
            line-height: 1.5;
            margin-bottom: 24px;
        }

        .error-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .btn {
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            border: none;
        }

        .btn-primary {
            background: #1B8CE3;
            color: white;
        }

        .btn-secondary {
            background: #E4E5E7;
            color: #53565A;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-content">
            <div class="error-icon">⚠️</div>
            <div class="error-title">Unable to Load AI Use Case Chat</div>
            <div class="error-message">
                We're having trouble loading the application right now. This might be a temporary issue.
                <br><br>
                <small>Error: ${errorMessage}</small>
            </div>
            <div class="error-actions">
                <button class="btn btn-primary" onclick="window.location.reload()">
                    Try Again
                </button>
                <a class="btn btn-secondary" href="mailto:support@company.com">
                    Contact Support
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
}