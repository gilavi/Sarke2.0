import os
import re

root = r'C:\Users\sxila\Sarke2.0'

# Pattern: function get<Name>Styles(theme: any) {\n  const { theme } = useTheme();\n  const styles = useMemo(() => get...Styles(theme), [theme]);\n\n  return StyleSheet.create({
pattern = re.compile(
    r'(function get\w*Styles\(theme: any\) \{)\n\s+const \{ theme \} = useTheme\(\);\n\s+const styles = useMemo\(\(\) => get\w*Styles\(theme\), \[theme\]\);\n\n',
    re.MULTILINE
)

replaced_total = 0
for dirpath, dirnames, filenames in os.walk(root):
    # skip node_modules
    if 'node_modules' in dirpath:
        continue
    for fname in filenames:
        if not fname.endswith('.tsx'):
            continue
        path = os.path.join(dirpath, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content, count = pattern.subn(r'\1\n', content)
        if count:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Fixed {count} occurrence(s) in {path}')
            replaced_total += count

print(f'\nTotal fixes: {replaced_total}')
