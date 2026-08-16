import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/hooks/useI18n";
import { TERMS_VERSION } from "@/lib/legalConsent";
import { legalControllerDetails } from "@/lib/legalIdentity";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "BIXBO — Terms of Service" },
    { name: "description", content: "Terms for using the BIXBO personal health diary." },
  ] }),
  component: TermsPage,
});

const COPY = {
  en: {
    title: "Terms of Service", intro: "These terms govern use of BIXBO as a personal health diary and synchronization service.",
    sections: [
      ["The service", "BIXBO lets you record, organize, sync and review information you choose to enter. Features may include reminders, patterns, reports, backups and optional partner sharing."],
      ["Not medical care", "BIXBO is not a medical device, clinician, diagnostic service or emergency service. Its calculations and summaries are informational views of your own logged data and must not be used as a substitute for professional medical advice."],
      ["Your account", "You are responsible for keeping your account and device access secure and for providing accurate information when you choose to enter it. Do not use another person's account without permission."],
      ["Your data", "You keep ownership of the content you enter. You give BIXBO only the permission necessary to store, synchronize, back up and process that content to provide the functions you request. Privacy handling is described separately in the Privacy Policy."],
      ["Partner sharing", "Partner pairing is optional. Use it only with a person you trust. You are responsible for choosing whether to pair and for understanding which categories are exposed by the sharing feature."],
      ["Acceptable use", "Do not attempt to break authentication or security controls, access another user's data, overload the service, distribute malware, or use BIXBO for unlawful activity."],
      ["Availability and changes", "BIXBO may receive security, compatibility and feature updates. Reasonable efforts are made to preserve your data and existing behavior, but uninterrupted availability cannot be guaranteed."],
      ["Paid features", "If paid features or subscriptions are offered, the applicable price, billing period, renewal and cancellation information will be shown before purchase. Mandatory consumer rights are not limited by these terms."],
      ["Ending use", "You may stop using BIXBO at any time. Signed-in users can delete their cloud account from the Privacy Policy page. Cloud-account deletion does not silently erase the separate local copy on the current device."],
      ["Liability", "Nothing in these terms excludes liability that cannot legally be excluded. To the extent permitted by law, BIXBO is provided for personal tracking and is not responsible for medical decisions made instead of obtaining appropriate professional care."],
      ["Law and consumer rights", "Applicable mandatory consumer and data-protection rights continue to apply. These terms do not deprive consumers of protections that cannot be waived under the law applicable to them."],
      ["Changes to these terms", "Material changes will receive a new terms version. New-account acceptance records the version accepted at signup."],
    ], privacy: "Privacy Policy", effective: "Effective", operator: "Service operator",
  },
  sk: {
    title: "Podmienky používania", intro: "Tieto podmienky upravujú používanie BIXBO ako osobného zdravotného denníka a synchronizačnej služby.",
    sections: [
      ["Služba", "BIXBO umožňuje zaznamenávať, organizovať, synchronizovať a prezerať údaje, ktoré sa rozhodneš zadať. Funkcie môžu zahŕňať upozornenia, vzory, reporty, zálohy a voliteľné partnerské zdieľanie."],
      ["Nie je to zdravotná starostlivosť", "BIXBO nie je zdravotnícka pomôcka, lekár, diagnostická ani tiesňová služba. Výpočty a súhrny sú informačné pohľady na tvoje vlastné záznamy a nenahrádzajú odbornú zdravotnú radu."],
      ["Tvoj účet", "Zodpovedáš za ochranu prístupu k účtu a zariadeniu a za údaje, ktoré sa rozhodneš zadať. Nepoužívaj účet inej osoby bez povolenia."],
      ["Tvoje údaje", "Obsah, ktorý zadáš, zostáva tvoj. BIXBO dostáva iba oprávnenie potrebné na jeho uloženie, synchronizáciu, zálohu a spracovanie na funkcie, ktoré používaš. Súkromie je podrobne opísané v Ochrane súkromia."],
      ["Partnerské zdieľanie", "Prepojenie s partnerom je dobrovoľné. Používaj ho iba s osobou, ktorej dôveruješ. Ty rozhoduješ o prepojení a máš rozumieť tomu, ktoré kategórie funkcia zdieľania sprístupňuje."],
      ["Povolené používanie", "Nepokúšaj sa obchádzať autentifikáciu alebo bezpečnostné pravidlá, pristupovať k cudzím údajom, preťažovať službu, šíriť škodlivý softvér ani používať BIXBO na protiprávnu činnosť."],
      ["Dostupnosť a zmeny", "BIXBO môže dostávať bezpečnostné, kompatibilitné a funkčné aktualizácie. Robia sa primerané kroky na zachovanie dát a existujúceho správania, nepretržitú dostupnosť však nemožno garantovať."],
      ["Platené funkcie", "Ak budú ponúkané platené funkcie alebo predplatné, cena, fakturačné obdobie, obnova a podmienky zrušenia sa zobrazia pred nákupom. Povinné spotrebiteľské práva tieto podmienky neobmedzujú."],
      ["Ukončenie používania", "BIXBO môžeš prestať používať kedykoľvek. Prihlásený používateľ môže zmazať cloudový účet na stránke Ochrana súkromia. Zmazanie cloudového účtu potichu nevymaže samostatnú lokálnu kópiu v aktuálnom zariadení."],
      ["Zodpovednosť", "Tieto podmienky nevylučujú zodpovednosť, ktorú zákon zakazuje vylúčiť. V rozsahu povolenom právom je BIXBO určené na osobné sledovanie a nenahrádza primeranú odbornú zdravotnú starostlivosť."],
      ["Právo a spotrebiteľská ochrana", "Povinné spotrebiteľské a dátové práva zostávajú zachované. Tieto podmienky neoberajú spotrebiteľa o ochranu, ktorej sa podľa uplatniteľného práva nemožno vzdať."],
      ["Zmeny podmienok", "Podstatná zmena dostane novú verziu podmienok. Pri vytvorení účtu sa eviduje verzia, ktorú používateľ prijal."],
    ], privacy: "Ochrana súkromia", effective: "Účinné od", operator: "Prevádzkovateľ služby",
  },
} as const;

function TermsPage() {
  const { language } = useI18n();
  const c = COPY[language];
  const controller = legalControllerDetails();
  return <AppShell title={c.title} big>
    <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pb-32 pt-5 lg:px-0 lg:pb-12">
      <p className="text-sm leading-6 text-muted-foreground">{c.intro}</p>
      <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-sm font-semibold text-foreground">{c.operator}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{controller.name}{controller.address ? ` · ${controller.address}` : ""}{controller.email ? ` · ${controller.email}` : ""}</p>
      </section>
      {c.sections.map(([title, body]) => <section key={title} className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></section>)}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{c.effective}: {TERMS_VERSION}</span><Link to={"/privacy" as never} className="font-semibold text-primary underline underline-offset-4">{c.privacy}</Link></div>
    </div>
  </AppShell>;
}
