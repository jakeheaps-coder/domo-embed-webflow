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
 * - DOMO_CARD_ID: The card ID of the pro-code app card
 * - DOMO_EMBED_TYPE: Type of embed (page/dashboard/card) - use "card" for pro-code apps
 */

export async function GET({ request, locals }) {
  return await handleRequest(request, locals);
}

export async function POST({ request, locals }) {
  return await handleRequest(request, locals);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

async function handleRequest(request, locals) {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Get environment variables from Webflow Cloud - try multiple approaches
    const runtimeEnv = locals.runtime?.env || {};
    const processEnv = process.env || {};

    // Merge environment sources (runtime takes precedence)
    const env = { ...processEnv, ...runtimeEnv };

    const {
      DOMO_CLIENT_ID,
      DOMO_CLIENT_SECRET,
      DOMO_BASE_URL,
      DOMO_CARD_ID,
      DOMO_EMBED_TYPE = 'card' // Default to 'card' for pro-code apps
    } = env;

    // Debug environment variable access
    console.log('Environment debug:', {
      hasRuntime: !!locals.runtime,
      hasRuntimeEnv: !!locals.runtime?.env,
      hasProcessEnv: !!process.env,
      runtimeKeys: Object.keys(runtimeEnv),
      processKeys: Object.keys(processEnv).filter(k => k.startsWith('DOMO_')),
      clientIdSource: runtimeEnv.DOMO_CLIENT_ID ? 'runtime' : processEnv.DOMO_CLIENT_ID ? 'process' : 'none'
    });

    // Validate required environment variables
    if (!DOMO_CLIENT_ID || !DOMO_CLIENT_SECRET || !DOMO_BASE_URL || !DOMO_CARD_ID) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required Domo credentials'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Step 1: Get OAuth token from Domo (using official API endpoint)
    console.log('Requesting OAuth token from Domo...');
    const tokenUrl = 'https://api.domo.com/oauth/token';

    const authString = btoa(`${DOMO_CLIENT_ID}:${DOMO_CLIENT_SECRET}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=data%20audit%20user%20dashboard'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('OAuth token request failed:', tokenResponse.status, tokenResponse.statusText, errorText);
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          details: `Failed to get OAuth token: ${tokenResponse.status}`,
          clientIdFound: DOMO_CLIENT_ID ? `Yes (${DOMO_CLIENT_ID.substring(0, 8)}...)` : 'No',
          baseUrlFound: DOMO_BASE_URL || 'No',
          domoResponse: errorText
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('OAuth token received successfully');

    // Step 2: Generate embed authentication token (using official API endpoint for cards)
    console.log('Generating embed authentication token...');
    const embedTokenUrl = 'https://api.domo.com/v1/cards/embed/auth';

    const embedRequestBody = {
      sessionLength: 240, // 4 hours in minutes
      authorizations: [
        {
          token: 'embed-auth',
          permissions: ['READ']
        }
      ]
    };

    console.log('Embed token request:', {
      url: embedTokenUrl,
      cardId: DOMO_CARD_ID,
      hasAccessToken: !!tokenData.access_token,
      requestBody: embedRequestBody
    });

    const embedTokenResponse = await fetch(embedTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(embedRequestBody)
    });

    if (!embedTokenResponse.ok) {
      const embedErrorText = await embedTokenResponse.text();
      console.error('Embed token request failed:', embedTokenResponse.status, embedTokenResponse.statusText, embedErrorText);
      return new Response(
        JSON.stringify({
          error: 'Embed token generation failed',
          details: `Failed to generate embed token: ${embedTokenResponse.status}`,
          cardIdUsed: DOMO_CARD_ID,
          embedEndpoint: 'https://api.domo.com/v1/cards/embed/auth',
          domoEmbedResponse: embedErrorText
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const embedTokenData = await embedTokenResponse.json();
    console.log('Embed token generated successfully');

    // Step 3: Return HTML with embedded Domo card
    const embedUrl = `${DOMO_BASE_URL}/embed/cards/${DOMO_CARD_ID}?embedToken=${embedTokenData.authentication}`;

    const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agentguide - Domo Embed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .embed-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            min-height: 80vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        iframe {
            width: 100%;
            height: calc(80vh - 80px);
            border: none;
            display: block;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            font-size: 16px;
            color: #666;
        }
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            iframe {
                height: calc(90vh - 80px);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="embed-container">
            <div class="header">
                <h1>🤖 AI Agentguide</h1>
                <p>Powered by Domo - Intelligent Business Analytics</p>
            </div>
            <div class="loading" id="loading">
                Loading AI Agentguide...
            </div>
            <iframe
                src="${embedUrl}"
                title="Domo AI Agentguide"
                onload="document.getElementById('loading').style.display='none'"
                onerror="document.getElementById('loading').innerHTML='Failed to load. Please refresh the page.'"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation">
            </iframe>
        </div>
    </div>

    <script>
        // Auto-refresh token before expiration (4 hours)
        setTimeout(() => {
            console.log('Refreshing embed token...');
            window.location.reload();
        }, 3.5 * 60 * 60 * 1000); // Refresh after 3.5 hours

        // Handle iframe loading errors
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'domo-embed-error') {
                console.error('Domo embed error:', event.data.message);
                document.getElementById('loading').innerHTML = 'Error loading AI Agentguide. Please contact support.';
            }
        });
    </script>
</body>
</html>`;

    return new Response(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Function execution error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}