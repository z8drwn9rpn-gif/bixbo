from pathlib import Path

path = Path("src/routes/__root.tsx")
text = path.read_text()
import_anchor = 'import { GlobalAdminModeController } from "../components/GlobalAdminModeController";\n'
mount_anchor = '      <GlobalAdminModeController />\n'
if import_anchor not in text or mount_anchor not in text:
    raise SystemExit("root mount anchors not found")
text = text.replace(import_anchor, import_anchor + 'import { UniversalAdminPageEditor } from "../components/UniversalAdminPageEditor";\n')
text = text.replace(mount_anchor, mount_anchor + '      <UniversalAdminPageEditor />\n')
path.write_text(text)
