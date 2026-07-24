import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, todayKey } from "@/lib/storage";

export const Route = createFileRoute("/todo")({
  head: () => ({
    meta: [
      { title: "Úlohy — BIXBO" },
      { name: "description", content: "Prehľad úloh naprieč dňami." },
      { property: "og:title", content: "Úlohy — BIXBO" },
      { property: "og:description", content: "Prehľad úloh naprieč dňami." },
    ],
  }),
  component: TodoOverview,
});

function TodoOverview() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const days = Object.entries(view.todos)
    .filter(([, arr]) => arr && arr.length > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const tKey = todayKey();

  return (
    <AppShell title="Úlohy">
      <div className="space-y-4 px-5 pt-4">
        <Link
          to="/day/$date"
          params={{ date: tKey }}
          className="block rounded-3xl bg-primary/10 p-4 text-primary ring-1 ring-primary/30"
        >
          <p className="text-xs uppercase tracking-wider">Dnes</p>
          <p className="font-serif text-lg">Otvoriť dnešné úlohy →</p>
        </Link>

        {days.length === 0 && (
          <p className="text-sm text-muted-foreground">Zatiaľ žiadne úlohy. Otvor deň v kalendári a pridaj úlohu.</p>
        )}
        {days.map(([date, arr]) => {
          const done = arr.filter((t) => t.done).length;
          return (
            <Link key={date} to="/day/$date" params={{ date }} className="block rounded-3xl bg-surface p-4 ring-1 ring-border">
              <div className="flex items-center justify-between">
                <p className="font-serif text-lg">
                  {new Date(date).toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <span className="text-xs text-muted-foreground">{done}/{arr.length}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {arr.slice(0, 4).map((t) => (
                  <li key={t.id} className={`text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
                    • {t.text}
                  </li>
                ))}
                {arr.length > 4 && <li className="text-xs text-muted-foreground">+ {arr.length - 4} ďalších</li>}
              </ul>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
