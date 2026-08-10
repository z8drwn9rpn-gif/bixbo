from pathlib import Path

# Device-local admin helper. This deliberately lives outside synced BixboData.
helper = Path('src/lib/deviceAdmin.ts')
helper.write_text('''const DEVICE_ADMIN_KEY = "bixbo-admin-device";\n\nexport function isDeviceAdminEnabled(): boolean {\n  if (typeof window === "undefined") return false;\n  try {\n    return window.localStorage.getItem(DEVICE_ADMIN_KEY) === "1";\n  } catch {\n    return false;\n  }\n}\n\nexport function enableDeviceAdmin(): void {\n  if (typeof window === "undefined") return;\n  try {\n    window.localStorage.setItem(DEVICE_ADMIN_KEY, "1");\n  } catch {\n    // Storage can be unavailable in restricted/private browser contexts.\n  }\n}\n\nexport function disableDeviceAdmin(): void {\n  if (typeof window === "undefined") return;\n  try {\n    window.localStorage.removeItem(DEVICE_ADMIN_KEY);\n    window.sessionStorage.removeItem("bixbo-admin-unlocked");\n  } catch {\n    // Ignore unavailable storage.\n  }\n}\n''', encoding='utf-8')

# Admin route: successful PIN both unlocks the session and marks THIS device only.
p = Path('src/routes/admin.tsx')
s = p.read_text(encoding='utf-8')
needle = 'import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";\n'
insert = needle + 'import { enableDeviceAdmin } from "@/lib/deviceAdmin";\n'
if 'from "@/lib/deviceAdmin"' not in s:
    assert needle in s, 'admin storage import not found'
    s = s.replace(needle, insert, 1)

old = 'window.sessionStorage.setItem("bixbo-admin-unlocked", "1");\n        setPinError(false);'
new = 'window.sessionStorage.setItem("bixbo-admin-unlocked", "1");\n        enableDeviceAdmin();\n        setPinError(false);'
if 'enableDeviceAdmin();' not in s:
    assert old in s, 'admin unlock block not found'
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Profile/Health hub: Admin row is only rendered on a device that has been activated.
p = Path('src/routes/profile.tsx')
s = p.read_text(encoding='utf-8')
needle = 'import type { AppLanguage } from "@/lib/i18n";\n'
insert = needle + 'import { isDeviceAdminEnabled } from "@/lib/deviceAdmin";\n'
if 'from "@/lib/deviceAdmin"' not in s:
    assert needle in s, 'profile i18n import not found'
    s = s.replace(needle, insert, 1)

s = s.replace('  onAdmin: () => void;\n}) {', '  onAdmin?: () => void;\n}) {', 1)

old_block = '''            <HubRow\n              icon={<TaskIcon size={22} />}\n              title="Admin mode"\n              subtitle="Configure logs, calendar, Quick Log and Insights without editing code"\n              onClick={onAdmin}\n            />\n            <div className="ml-[4.5rem] border-t border-border/60" />\n'''
new_block = '''            {onAdmin ? (\n              <>\n                <HubRow\n                  icon={<TaskIcon size={22} />}\n                  title="Admin mode"\n                  subtitle="Configure logs, calendar, Quick Log and Insights without editing code"\n                  onClick={onAdmin}\n                />\n                <div className="ml-[4.5rem] border-t border-border/60" />\n              </>\n            ) : null}\n'''
if '{onAdmin ? (' not in s:
    assert old_block in s, 'profile admin hub row not found'
    s = s.replace(old_block, new_block, 1)

state_needle = '  const [accountAuthError, setAccountAuthError] = useState<string | null>(null);\n'
state_insert = state_needle + '  const [deviceAdminEnabled] = useState(() => isDeviceAdminEnabled());\n'
if 'const [deviceAdminEnabled]' not in s:
    assert state_needle in s, 'profile state insertion point not found'
    s = s.replace(state_needle, state_insert, 1)

old_prop = '        onAdmin={() => navigate({ to: "/admin" as never })}\n'
new_prop = '        onAdmin={deviceAdminEnabled ? () => navigate({ to: "/admin" as never }) : undefined}\n'
if new_prop not in s:
    assert old_prop in s, 'profile HealthHub admin prop not found'
    s = s.replace(old_prop, new_prop, 1)
p.write_text(s, encoding='utf-8')

print('Installed device-only Admin visibility and activation.')
