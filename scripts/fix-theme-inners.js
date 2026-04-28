const fs = require('fs');
const path = require('path');

const FUNC_RE = /function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g;
const USE_THEME_HOOK = 'const { theme } = useTheme();';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('getstyles(') && !content.includes('getStyles(')) return false;

  const styleFuncMatch = content.match(/function\s+(get[A-Za-z0-9_]*[Ss]tyles?)\s*\(/);
  if (!styleFuncMatch) return false;
  const styleFuncName = styleFuncMatch[1];

  const funcs = [];
  let m;
  while ((m = FUNC_RE.exec(content)) !== null) {
    funcs.push({ name: m[1], index: m.index + m[0].length });
  }

  let changed = false;
  for (let i = 0; i < funcs.length; i++) {
    const { name, index } = funcs[i];
    const nextIndex = i < funcs.length - 1 ? funcs[i + 1].index - 20 : content.length;
    const body = content.slice(index, nextIndex);

    if (body.includes(USE_THEME_HOOK)) continue;
    const usesStyles = /\bstyles\./.test(body);
    const usesTheme = /\btheme\./.test(body);

    if (usesStyles || usesTheme) {
      const hookLine = `  ${USE_THEME_HOOK}\n  const styles = useMemo(() => ${styleFuncName}(theme), [theme]);\n`;
      content = content.slice(0, index) + '\n' + hookLine + content.slice(index);
      changed = true;
      // Adjust indices for subsequent functions
      const offset = hookLine.length + 1;
      for (let j = i + 1; j < funcs.length; j++) {
        funcs[j].index += offset;
      }
    }
  }

  const reactImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]react['"];/);
  if (reactImportMatch && !reactImportMatch[1].includes('useMemo')) {
    const oldImport = reactImportMatch[0];
    const newImport = oldImport.replace('}', ', useMemo}');
    content = content.replace(oldImport, newImport);
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

const base = path.resolve(__dirname, '..');
const dirs = ['app', 'components'];
let count = 0;

for (const d of dirs) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
        walk(full);
      } else if (stat.isFile() && full.endsWith('.tsx')) {
        try {
          if (fixFile(full)) {
            count++;
            console.log('Fixed:', path.relative(base, full));
          }
        } catch (e) {
          console.error('ERROR', full, e.message);
        }
      }
    }
  };
  walk(path.join(base, d));
}

console.log('\nTotal files fixed:', count);
