const fs = require('fs');
const path = require('path');

const IMPORT_RE = /import\s*\{\s*theme\s*\}\s*from\s*['"](?:\.\.\/)*lib\/theme['"];?\n?/g;
const STYLESHEET_RE = /const\s+([A-Za-z0-9_]+)\s*=\s*StyleSheet\.create\(\{([\s\S]*?)\}\);/g;
const COMPONENT_RE = /(export\s+default\s+function\s+([A-Za-z0-9_]+)\([^)]*\)\s*\{)/;
const USE_THEME_HOOK = 'const { theme } = useTheme();';

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!IMPORT_RE.test(content)) return false;
  IMPORT_RE.lastIndex = 0;

  // Replace import
  content = content.replace(IMPORT_RE, "import { useTheme } from '../../lib/theme';\n");
  content = content.replace("import { theme } from '../lib/theme';", "import { useTheme } from '../lib/theme';");
  content = content.replace("import { theme } from '../../lib/theme';", "import { useTheme } from '../../lib/theme';");
  content = content.replace("import { theme } from '../../../lib/theme';", "import { useTheme } from '../../../lib/theme';");
  content = content.replace("import { theme } from '../../../../lib/theme';", "import { useTheme } from '../../../../lib/theme';");

  // Find StyleSheet.create blocks that use theme
  const stylesheets = [];
  let m;
  while ((m = STYLESHEET_RE.exec(content)) !== null) {
    const name = m[1];
    const body = m[2];
    if (body.includes('theme.')) {
      stylesheets.push({ name, body, start: m.index, end: m.index + m[0].length });
    }
  }

  if (stylesheets.length === 0) {
    const compMatch = content.match(COMPONENT_RE);
    if (compMatch && !content.includes(USE_THEME_HOOK)) {
      const insertPos = compMatch.index + compMatch[1].length;
      content = content.slice(0, insertPos) + '\n  ' + USE_THEME_HOOK + content.slice(insertPos);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  // Replace stylesheets from end to start
  for (let i = stylesheets.length - 1; i >= 0; i--) {
    const { name, body, start, end } = stylesheets[i];
    const newDecl = `function get${name}(theme: any) {\n  return StyleSheet.create({${body}});\n}`;
    content = content.slice(0, start) + newDecl + content.slice(end);
  }

  // Add hooks inside component
  const compMatch = content.match(COMPONENT_RE);
  if (compMatch && !content.includes(USE_THEME_HOOK)) {
    const insertPos = compMatch.index + compMatch[1].length;
    const hookLines = ['  ' + USE_THEME_HOOK];
    for (const { name } of stylesheets) {
      hookLines.push(`  const ${name} = useMemo(() => get${name}(theme), [theme]);`);
    }
    const hookBlock = hookLines.join('\n');
    content = content.slice(0, insertPos) + '\n' + hookBlock + content.slice(insertPos);
  }

  // Ensure useMemo is imported
  const reactImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]react['"];/);
  if (reactImportMatch && !reactImportMatch[1].includes('useMemo')) {
    const oldImport = reactImportMatch[0];
    const newImport = oldImport.replace('}', ', useMemo}');
    content = content.replace(oldImport, newImport);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
      walk(full, cb);
    } else if (stat.isFile() && (full.endsWith('.tsx') || full.endsWith('.ts')) && !full.endsWith('.d.ts')) {
      cb(full);
    }
  }
}

const base = path.resolve(__dirname, '..');
const dirs = ['app', 'components'];
let count = 0;

for (const d of dirs) {
  walk(path.join(base, d), (filePath) => {
    try {
      if (migrateFile(filePath)) {
        count++;
        console.log('Migrated:', path.relative(base, filePath));
      }
    } catch (e) {
      console.error('ERROR', filePath, e.message);
    }
  });
}

console.log('\nTotal files migrated:', count);
