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

/* Which endpoint was asked for, with /api taken off the front.

   Read from the url rather than from req.query.path. The name of this
   file makes Vercel hand the segments over as a list, but that is the
   dynamic route plumbing and it has arrived empty in practice, which
   left every call looking like a request for nothing and answered
   with "no such endpoint". The url is always there, and it is the
   same thing the local server reads, so both behave alike. */
function routeOf(req) {
  let path = String(req.url || '/').split('?')[0];

  if (path === '/api' || path.indexOf('/api/') === 0) {
    path = path.slice('/api'.length);
  }
  if (!path || path.charAt(0) !== '/') path = '/' + path;

  /* /comments and /comments/ are the same endpoint */
  if (path.length > 1 && path.charAt(path.length - 1) === '/') {
    path = path.slice(0, -1);
  }

  /* Still nothing? Fall back to the segments, in case a future
     runtime routes in a way the url does not show. */
  if (path === '/' && req.query && req.query.path) {
    const parts = req.query.path;
    const list = Array.isArray(parts) ? parts : [parts];
    if (list.length) path = '/' + list.map(encodeURIComponent).join('/');
  }

  return path;
}

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

  const route = routeOf(req);

  /* Vercel parses JSON bodies already, but a string can still turn up
     when the content type was not set */
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) { body = {}; }
  }

  try {
    const result = await handle({
      route: route,
      method: req.method,
      body: body || {},
      headers: req.headers,
      local: false          /* nothing reaching Vercel is this machine */
    });

    /* A photograph comes back with bytes on it rather than a body,
       and is sent raw. The address of a photograph never changes, so
       it carries a long cache and the edge keeps it: the database is
       asked for each picture once, not once per visitor. */
    if (result.bytes) {
      const buf = Buffer.from(result.bytes);
      res.statusCode = result.status;
      res.setHeader('content-type', result.mime);
      res.setHeader('content-length', buf.length);
      res.setHeader('cache-control', result.cache || 'no-store');
      return res.end(buf);
    }

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
