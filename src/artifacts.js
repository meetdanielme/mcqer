export const MAX_ARTIFACT_BYTES = 512 * 1024;

export function validateArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) return 'must have html and title fields.';
  if (typeof artifact.title !== 'string' || !artifact.title.trim()) return 'title must describe the chart.';
  if (typeof artifact.html !== 'string' || !artifact.html.trim()) return 'html must contain a self-contained HTML chart.';
  if (new TextEncoder().encode(artifact.html).length > MAX_ARTIFACT_BYTES) return 'HTML must be no larger than 512 KB.';
  if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=/i.test(artifact.html)) return 'must include chart libraries and styles inline; external script and stylesheet files are not supported.';
  return '';
}

// Opaque sandbox origin prevents access to MCQer data. CSP blocks network
// dependencies; charts must carry their own inline SVG, styles and scripts.
export function artifactDocument(html) {
  return '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}body{margin:12px;font-family:system-ui,sans-serif}svg,canvas,img{max-width:100%}</style></head><body>' + html + '</body></html>';
}
