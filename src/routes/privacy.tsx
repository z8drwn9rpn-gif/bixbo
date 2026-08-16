import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { PRIVACY_VERSION, HEALTH_CONSENT_VERSION } from "@/lib/legalConsent";
import { legalControllerDetails } from "@/lib/legalIdentity";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "BIXBO — Privacy Policy" },
      { name: "description", content: "How BIXBO processes and protects personal and health data." },
    ],
  }),
  component: PrivacyPage,
});

type Copy = {
  title: string;
  intro: string;
  controller: string;
  controllerMissing: string;
  dataTitle: string;
  data: string;
  purposeTitle: string;
  purpose: string;
  basisTitle: string;
  basis: string;
  sharingTitle: string;
  sharing: string;
  processorsTitle: string;
  processors: string;
  analyticsTitle: string;
  analytics: string;
  retentionTitle: string;
  retention: string;
  rightsTitle: string;
  rights: string;
  securityTitle: string;
  security: string;
  localTitle: string;
  local: string;
  medicalTitle: string;
  medical: string;
  accountTitle: string;
  accountText: string;
  deleteAccount: string;
  confirmDelete: string;
  deleteWorking: string;
  localKept: string;
  notSignedIn: string;
  terms: string;
  effective: string;
};

const COPY: Record<"en" | "sk", Copy> = {
  en: {
    title: "Privacy Policy",
    intro: "BIXBO is a personal health diary. This notice explains what data is processed, why it is processed and the controls you have.",
    controller: "Data controller",
    controllerMissing: "The legal name, postal address and privacy contact of the controller must be configured before public or commercial distribution. This build does not invent those legal details.",
    dataTitle: "Data BIXBO processes",
    data: "Depending on what you choose to record, BIXBO may process account information, health and symptom logs, cycle and reproductive information, medication records, notes, appointments, relationship/partner-sharing data, notification settings, backups and device push-subscription data. Health data and data concerning sex life can be special-category personal data under EU data-protection law.",
    purposeTitle: "Why the data is processed",
    purpose: "The data is used to provide the diary, sync your own devices, calculate the views and patterns you request, create backups, deliver notifications you enable, and share only the categories you explicitly choose with a paired partner. BIXBO does not use health entries for advertising.",
    basisTitle: "Legal basis and health-data consent",
    basis: `Account and service processing is carried out to provide the service you request. Where EU special-category health data requires an Article 9 condition, BIXBO records a separate explicit consent (health-consent version ${HEALTH_CONSENT_VERSION}). You can withdraw that cloud-processing consent by deleting your cloud account below; the cloud account and data linked to it are deleted.`,
    sharingTitle: "Partner sharing",
    sharing: "Pairing does not make your whole diary public. Only categories configured for partner sharing are made available to the paired account. You control whether you pair and what the product exposes through that sharing feature.",
    processorsTitle: "Infrastructure and processors",
    processors: "The production application is hosted on Cloudflare Workers. Supabase provides the BIXBO-owned database, authentication, realtime services, backups and Edge Functions. Push delivery also involves the push service operated by the browser/platform provider. These services process technical data only as necessary to provide those functions.",
    analyticsTitle: "Product analytics",
    analytics: "Product analytics are off by default. If you opt in, BIXBO stores only a strict event name and timestamp for a small allow-list of product events. The analytics table contains no BIXBO user ID, page path, health value, diagnosis, medication name, note text, partner data, device fingerprint or free-form payload.",
    retentionTitle: "Retention",
    retention: "Cloud account data is kept while the account exists and is removed when the cloud account is deleted, subject to limited infrastructure logs or backups that a processor may retain for its documented security/recovery period. Local diary data remains on your device until you remove it or clear the browser/app storage.",
    rightsTitle: "Your rights",
    rights: "Subject to applicable law, you may have rights of access, correction, deletion, portability, restriction, objection where relevant, withdrawal of consent and complaint to your competent data-protection authority. BIXBO already provides portable data export in the Health/Profile area and direct cloud-account deletion on this page.",
    securityTitle: "Security",
    security: "BIXBO uses authenticated access, row-level database policies, encrypted HTTPS transport and separated server secrets. No software can promise absolute security; keep your device and account credentials protected.",
    localTitle: "Local data",
    local: "Deleting a cloud account deliberately does not erase the health diary stored locally on this device. This prevents an account-management action from unexpectedly destroying your local records. Local data can be managed separately from the app's data controls.",
    medicalTitle: "Not medical advice",
    medical: "BIXBO records and summarizes information you enter. It is not a doctor, emergency service or substitute for professional medical diagnosis or treatment.",
    accountTitle: "Delete cloud account",
    accountText: "This permanently deletes your authenticated BIXBO cloud account and cloud data linked to it. Your local device copy is kept.",
    deleteAccount: "Delete cloud account",
    confirmDelete: "Tap again to permanently delete the cloud account",
    deleteWorking: "Deleting cloud account…",
    localKept: "Cloud account deleted. Local BIXBO data on this device was kept.",
    notSignedIn: "Sign in to use direct cloud-account deletion.",
    terms: "Terms of Service",
    effective: "Effective",
  },
  sk: {
    title: "Ochrana súkromia",
    intro: "BIXBO je osobný zdravotný denník. Toto oznámenie vysvetľuje, aké údaje sa spracúvajú, prečo a aké možnosti kontroly máš.",
    controller: "Prevádzkovateľ osobných údajov",
    controllerMissing: "Pred verejným alebo komerčným sprístupnením treba doplniť právny názov, poštovú adresu a kontakt pre súkromie. Táto verzia si tieto právne údaje nevymýšľa.",
    dataTitle: "Aké údaje BIXBO spracúva",
    data: "Podľa toho, čo si zvolíš zapisovať, môže BIXBO spracúvať údaje účtu, zdravotné a symptomatické záznamy, údaje o cykle a reprodukčnom zdraví, liekoch, poznámkach, termínoch, párovom zdieľaní, notifikáciách, zálohách a push registrácii zariadenia. Zdravotné údaje a údaje o sexuálnom živote môžu byť podľa práva EÚ osobitnou kategóriou osobných údajov.",
    purposeTitle: "Na čo sa údaje používajú",
    purpose: "Údaje sa používajú na fungovanie denníka, synchronizáciu tvojich zariadení, výpočty a prehľady, ktoré si vyžiadaš, zálohy, tebou zapnuté upozornenia a zdieľanie iba výslovne zvolených kategórií s prepojeným partnerom. BIXBO nepoužíva zdravotné záznamy na reklamu.",
    basisTitle: "Právny základ a súhlas so zdravotnými údajmi",
    basis: `Údaje účtu a služby sa spracúvajú na poskytnutie služby, ktorú používaš. Ak osobitná kategória zdravotných údajov v EÚ vyžaduje podmienku podľa článku 9 GDPR, BIXBO eviduje samostatný výslovný súhlas (verzia ${HEALTH_CONSENT_VERSION}). Súhlas s cloudovým spracúvaním môžeš odvolať zmazaním cloudového účtu nižšie; účet a naň viazané cloudové údaje sa zmažú.`,
    sharingTitle: "Zdieľanie s partnerom",
    sharing: "Prepojenie partnera nesprístupní celý denník. Párovému účtu sú dostupné iba kategórie určené pre partnerské zdieľanie. Ty rozhoduješ, či sa prepojíš a čo sa cez túto funkciu zdieľa.",
    processorsTitle: "Infraštruktúra a sprostredkovatelia",
    processors: "Produkčná aplikácia beží na Cloudflare Workers. Supabase poskytuje BIXBO databázu, autentifikáciu, realtime služby, zálohy a Edge Functions. Pri push upozorneniach sa používa aj push služba poskytovateľa prehliadača alebo platformy. Tieto služby spracúvajú technické údaje iba v rozsahu potrebnom na danú funkciu.",
    analyticsTitle: "Produktová analytika",
    analytics: "Produktová analytika je predvolene vypnutá. Ak ju dobrovoľne zapneš, BIXBO uloží iba názov udalosti z pevne povoleného zoznamu a čas. Analytická tabuľka neobsahuje BIXBO user ID, URL obrazovky, zdravotné hodnoty, diagnózy, názvy liekov, text poznámok, partnerské údaje, fingerprint zariadenia ani voľný payload.",
    retentionTitle: "Doba uchovávania",
    retention: "Cloudové údaje účtu sa uchovávajú počas existencie účtu a odstránia sa pri zmazaní cloudového účtu, s výhradou obmedzených infraštruktúrnych logov alebo záloh, ktoré môže sprostredkovateľ držať počas svojej zdokumentovanej bezpečnostnej/obnovovacej lehoty. Lokálny denník zostáva v zariadení, kým ho neodstrániš alebo nevymažeš úložisko aplikácie/prehliadača.",
    rightsTitle: "Tvoje práva",
    rights: "Podľa uplatniteľného práva môžeš mať právo na prístup, opravu, vymazanie, prenosnosť, obmedzenie, námietku tam, kde sa uplatňuje, odvolanie súhlasu a sťažnosť príslušnému dozornému orgánu. BIXBO už poskytuje prenosný export v Health/Profile a priame zmazanie cloudového účtu na tejto stránke.",
    securityTitle: "Bezpečnosť",
    security: "BIXBO používa autentifikovaný prístup, databázové RLS pravidlá, šifrovaný HTTPS prenos a oddelené serverové tajomstvá. Žiadny softvér nevie zaručiť absolútnu bezpečnosť; chráň si zariadenie a prihlasovacie údaje.",
    localTitle: "Lokálne údaje",
    local: "Zmazanie cloudového účtu zámerne nevymaže zdravotný denník uložený lokálne v tomto zariadení. Zabraňuje to tomu, aby správa účtu nečakane zničila lokálne záznamy. Lokálne údaje sa spravujú samostatne v dátových nastaveniach aplikácie.",
    medicalTitle: "Nie je to lekárska rada",
    medical: "BIXBO zaznamenáva a sumarizuje údaje, ktoré zadáš. Nie je lekár, tiesňová služba ani náhrada odbornej diagnostiky alebo liečby.",
    accountTitle: "Zmazať cloudový účet",
    accountText: "Natrvalo zmaže autentifikovaný BIXBO cloudový účet a cloudové údaje naň naviazané. Lokálna kópia v zariadení zostane zachovaná.",
    deleteAccount: "Zmazať cloudový účet",
    confirmDelete: "Ťukni ešte raz pre trvalé zmazanie cloudového účtu",
    deleteWorking: "Mažem cloudový účet…",
    localKept: "Cloudový účet bol zmazaný. Lokálne BIXBO údaje v tomto zariadení zostali zachované.",
    notSignedIn: "Pre priame zmazanie cloudového účtu sa prihlás.",
    terms: "Podmienky používania",
    effective: "Účinné od",
  },
};

function PrivacyPage() {
  const { language } = useI18n();
  const c = COPY[language];
  const controller = useMemo(() => legalControllerDetails(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    return () => { active = false; };
  }, []);

  const deleteCloudAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setStatus("");
    try {
      const { data, error } = await supabase.functions.invoke("account-privacy", {
        body: { action: "delete-account" },
      });
      if (error || !data?.ok) throw error ?? new Error("Account deletion failed.");
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSignedIn(false);
      setConfirmDelete(false);
      setStatus(c.localKept);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  };

  const sections = [
    [c.dataTitle, c.data], [c.purposeTitle, c.purpose], [c.basisTitle, c.basis],
    [c.sharingTitle, c.sharing], [c.processorsTitle, c.processors], [c.analyticsTitle, c.analytics],
    [c.retentionTitle, c.retention], [c.rightsTitle, c.rights], [c.securityTitle, c.security],
    [c.localTitle, c.local], [c.medicalTitle, c.medical],
  ];

  return <AppShell title={c.title} big>
    <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pb-32 pt-5 lg:px-0 lg:pb-12">
      <p className="text-sm leading-6 text-muted-foreground">{c.intro}</p>
      <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-sm font-semibold text-foreground">{c.controller}</h2>
        <p className="mt-2 text-sm text-foreground">{controller.name}</p>
        {controller.address ? <p className="mt-1 text-sm text-muted-foreground">{controller.address}</p> : null}
        {controller.email ? <a className="mt-1 block text-sm font-medium text-primary underline underline-offset-4" href={`mailto:${controller.email}`}>{controller.email}</a> : null}
        {!controller.complete ? <p role="note" className="mt-3 rounded-2xl border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-xs leading-5 text-destructive">{c.controllerMissing}</p> : null}
      </section>
      {sections.map(([title, body]) => <section key={title} className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></section>)}
      <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-sm font-semibold text-foreground">{c.accountTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.accountText}</p>
        {signedIn ? <Button type="button" variant="destructive" disabled={deleting} onClick={() => void deleteCloudAccount()} className="mt-4 min-h-11 w-full sm:w-auto">{deleting ? c.deleteWorking : confirmDelete ? c.confirmDelete : c.deleteAccount}</Button> : <p className="mt-3 text-xs text-muted-foreground">{c.notSignedIn}</p>}
        {status ? <p role="status" className="mt-3 text-xs leading-5 text-muted-foreground">{status}</p> : null}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{c.effective}: {PRIVACY_VERSION}</span>
        <Link to={"/terms" as never} className="font-semibold text-primary underline underline-offset-4">{c.terms}</Link>
      </div>
    </div>
  </AppShell>;
}
