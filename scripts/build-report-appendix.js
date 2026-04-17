/**
 * Builds docs/REPORT_APPENDIX_SOURCE_CODE.md for academic reports.
 * Excludes: node_modules, dist, .git, lockfiles, .env*, images, binaries.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs');
const OUT_FILE = path.join(OUT_DIR, 'REPORT_APPENDIX_SOURCE_CODE.md');

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git', 'coverage', '.vite', '__pycache__']);
const SKIP_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.map']);
const SKIP_BASE_NAMES = new Set(['package-lock.json', '.env', '.env.local', '.env.production', '.env.development']);

const CODE_EXT = new Set(['.js', '.jsx', '.css', '.mjs', '.cjs', '.yaml', '.yml']);

function shouldSkipFile(absPath) {
  const base = path.basename(absPath);
  if (SKIP_BASE_NAMES.has(base)) return true;
  const ext = path.extname(absPath).toLowerCase();
  if (SKIP_EXT.has(ext)) return true;
  const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
  if (rel.includes('/node_modules/') || rel.includes('/dist/') || rel.includes('/.git/')) return true;
  return false;
}

function* walkDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walkDir(abs);
    else yield abs;
  }
}

function collectFiles() {
  const list = [];

  const addRootFiles = (names) => {
    for (const n of names) {
      const abs = path.join(ROOT, n);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) list.push(abs);
    }
  };

  addRootFiles(['docker-compose.yml', 'README.md']);

  const dockerFull = path.join(ROOT, 'micro-services', 'docker', 'docker-compose.yml');
  if (fs.existsSync(dockerFull)) list.push(dockerFull);

  const feRootFiles = ['Frontend_UI/index.html', 'Frontend_UI/vite.config.js', 'Frontend_UI/tailwind.config.js', 'Frontend_UI/postcss.config.js', 'Frontend_UI/eslint.config.js'];
  addRootFiles(feRootFiles);

  const feSrc = path.join(ROOT, 'Frontend_UI', 'src');
  if (fs.existsSync(feSrc)) {
    for (const f of walkDir(feSrc)) {
      if (shouldSkipFile(f)) continue;
      const ext = path.extname(f).toLowerCase();
      if (CODE_EXT.has(ext) || ext === '.html' || ext === '.json') list.push(f);
    }
  }

  const servicesRoot = path.join(ROOT, 'micro-services', 'services');
  if (fs.existsSync(servicesRoot)) {
    for (const svc of fs.readdirSync(servicesRoot, { withFileTypes: true })) {
      if (!svc.isDirectory()) continue;
      const srcDir = path.join(servicesRoot, svc.name, 'src');
      if (!fs.existsSync(srcDir)) continue;
      for (const f of walkDir(srcDir)) {
        if (shouldSkipFile(f)) continue;
        if (path.extname(f).toLowerCase() === '.js') list.push(f);
      }
    }
  }

  const aiStub = path.join(ROOT, 'micro-services', 'services', 'ai-symptom-checker-service', 'src', 'app.js');
  if (fs.existsSync(aiStub)) list.push(aiStub);

  const gwDocker = path.join(ROOT, 'micro-services', 'api-gateway', 'Dockerfile');
  if (fs.existsSync(gwDocker)) list.push(gwDocker);

  const k8sDirs = [path.join(ROOT, 'k8s'), path.join(ROOT, 'micro-services', 'k8s')];
  for (const kd of k8sDirs) {
    if (!fs.existsSync(kd)) continue;
    for (const ent of fs.readdirSync(kd, { withFileTypes: true })) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (ext === '.yaml' || ext === '.yml') list.push(path.join(kd, ent.name));
    }
  }

  const unique = [...new Set(list)];
  unique.sort((a, b) => a.replace(/\\/g, '/').localeCompare(b.replace(/\\/g, '/')));
  return unique;
}

function main() {
  const files = collectFiles();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const parts = [];
  parts.push('# Appendix: PrimeHealth source code (verbatim text)');
  parts.push('');
  parts.push('This file is generated for report submission. **Do not commit secrets**; `.env` files are excluded.');
  parts.push('');
  parts.push('**Excluded:** `node_modules/`, `dist/`, `.git/`, `package-lock.json`, `.env*`, images and other binary extensions, source maps.');
  parts.push('');
  parts.push(`**Included file count:** ${files.length}`);
  parts.push('');

  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch (e) {
      content = `<< Error reading file: ${e.message} >>`;
    }
    const ext = path.extname(abs).slice(1) || 'text';
    parts.push('---');
    parts.push('');
    parts.push(`## \`${rel}\``);
    parts.push('');
    parts.push('```' + ext);
    parts.push(content.replace(/\r\n/g, '\n'));
    parts.push('```');
    parts.push('');
  }

  fs.writeFileSync(OUT_FILE, parts.join('\n'), 'utf8');
  console.log(`Wrote ${files.length} files to ${path.relative(ROOT, OUT_FILE)}`);
}

main();
