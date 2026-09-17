/**
 * AI-SDLC: Cytoscape.js Standalone Bundle Provider
 * Resolves and provides the minified Cytoscape.js library for offline, self-contained dashboard generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

let cachedScript: string | null = null;

const FALLBACK_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.34.3/cytoscape.min.js';

/**
 * Resolves the physical path of cytoscape.min.js from the package.
 */
export function resolveCytoscapePath(): string | null {
  try {
    const req = createRequire(import.meta.url);
    const entryPath = req.resolve('cytoscape');
    const dir = path.dirname(entryPath);
    const minPath = path.join(dir, 'cytoscape.min.js');
    if (fs.existsSync(minPath)) {
      return minPath;
    }
  } catch {
    // Fall through to secondary search
  }

  // Fallback check in current or parent node_modules
  const searchDirs = [
    path.join(process.cwd(), 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js'),
    path.join(process.cwd(), 'packages', 'core', 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js'),
  ];

  for (const candidate of searchDirs) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Returns the raw Cytoscape.js script content for direct inlining in standalone HTML.
 */
export function getCytoscapeScript(): string {
  if (cachedScript) {
    return cachedScript;
  }

  const scriptPath = resolveCytoscapePath();
  if (scriptPath) {
    try {
      cachedScript = fs.readFileSync(scriptPath, 'utf-8');
      return cachedScript;
    } catch {
      // Fallback
    }
  }

  // Graceful fallback script loader if local resolution is not found
  cachedScript = `/* Cytoscape.js CDN Fallback Loader */
(function() {
  if (typeof window.cytoscape === 'undefined') {
    var s = document.createElement('script');
    s.src = '${FALLBACK_CDN_URL}';
    s.async = false;
    document.head.appendChild(s);
  }
})();`;

  return cachedScript;
}
