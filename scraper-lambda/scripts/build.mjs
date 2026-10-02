import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('🚀 Building Tabber Scraper Lambda with esbuild...');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.resolve(rootDir, 'src/handler.ts')],
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: path.resolve(distDir, 'index.mjs'),
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

const stats = fs.statSync(path.resolve(distDir, 'index.mjs'));
const sizeKb = (stats.size / 1024).toFixed(2);
console.log(`✅ Bundle created: dist/index.mjs (${sizeKb} KB)`);

try {
  execSync('zip -q -j function.zip index.mjs', { cwd: distDir });
  const zipStats = fs.statSync(path.resolve(distDir, 'function.zip'));
  const zipSizeKb = (zipStats.size / 1024).toFixed(2);
  console.log(`📦 Zip package created: dist/function.zip (${zipSizeKb} KB)`);
} catch {
  console.log('⚠️ Could not automatically create zip. index.mjs is ready.');
}

console.log('🎉 Build complete!');

