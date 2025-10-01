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
          permissions: ['READ', 'FILTER', 'EXPORT'],
          filters: [], // Empty filters for now
          policies: [], // Empty policies for now
          datasetRedirects: [], // Empty dataset redirects for now
          sqlFilters: [] // Empty SQL filters for now
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

    // Step 3: Return HTML form that POSTs to private embed URL (official pattern)
    const embedUrl = `${DOMO_BASE_URL}/embed/card/private/${DOMO_EMBED_ID}`;

    const htmlForm = `
    <html>
      <body>
        <form id="form" action="${embedUrl}" method="post">
          <input type="hidden" name="embedToken" value='${embedTokenData.authentication}'>
        </form>
        <script>
          document.getElementById("form").submit();
        </script>
      </body>
    </html>`;

    console.log('Returning HTML form with embed token, embedUrl:', embedUrl);

    return new Response(htmlForm, {
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