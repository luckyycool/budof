/**
 * Budof — Cloudflare Worker Entry Point
 * Routes dynamic /api/* endpoints to future D1/KV storage
 * Static assets served with unlimited hits via "run_worker_first": false
 */

const ADS_TXT_CONTENT = 'google.com, pub-0897820292119776, DIRECT, f08c47fec0942fa0\n';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. Explicit ads.txt delivery for Google AdSense verification
        if (url.pathname === '/ads.txt') {
            return new Response(ADS_TXT_CONTENT, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }

        // 2. Future-ready API route interceptor (/api/*)
        if (url.pathname.startsWith('/api/')) {
            return handleApi(request, env, url);
        }

        // 3. Static Assets fallback (if invoked directly)
        return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
};

async function handleApi(request, env, url) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Health check & status endpoint
    if (url.pathname === '/api/health' || url.pathname === '/api/status') {
        return new Response(JSON.stringify({
            status: 'healthy',
            service: 'budof-engine',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            d1_ready: typeof env.DB !== 'undefined'
        }), {
            headers: corsHeaders
        });
    }

    return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Endpoint does not exist. Budof static suite is served from Cloudflare Edge Cache.'
    }), {
        status: 404,
        headers: corsHeaders
    });
}
