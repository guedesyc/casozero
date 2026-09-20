import { existsSync, rmSync } from 'node:fs';

// These folders are legacy GitHub Pages output. They must not be present when
// Next.js resolves the application, otherwise /app shadows /src/app.
const legacyOutput = ['app', 'admin', 'muriloguedes', 'precos', '404', '_next', 'out'];

for (const entry of legacyOutput) {
  if (existsSync(entry)) rmSync(entry, { recursive: true, force: true });
}
