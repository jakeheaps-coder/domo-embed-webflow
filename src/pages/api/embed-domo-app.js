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
      body: 'grant_type=client_credentials&scope=user%20account%20data'
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
          permissions: ['READ', 'FILTER', 'EXPORT']
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
          embedIdUsed: DOMO_EMBED_ID,
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

    // Step 3: Return simple iframe embed with authenticated token (like your format)
    const embedUrl = `https://embed.domo.com/cards/${DOMO_EMBED_ID}?embedToken=${embedTokenData.authentication}`;

    // Return simple iframe HTML in your preferred format
    const iframeHtml = `<iframe src="${embedUrl}" width="600" height="600" marginheight="0" marginwidth="0" frameborder="0" title="Domo AI Agentguide"></iframe>`;

    return new Response(iframeHtml, {
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