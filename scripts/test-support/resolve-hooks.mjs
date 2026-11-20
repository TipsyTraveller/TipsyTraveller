// Lets Node load the app's React-Native style sources: extensionless relative imports
// resolve to `.js` (or `/index.js`). Used only by the Node test runner.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    const path = fileURLToPath(base);
    const candidates = [`${path}.js`, `${path}/index.js`];
    if (!/\.[a-z]+$/i.test(path)) {
      for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return nextResolve(new URL(`file://${candidate}`).href, context);
        }
      }
    }
  }
  return nextResolve(specifier, context);
}
