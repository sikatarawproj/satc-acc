const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const DEV = process.argv.includes('--dev');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

console.log(`Building for ${DEV ? 'development' : 'production'}...`);

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.readdirSync(src).forEach(item => {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) { copyDir(s, d); }
    else { fs.copyFileSync(s, d); }
  });
}

// ---- Setup dist directories ----
['dist/assets/css', 'dist/assets/js', 'dist/assets/images', 'dist/assets/favicon',
 'dist/data/seed', 'dist/data/reference', 'dist/api'].forEach(ensureDir);

// ---- Copy static assets ----
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
console.log('  Assets -> dist/assets/');

// ---- Copy data files ----
copyDir(path.join(ROOT, 'data'), path.join(DIST, 'data'));
console.log('  Data -> dist/data/');

// ---- Copy API (serverless functions) ----
copyDir(path.join(ROOT, 'api'), path.join(DIST, 'api'));
console.log('  API -> dist/api/');

// ---- CSS Bundle ----
esbuild.build({
  entryPoints: ['frontend/src/css/index.css'],
  outfile: 'dist/assets/css/app.css',
  bundle: true,
  minify: !DEV,
  sourcemap: DEV,
  external: ['assets/*', '*.png', '*.ico', '*.jpg'],
}).then(() => console.log('  CSS -> dist/assets/css/app.css'))
.catch(e => { console.error('CSS build failed:', e); process.exit(1); });

// ---- JS Bundle ----
const jsEntry = path.join(ROOT, 'frontend', 'src', 'js', '_entry.js');
const jsFiles = [
  'frontend/src/js/core/state.js',
  'frontend/src/js/core/permissions.js',
  'frontend/src/js/core/sample-data.js',
  'frontend/src/js/core/dom-refs.js',
  'frontend/src/js/core/utils.js',
  'frontend/src/js/modules/ux.js',
  'frontend/src/js/modules/app.js',
  'frontend/src/js/core/modern-2026-phase6-qa-script.js',
  'frontend/src/js/core/phase12HardStructureScript.js',
  'frontend/src/js/modules/runtime.js',
];
const entryContent = jsFiles.map(f =>
  `require('./${f.replace('frontend/src/js/', '')}');`
).join('\n');
fs.writeFileSync(jsEntry, entryContent);

esbuild.build({
  entryPoints: [jsEntry],
  outfile: 'dist/assets/js/app.js',
  bundle: true,
  minify: !DEV,
  sourcemap: DEV,
  platform: 'browser',
  target: ['es2020'],
  format: 'iife',
  globalName: 'SATC',
}).then(() => {
  if (fs.existsSync(jsEntry)) fs.unlinkSync(jsEntry);
  console.log('  JS -> dist/assets/js/app.js');

  // ---- Generate production index.html ----
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // Replace CSS link with bundled version
  let prodHtml = html.replace(
    /<link rel="stylesheet" href="frontend\/src\/css\/index.css" \/>/,
    '<link rel="stylesheet" href="assets/css/app.css" />'
  );

  // Replace individual JS scripts with bundled version
  prodHtml = prodHtml.replace(
    /<script src="frontend\/src\/js\/core\/state\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/permissions\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/sample-data\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/dom-refs\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/utils\.js"><\/script>\s*<script src="frontend\/src\/js\/modules\/ux\.js"><\/script>\s*<script src="frontend\/src\/js\/modules\/app\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/modern-2026-phase6-qa-script\.js"><\/script>\s*<script src="frontend\/src\/js\/core\/phase12HardStructureScript\.js"><\/script>\s*<script src="frontend\/src\/js\/modules\/runtime\.js"><\/script>/,
    '<script src="assets/js/app.js"></script>'
  );

  // Fix asset paths in HTML
  prodHtml = prodHtml.replace(/href="assets\//g, 'href="assets/');
  prodHtml = prodHtml.replace(/src="assets\//g, 'src="assets/');
  prodHtml = prodHtml.replace(/src="data\//g, 'src="data/');

  fs.writeFileSync(path.join(DIST, 'index.html'), prodHtml);
  console.log('  index.html -> dist/index.html (with bundled refs)');
  console.log('\nBuild complete! Output in dist/');
})
.catch(e => {
  if (fs.existsSync(jsEntry)) fs.unlinkSync(jsEntry);
  console.error('JS build failed:', e);
  process.exit(1);
});
