import os
import re

IMPORT_RE = re.compile(r"import\s*\{\s*theme\s*\}\s*from\s*['\"](?:\.\./)*lib/theme['\"];?\n?")

STYLESheet_RE = re.compile(
    r"const\s+([A-Za-z0-9_]+)\s*=\s*StyleSheet\.create\(\{(.*?)\}\);",
    re.DOTALL,
)

COMPONENT_RE = re.compile(
    r"(export\s+default\s+function\s+([A-Za-z0-9_]+)\([^)]*\)\s*\{)"
)

USE_THEME_HOOK = "const { theme } = useTheme();"

def migrate_file(path: str) -> bool:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if not IMPORT_RE.search(content):
        return False

    # Replace import
    content = IMPORT_RE.sub("import { useTheme } from '../../lib/theme';\n", content)
    content = content.replace("import { useTheme } from '../../lib/theme';\n", "import { useTheme } from '../../lib/theme';\n", 1)
    # Fix relative depth
    depth = content.count("../") - content.count("import { useTheme }")
    # Actually just fix all remaining static theme imports
    content = content.replace("import { theme } from '../lib/theme';", "import { useTheme } from '../lib/theme';")
    content = content.replace("import { theme } from '../../lib/theme';", "import { useTheme } from '../../lib/theme';")
    content = content.replace("import { theme } from '../../../lib/theme';", "import { useTheme } from '../../../lib/theme';")
    content = content.replace("import { theme } from '../../../../lib/theme';", "import { useTheme } from '../../../../lib/theme';")

    # Find StyleSheet.create blocks that use theme
    stylesheets = []
    for m in STYLESheet_RE.finditer(content):
        name = m.group(1)
        body = m.group(2)
        if "theme." in body:
            stylesheets.append((name, body, m.start(), m.end()))

    if not stylesheets:
        comp_match = COMPONENT_RE.search(content)
        if comp_match and USE_THEME_HOOK not in content:
            insert_pos = comp_match.end()
            content = content[:insert_pos] + "\n  " + USE_THEME_HOOK + content[insert_pos:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True

    # Replace stylesheets from end to start
    for name, body, start, end in reversed(stylesheets):
        new_decl = f"function get{name}(theme: any) {{\n  return StyleSheet.create({{{body}}});\n}}"
        content = content[:start] + new_decl + content[end:]

    # Add hooks inside component
    comp_match = COMPONENT_RE.search(content)
    if comp_match and USE_THEME_HOOK not in content:
        insert_pos = comp_match.end()
        hook_lines = ["  " + USE_THEME_HOOK]
        for name, _, _, _ in stylesheets:
            hook_lines.append(f"  const {name} = useMemo(() => get{name}(theme), [theme]);")
        hook_block = "\n".join(hook_lines)
        content = content[:insert_pos] + "\n" + hook_block + content[insert_pos:]

    # Ensure useMemo is imported
    react_import_match = re.search(r"import\s*\{([^}]+)\}\s*from\s*['"]react['"];", content)
    if react_import_match and "useMemo" not in react_import_match.group(1):
        old_import = react_import_match.group(0)
        new_import = old_import.replace("}", ", useMemo}")
        content = content.replace(old_import, new_import, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return True

def main():
    base = r"C:\Users\sxila\Sarke2.0"
    dirs = ["app", "components"]
    count = 0
    for d in dirs:
        for root, _, files in os.walk(os.path.join(base, d)):
            for f in files:
                if f.endswith((".tsx", ".ts")) and not f.endswith(".d.ts"):
                    path = os.path.join(root, f)
                    try:
                        if migrate_file(path):
                            count += 1
                            print(f"Migrated: {os.path.relpath(path, base)}")
                    except Exception as e:
                        print(f"ERROR {path}: {e}")
    print(f"\nTotal files migrated: {count}")

if __name__ == "__main__":
    main()
