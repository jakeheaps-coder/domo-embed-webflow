/**
 * Webflow Cloud Function: Embed Domo AI Use Case Chat App
 *
 * This serverless function handles:
 * 1. OAuth authentication with Domo using service account credentials
 * 2. Generate embed authentication token
 * 3. Return iframe embed with authenticated token
 *
 * Environment Variables Required (set as Secrets in Webflow Cloud):
 * - DOMO_CLIENT_ID: OAuth client ID from Domo
 * - DOMO_CLIENT_SECRET: OAuth client secret from Domo
 * - DOMO_BASE_URL: Base Domo instance URL (e.g., https://company.domo.com)
 * - DOMO_EMBED_ID: The embed ID from the card's embed configuration (e.g., MZLNO)
 * - DOMO_EMBED_TYPE: Type of embed (page/dashboard/card) - use "card" for pro-code apps (optional)
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
      DOMO_EMBED_ID,
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
    if (!DOMO_CLIENT_ID || !DOMO_CLIENT_SECRET || !DOMO_BASE_URL || !DOMO_EMBED_ID) {
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

    // Step 1: Get access token from Domo (using official pattern)
    console.log('Requesting access token from Domo...');
    const accessTokenUrl = 'https://api.domo.com/oauth/token?grant_type=client_credentials&scope=data%20audit%20user%20dashboard';

    const authString = btoa(`${DOMO_CLIENT_ID}:${DOMO_CLIENT_SECRET}`);

    const tokenResponse = await fetch(accessTokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
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
    console.log('Access token received successfully');

    // Step 2: Generate embed token using official endpoint for CARDS (following official embed.js pattern)
    console.log('Generating embed token...');
    const embedTokenUrl = 'https://api.domo.com/v1/cards/embed/auth';

    const embedRequestBody = {
      sessionLength: 1440, // 24 hours in minutes
      authorizations: [
        {
          token: DOMO_EMBED_ID, // Use embedId as token (official pattern)
          permissions: ['READ', 'FILTER', 'EXPORT']
          // Omit empty filters, policies, etc. to avoid deserialization issues
        }
      ]
    };

    console.log('Embed token request:', {
      url: embedTokenUrl,
      embedId: DOMO_EMBED_ID,
      hasAccessToken: !!tokenData.access_token,
      requestBody: embedRequestBody
    });

    const embedTokenResponse = await fetch(embedTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': '*/*'
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
          embedIdUsed: DOMO_EMBED_ID,
          embedEndpoint: embedTokenUrl,
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

    // Step 3: Return iframe with embed token passed in MULTIPLE ways to ensure delivery
    const embedToken = embedTokenData.authentication;

    // Try multiple URL parameter approaches
    const embedUrl = `https://embed.domo.com/cards/${DOMO_EMBED_ID}?embedTokenValue=${embedToken}&embedToken=${embedToken}&token=${embedToken}&auth=${embedToken}#embedTokenValue=${embedToken}&embedToken=${embedToken}&token=${embedToken}`;

    // Create iframe HTML with multiple token passing strategies
    const iframeHtml = `
    <script>
      console.log('🚀 MULTI-STRATEGY EMBED TOKEN PASSING ACTIVATED');
      console.log('📍 Strategy 1: URL parameters (embedTokenValue, embedToken, token, auth)');
      console.log('📍 Strategy 2: Hash fragments (embedTokenValue, embedToken, token)');
      console.log('📍 Strategy 3: Cookies (domoEmbedToken, embedToken, token)');
      console.log('📍 Strategy 4: localStorage/sessionStorage');
      console.log('📍 Strategy 5: PostMessage to iframe');

      // Set multiple cookies as backup
      const tokenValue = '${embedToken}';
      document.cookie = 'domoEmbedToken=' + tokenValue + '; path=/; max-age=86400; SameSite=None; Secure';
      document.cookie = 'embedToken=' + tokenValue + '; path=/; max-age=86400; SameSite=None; Secure';
      document.cookie = 'token=' + tokenValue + '; path=/; max-age=86400; SameSite=None; Secure';
      document.cookie = 'domo_embed_auth=' + tokenValue + '; path=/; max-age=86400; SameSite=None; Secure';

      // Set localStorage/sessionStorage as backup
      try {
        localStorage.setItem('domoEmbedToken', tokenValue);
        localStorage.setItem('embedToken', tokenValue);
        localStorage.setItem('token', tokenValue);
        sessionStorage.setItem('domoEmbedToken', tokenValue);
        sessionStorage.setItem('embedToken', tokenValue);
        sessionStorage.setItem('token', tokenValue);
      } catch(e) {
        console.log('Storage not available:', e.message);
      }

      // PostMessage to iframe after it loads
      window.addEventListener('load', function() {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          setTimeout(() => {
            try {
              iframe.contentWindow.postMessage({
                type: 'EMBED_TOKEN',
                embedToken: tokenValue,
                embedTokenValue: tokenValue,
                token: tokenValue
              }, '*');
              console.log('📨 PostMessage sent to iframe with embed token');
            } catch(e) {
              console.log('PostMessage failed:', e.message);
            }
          }, 1000);
        }
      });

      console.log('🔗 Iframe URL with all strategies applied');
      console.log('Token preview:', tokenValue.substring(0, 20) + '...');
    </script>
    <iframe src="${embedUrl}" width="600" height="600" marginheight="0" marginwidth="0" frameborder="0" title="Domo AI Agentguide"></iframe>`;

    console.log('Returning iframe with MULTI-STRATEGY embed token passing');
    console.log('Strategies: URL params, hash fragments, cookies, localStorage, postMessage');
    console.log('Full embedUrl:', embedUrl);

    return new Response(iframeHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Set multiple cookies in response headers as additional backup
        'Set-Cookie': [
          `domoEmbedToken=${embedToken}; path=/; max-age=86400; SameSite=None; Secure`,
          `embedToken=${embedToken}; path=/; max-age=86400; SameSite=None; Secure`,
          `token=${embedToken}; path=/; max-age=86400; SameSite=None; Secure`
        ].join(', '),
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