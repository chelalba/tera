/* ===============================================================
   The whole API on Cloudflare, in one function.

   Pages sends anything under /api here because of the [[path]] name.
   The pages, the stylesheet and the drawings are not handled here:
   Cloudflare serves those itself as static files, free and unmetered,
   and they never wake this up.

   Everything it does is in ../../server/routes.js, the same file the
   server on this machine calls. Two hosts, one set of rules, so what
   you see locally is what a customer gets.

   Two things are different here from an ordinary Node server.

   There is no process.env. Settings arrive as `context.env`, per
   request, which is why routes.configure is called before anything
   else happens.

   There is no Buffer and no node:http. The request and the reply are
   the web's own Request and Response, and routes.js was written to
   keep away from anything Node-only so that it can live in both.
   =============================================================== */

import routes from '../../server/routes.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

/* Which endpoint was asked for, with /api taken off the front.
   Read from the url rather than from the matched params, for the same
   reason the Vercel version did: the url is always there and it is
   what the local server reads too. */
function routeOf(url) {
  let path = url.pathname;

  if (path === '/api' || path.indexOf('/api/') === 0) {
    path = path.slice('/api'.length);
  }
  if (!path || path.charAt(0) !== '/') path = '/' + path;

  /* /comments and /comments/ are the same endpoint */
  if (path.length > 1 && path.charAt(path.length - 1) === '/') {
    path = path.slice(0, -1);
  }
  return path;
}

function headersToObject(headers) {
  const out = {};
  for (const [key, value] of headers) out[key.toLowerCase()] = value;
  return out;
}

export async function onRequest(context) {
  const { request, env } = context;

  /* Before anything: hand the bindings to the shared code, which has
     no other way of seeing them. */
  routes.configure(env);

  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const cors = routes.corsHeadersFor(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors || {} });
  }

  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch (err) {
      return new Response(JSON.stringify({ error: 'that was not JSON' }), {
        status: 400,
        headers: Object.assign({}, JSON_HEADERS, cors || {})
      });
    }
  }

  try {
    const result = await routes.handle({
      route: routeOf(url),
      method: request.method,
      body: body,
      headers: headersToObject(request.headers),
      local: false        /* nothing reaching Cloudflare is this machine */
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: Object.assign({}, JSON_HEADERS, cors || {})
    });
  } catch (err) {
    /* Shows up in `wrangler pages deployment tail` and in the
       dashboard's real-time logs. */
    console.error('api failed:', err && err.stack ? err.stack : err);
    return new Response(
      JSON.stringify({ error: 'something went wrong at our end' }),
      { status: 500, headers: Object.assign({}, JSON_HEADERS, cors || {}) }
    );
  }
}
