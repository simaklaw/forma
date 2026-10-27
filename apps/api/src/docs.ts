/**
 * Minimal self-contained Swagger UI page served at GET /api/docs.
 *
 * Renders the OpenAPI document from /api/openapi.json (which is
 * generated from the same zod schemas that validate requests).
 * Swagger UI assets load from jsDelivr; no npm dependency needed.
 */
export function docsHtml(): string {
  return [
    '<!doctype html>',
    '<html lang="ru">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <title>FitPulse Sync API — Docs</title>',
    '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />',
    '  <style>',
    '    html { box-sizing: border-box; background: #fafafa; }',
    '    body { margin: 0; padding: 24px; }',
    '    .topbar { display: none; }',
    '    #banner { font: 600 14px/1.4 system-ui, sans-serif; color: #444; margin-bottom: 12px; }',
    '    #banner a { color: #2563eb; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="banner">',
    '    FitPulse Sync API — интерактивная документация. Схемы генерируются из zod:',
    '    GET <a href="/api/openapi.json">/api/openapi.json</a>.',
    '  </div>',
    '  <div id="swagger-ui"></div>',
    '  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>',
    '  <script>',
    '    window.onload = function () {',
    '      window.ui = SwaggerUIBundle({',
    "        url: '/api/openapi.json',",
    "        dom_id: '#swagger-ui',",
    '        deepLinking: true,',
    '        tryItOutEnabled: true,',
    '        persistAuthorization: true,',
    '      });',
    '    };',
    '  </script>',
    '</body>',
    '</html>',
    '',
  ].join('
');
}
