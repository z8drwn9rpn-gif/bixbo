import { Link } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { Section, ToggleRow } from "./shared";

const COPY = {
  en: {
    title: "Privacy & legal",
    analytics: "Anonymous product analytics",
    analyticsHelp: "Optional and off by default. BIXBO records only allow-listed content-free product events — never health values, notes, page paths or user IDs.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  sk: {
    title: "Súkromie a právne informácie",
    analytics: "Anonymná produktová analytika",
    analyticsHelp: "Dobrovoľná a predvolene vypnutá. BIXBO zaznamenáva iba povolené obsahovo prázdne produktové udalosti — nikdy zdravotné hodnoty, poznámky, URL obrazovky ani user ID.",
    privacy: "Ochrana súkromia",
    terms: "Podmienky používania",
  },
} as const;

export function PrivacyLegalControls({
  analytics,
  onAnalyticsChange,
}: {
  analytics: boolean;
  onAnalyticsChange: (value: boolean) => void;
}) {
  const { language } = useI18n();
  const c = COPY[language];

  return (
    <Section title={c.title}>
      <ToggleRow label={c.analytics} checked={analytics} onChange={onAnalyticsChange} />
      <p className="text-xs leading-relaxed text-muted-foreground">{c.analyticsHelp}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          to={"/privacy" as never}
          className="flex min-h-11 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {c.privacy}
        </Link>
        <Link
          to={"/terms" as never}
          className="flex min-h-11 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {c.terms}
        </Link>
      </div>
    </Section>
  );
}
