/**
 * Budof Standalone Bundle Compiler
 * Compiles all modular engines into a zero-dependency bundle.js
 * that executes 100% reliably under file:/// protocol AND https:// on Cloudflare Pages.
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = 'C:/Users/lucky/dev-npm/budof';

const filesToBundle = [
  'js/utils/formatters.js',
  'js/engine/runway-simulator.js',
  'js/engine/unit-economics.js',
  'js/engine/pricing-calculator.js',
  'js/engine/presets.js',
  'js/engine/valuation.js',
  'js/engine/audio.js',
  'js/engine/tycoon-events.js',
  'js/engine/tycoon-game.js',
  'js/engine/chart-renderer.js',
  'js/utils/exporter.js',
  'app.js'
];

let bundleContent = '/* Budof Standalone Production Bundle — (C) budof.com */\n(function () {\n  "use strict";\n\n';

for (const relPath of filesToBundle) {
  const fullPath = path.join(rootDir, relPath);
  let code = fs.readFileSync(fullPath, 'utf-8');

  // Strip import statements
  code = code.replace(/^\s*import\s+[^;]+;\s*$/gm, '');

  // Strip export statements but preserve declarations
  code = code.replace(/^\s*export\s+default\s+/gm, '');
  code = code.replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ');
  code = code.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');

  bundleContent += `  // --- MODULE: ${relPath} ---\n`;
  bundleContent += code.split('\n').map(line => '  ' + line).join('\n');
  bundleContent += '\n\n';
}

bundleContent += '})();\n';

fs.writeFileSync(path.join(rootDir, 'bundle.js'), bundleContent, 'utf-8');
console.log('Successfully compiled bundle.js (' + (bundleContent.length / 1024).toFixed(1) + ' KB)');
