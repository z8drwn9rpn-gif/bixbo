from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
    text = text.replace(old, new, 1)
    file.write_text(text, encoding="utf-8")


# 1) Recipes: keep Search, but collapse it by default so the approved paper-card
# stack is the primary visual instead of a generic search/filter form.
recipes = Path("src/features/notes/RecipesView.tsx")
text = recipes.read_text(encoding="utf-8")
old_state = '  const [query, setQuery] = useState("");\n  const [filter, setFilter] = useState<Filter>("all");'
new_state = '  const [query, setQuery] = useState("");\n  const [searchOpen, setSearchOpen] = useState(false);\n  const [filter, setFilter] = useState<Filter>("all");'
if old_state not in text:
    raise RuntimeError("Recipes query/filter state anchor missing")
text = text.replace(old_state, new_state, 1)

start_marker = '''  return (\n    <section className="space-y-4 pb-4">\n      <div className="relative">\n        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />'''
end_marker = '''\n\n      {importOpen ? ('''
start = text.find(start_marker)
if start < 0:
    raise RuntimeError("Recipes default search block start not found")
end = text.find(end_marker, start)
if end < 0:
    raise RuntimeError("Recipes default search block end not found")
replacement = '''  return (\n    <section className="space-y-4 pb-4">\n      <div className="flex justify-end -mb-1">\n        <button\n          type="button"\n          onClick={() => {\n            if (searchOpen) {\n              setQuery("");\n              setFilter("all");\n            }\n            setSearchOpen(!searchOpen);\n          }}\n          aria-label={t("Search recipes")}\n          aria-expanded={searchOpen}\n          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition ${\n            searchOpen ? "border-primary bg-primary text-primary-foreground" : "border-[#D4CCB8] bg-[#FBF7EC] text-[#555A3E]"\n          }`}\n        >\n          <Search className="h-4 w-4" />\n          {t("Search")}\n        </button>\n      </div>\n\n      {searchOpen ? (\n        <div className="space-y-2 rounded-[22px] border border-border/60 bg-surface/70 p-3 shadow-sm">\n          <div className="relative">\n            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />\n            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search recipes…")} className="h-11 rounded-2xl border-border/70 bg-background pl-10 pr-11 shadow-none" />\n            {query ? <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-tint"><X className="h-4 w-4" /></button> : null}\n          </div>\n          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">\n            {([\n              ["all", "All"],\n              ["baking", "Baking"],\n              ["cooking", "Cooking"],\n              ["spreads", "Spreads"],\n              ["favorites", "Favorites"],\n            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-border ${filter === value ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(label)}</button>)}\n          </div>\n        </div>\n      ) : null}'''
text = text[:start] + replacement + text[end:]
recipes.write_text(text, encoding="utf-8")

# 2) Eyes embedded inside Pain Episodes should start with Affected eye, then the
# approved 3-choice pain scale and pain-with-movement question. The parent Pain
# entry already owns the time, so don't waste the top of the embedded card on it.
replace_once(
    "src/features/logging/EyesForm.tsx",
    '''        <Field label="Time">\n          <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full" />\n        </Field>''',
    '''        {!embedded ? (\n          <Field label="Time">\n            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full" />\n          </Field>\n        ) : null}''',
)

# 3) Always register/update the app service worker, even when push permission is
# off. This makes app-shell freshness independent from notification settings.
replace_once(
    "src/routes/__root.tsx",
    'import { installRuntimeDiagnostics } from "@/lib/runtimeDiagnosticsInstaller";',
    'import { installRuntimeDiagnostics } from "@/lib/runtimeDiagnosticsInstaller";\nimport { ensureAppServiceWorker } from "@/lib/appServiceWorker";',
)
replace_once(
    "src/routes/__root.tsx",
    '''  useThemeSync();\n  useEffect(() => installRuntimeDiagnostics((issue) => { toast.error("BIXBO detected an app error", { description: `${issue.area}: ${issue.message}`, action: { label: "App scan", onClick: () => void router.navigate({ to: "/diagnostics" }) } }); }), [router]);\n  return <QueryClientProvider client={queryClient}>''',
    '''  useThemeSync();\n  useEffect(() => installRuntimeDiagnostics((issue) => { toast.error("BIXBO detected an app error", { description: `${issue.area}: ${issue.message}`, action: { label: "App scan", onClick: () => void router.navigate({ to: "/diagnostics" }) } }); }), [router]);\n  useEffect(() => {\n    void ensureAppServiceWorker();\n    try {\n      const url = new URL(window.location.href);\n      if (url.searchParams.has("__bixbo_sw_update")) {\n        url.searchParams.delete("__bixbo_sw_update");\n        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);\n      }\n    } catch {\n      // Update-marker cleanup must never affect startup.\n    }\n  }, []);\n  return <QueryClientProvider client={queryClient}>''',
)

# 4) Make the service worker byte-distinct per production release. The deploy
# workflow stamps the placeholder with the exact production SHA. In local/CI
# builds the placeholder remains and therefore never causes a forced navigation.
sw = Path("public/bixbo-push-sw.js")
sw_text = sw.read_text(encoding="utf-8")
sw_text = sw_text.replace('const BIXBO_PUSH_SW_VERSION = "2026.08.19.3";', 'const BIXBO_PUSH_SW_VERSION = "__BIXBO_DEPLOY_SHA__";', 1)
old_activate = '''self.addEventListener("activate", (event) => {\n  event.waitUntil(self.clients.claim());\n});'''
new_activate = '''const BIXBO_SW_REFRESH_PARAM = "__bixbo_sw_update";\n\nasync function claimClientsAndRefreshForDeployment() {\n  await self.clients.claim();\n\n  // Only production output is stamped. Avoid reloads in local/CI service-worker\n  // installs, while making each real release reliably replace stale iOS PWA UI.\n  if (BIXBO_PUSH_SW_VERSION.startsWith("__BIXBO_")) return;\n\n  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });\n  await Promise.allSettled(clientList.map(async (client) => {\n    if (typeof client.navigate !== "function") return;\n    try {\n      const url = new URL(client.url);\n      if (url.origin !== self.location.origin) return;\n      if (url.searchParams.get(BIXBO_SW_REFRESH_PARAM) === BIXBO_PUSH_SW_VERSION) return;\n      url.searchParams.set(BIXBO_SW_REFRESH_PARAM, BIXBO_PUSH_SW_VERSION);\n      await client.navigate(url.toString());\n    } catch {\n      // A closed/suspended client must not make activation fail.\n    }\n  }));\n}\n\nself.addEventListener("activate", (event) => {\n  event.waitUntil(claimClientsAndRefreshForDeployment());\n});'''
if old_activate not in sw_text:
    raise RuntimeError("Push SW activation anchor missing")
sw_text = sw_text.replace(old_activate, new_activate, 1)
sw.write_text(sw_text, encoding="utf-8")

# 5) Stamp the built SW after build but before bundle/smoke/deploy, then verify
# live production is serving the exact deploy SHA rather than an older SW.
deploy = Path(".github/workflows/deploy-cloudflare.yml")
deploy_text = deploy.read_text(encoding="utf-8")
build_anchor = '''      - name: Build production Worker\n        id: build\n        run: bun run build\n\n      - name: Verify production bundle'''
build_replacement = '''      - name: Build production Worker\n        id: build\n        run: bun run build\n\n      - name: Stamp app service worker with deploy SHA\n        id: stamp_sw\n        shell: bash\n        run: |\n          set -euo pipefail\n          SW_PATH=".output/public/bixbo-push-sw.js"\n          test -f "$SW_PATH" || { echo "Built service worker not found: $SW_PATH"; exit 1; }\n          python3 - "$SW_PATH" "$DEPLOY_SHA" <<'PY'\n          from pathlib import Path\n          import sys\n          path = Path(sys.argv[1])\n          sha = sys.argv[2]\n          text = path.read_text(encoding="utf-8")\n          placeholder = "__BIXBO_DEPLOY_SHA__"\n          if placeholder not in text:\n              raise SystemExit("Service-worker deploy placeholder missing from built output")\n          path.write_text(text.replace(placeholder, sha), encoding="utf-8")\n          PY\n          grep -Fq "$DEPLOY_SHA" "$SW_PATH"\n\n      - name: Verify production bundle'''
if build_anchor not in deploy_text:
    raise RuntimeError("Deploy build anchor missing")
deploy_text = deploy_text.replace(build_anchor, build_replacement, 1)
verify_anchor = '''            grep -q 'BIXBO_PUSH_SW_VERSION' <<<"$sw" || return 1\n            grep -q 'importScripts("/bixbo-offline-runtime.js")' <<<"$sw" || return 1'''
verify_replacement = '''            grep -q 'BIXBO_PUSH_SW_VERSION' <<<"$sw" || return 1\n            grep -Fq "$DEPLOY_SHA" <<<"$sw" || return 1\n            grep -q 'importScripts("/bixbo-offline-runtime.js")' <<<"$sw" || return 1'''
if verify_anchor not in deploy_text:
    raise RuntimeError("Deploy live SW verify anchor missing")
deploy_text = deploy_text.replace(verify_anchor, verify_replacement, 1)
deploy.write_text(deploy_text, encoding="utf-8")

# 6) Keep the existing safety invariant: no focus/visibility polling reload loop.
# Update the regression test to explicitly require the safer SW lifecycle path.
pwa_test = Path("src/lib/__tests__/pwa-lifecycle-reload-regression.test.ts")
pwa_text = pwa_test.read_text(encoding="utf-8")
anchor = '''    expect(shell).not.toContain('useDeploymentFreshness');\n    expect(shell).not.toContain('deploymentFreshness');\n    expect(shell).toContain('import "@/lib/legacyDeploymentRefreshCleanup"');'''
replacement_test = '''    expect(shell).not.toContain('useDeploymentFreshness');\n    expect(shell).not.toContain('deploymentFreshness');\n    expect(shell).toContain('import "@/lib/legacyDeploymentRefreshCleanup"');\n\n    const root = readFileSync("src/routes/__root.tsx", "utf8");\n    const appWorker = readFileSync("src/lib/appServiceWorker.ts", "utf8");\n    const pushWorker = readFileSync("public/bixbo-push-sw.js", "utf8");\n    const deployWorkflow = readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");\n    expect(root).toContain("ensureAppServiceWorker");\n    expect(appWorker).toContain('updateViaCache: "none"');\n    expect(appWorker).toContain("registration.update()");\n    expect(pushWorker).toContain('__BIXBO_DEPLOY_SHA__');\n    expect(pushWorker).toContain("claimClientsAndRefreshForDeployment");\n    expect(pushWorker).toContain("client.navigate");\n    expect(deployWorkflow).toContain("Stamp app service worker with deploy SHA");\n    expect(deployWorkflow).toContain('grep -Fq "$DEPLOY_SHA" <<<"$sw"');'''
if anchor not in pwa_text:
    raise RuntimeError("PWA regression test anchor missing")
pwa_text = pwa_text.replace(anchor, replacement_test, 1)
pwa_test.write_text(pwa_text, encoding="utf-8")

# 7) Add a compact regression contract for the exact two UI complaints.
ui_test = Path("src/lib/__tests__/eyes-recipes-reference-regression.test.ts")
ui_test.write_text('''import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "bun:test";\n\nconst read = (path: string) => readFileSync(path, "utf8");\n\ndescribe("approved Eyes and Recipes UI contracts", () => {\n  it("keeps the Eyes pain controls inside Pain Episodes", () => {\n    const eyes = read("src/features/logging/EyesForm.tsx");\n    const field = read("src/features/logging/EyesEpisodeField.tsx");\n    expect(field).toContain('label="Eyes?"');\n    expect(field).toContain("Yes — log it");\n    expect(eyes).toContain('label="Pain intensity"');\n    expect(eyes).toContain("How intense is the pain?");\n    expect(eyes).toContain('label: "No pain"');\n    expect(eyes).toContain('label: "Feeling something there"');\n    expect(eyes).toContain('label: "Severe pain"');\n    expect(eyes).toContain('label="Pain with eye movement"');\n    expect(eyes).toContain("Does it hurt when you move your eyes?");\n    expect(eyes).toContain("!embedded ? (");\n  });\n\n  it("keeps Recipes paper-card first while retaining on-demand search", () => {\n    const recipes = read("src/features/notes/RecipesView.tsx");\n    const notes = read("src/routes/notes.tsx");\n    expect(notes).toContain('{ key: "recipes" as const, label: "Recipes" }');\n    expect(recipes).toContain("RecipePotSketch");\n    expect(recipes).toContain("RecipeSpoonSketch");\n    expect(recipes).toContain("grid-cols-[0.9fr_1.1fr]");\n    expect(recipes).toContain("touchStart.current");\n    expect(recipes).toContain('t("New recipe")');\n    expect(recipes).toContain("searchOpen");\n    expect(recipes).toContain('aria-expanded={searchOpen}');\n    expect(recipes).toContain('t("Search")');\n  });\n});\n''', encoding="utf-8")

print("Applied Recipes visual, Eyes visibility, and PWA freshness fixes")
