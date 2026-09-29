/* ===============================================================
   The whole API on Vercel, in one function.

   Vercel sends anything under /api here, because of the [...path]
   name. One function rather than thirteen files keeps the routing in
   a single place, shared with the local server, so the two cannot
   drift apart.

   The pages, the images and the stylesheet are not handled here.
   Vercel serves those itself, straight from the repository.
   =============================================================== */

'use strict';

const { handle, corsHeadersFor } = require('../server/routes.js');

module.exports = async function (req, res) {
  const origin = req.headers.origin;
  const cors = corsHeadersFor(origin);
  if (cors) {
    Object.keys(cors).forEach(k => res.setHeader(k, cors[k]));
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  /* Vercel gives the catch-all as an array of segments, so
     /api/menu/honey-cake arrives as ['menu', 'honey-cake'] */
  const parts = req.query && req.query.path;
  const list = Array.isArray(parts) ? parts : (parts ? [parts] : []);
  const route = '/' + list.map(encodeURIComponent).join('/');

  /* Vercel parses JSON bodies already, but a string can still turn up
     when the content type was not set */
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) { body = {}; }
  }

  try {
    const result = await handle({
      route: route === '/' ? '/' : route,
      method: req.method,
      body: body || {},
      headers: req.headers,
      local: false          /* nothing reaching Vercel is this machine */
    });

    res.statusCode = result.status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.end(JSON.stringify(result.body));
  } catch (err) {
    console.error('api failed:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'something went wrong at our end' }));
  }
};
