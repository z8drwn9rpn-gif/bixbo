import { Link } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";

export function AdminPublishTab({
  publishPin,
  publishStatus,
  publishing,
  onPinChange,
  onPublish,
}: {
  publishPin: string;
  publishStatus: string;
  publishing: boolean;
  onPinChange: (value: string) => void;
  onPublish: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border/80">
      <p className="font-serif text-lg font-bold">{t("Publish admin configuration")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("Your edits stay device-local until you explicitly publish them globally.")}</p>
      <div className="mt-3 flex gap-2">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={publishPin}
          onChange={(event) => onPinChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder={t("Admin PIN")}
          className="h-10 min-w-0 flex-1 rounded-xl bg-tint px-3 text-center font-bold tracking-[0.35em] ring-1 ring-border"
        />
        <button
          type="button"
          disabled={publishing || publishPin.length !== 4}
          onClick={onPublish}
          className="rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {publishing ? t("Publishing…") : t("Publish globally")}
        </button>
      </div>
      {publishStatus ? <p className="mt-2 text-xs font-semibold text-primary">{publishStatus}</p> : null}
      <Link to="/admin" className="mt-4 block rounded-xl bg-tint px-3 py-2 text-center text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Open full Admin page")}</Link>
    </section>
  );
}
