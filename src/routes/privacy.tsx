import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  HEALTH_CONSENT_VERSION,
  PRIVACY_VERSION,
  clearLocalCloudHealthConsentWithdrawn,
  cloudHealthConsentState,
  markLocalCloudHealthConsentWithdrawn,
  type CloudHealthConsentState,
} from "@/lib/legalConsent";
import { legalControllerDetails } from "@/lib/legalIdentity";
import {
  acceptCurrentLegalTerms,
  deleteCloudAccount,
  downloadCloudDataExport,
  grantCloudHealthConsent,
  withdrawCloudHealthConsent,
} from "@/lib/accountPrivacy";
import { useI18n } from "@/hooks/useI18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "BIXBO — Privacy Policy" },
      { name: "description", content: "How BIXBO processes and protects personal and health data." },
    ],
  }),
  component: PrivacyPage,
});

const COPY = {
  en: {
    title: "Privacy Policy",
    intro: "BIXBO is a personal health diary. This notice explains what data is processed, why it is processed and the controls you have.",
    controller: "Data controller",
    controllerMissing: "The legal name, postal address and privacy contact of the controller must be configured before public or commercial distribution. This build does not invent those legal details.",
    dataTitle: "Data BIXBO processes",
    data: "Depending on what you choose to record, BIXBO may process account information, health and symptom logs, cycle and reproductive information, medication records, notes, appointments, relationship/partner-sharing data, notification settings, backups and device push-subscription data. Health data and data concerning sex life can be special-category personal data under EU data-protection law.",
    purposeTitle: "Why the data is processed",
    purpose: "The data is used to provide the diary, sync your own devices, calculate the views and patterns you request, create backups, deliver notifications you enable, and share only the narrow categories exposed by the Couple feature with a paired partner. BIXBO does not use health entries for advertising.",
    basisTitle: "Legal basis and health-data consent",
    basis: `Account/service processing is used to provide the service you request. Cloud processing of special-category health data is separately gated by explicit consent (current health-consent version ${HEALTH_CONSENT_VERSION}). Withdrawing that consent keeps the account and local diary but blocks new cloud-health processing and removes the BIXBO cloud diary, cloud backups, partner-shared health projection and health-reminder cloud state.`,
    sharingTitle: "Partner sharing",
    sharing: "Pairing does not expose the whole diary. The Couple backend receives only its narrow shared projection; private notes, sex, food, bowel, mood, workouts, sleep, weight, labs, documents and the complete private diary are not copied into that projection.",
    processorsTitle: "Infrastructure and processors",
    processors: "The production application is hosted on Cloudflare Workers. Supabase provides the BIXBO-owned database, authentication, realtime services, backups and Edge Functions. Push delivery also involves the push service operated by the browser/platform provider. Technical infrastructure data may be processed only as needed to provide and secure those functions.",
    analyticsTitle: "Product analytics",
    analytics: "Product analytics are off by default. If you opt in, BIXBO stores only an allow-listed content-free event name and timestamp. The analytics table contains no BIXBO user ID, page path, health value, diagnosis, medication name, note text, partner data, device fingerprint or free-form payload. Product-analytics rows are automatically deleted after 90 days.",
    retentionTitle: "Retention",
    retention: "Cloud diary data is kept while the relevant cloud processing remains enabled and the account exists. Withdrawing health-data consent removes BIXBO cloud health content while retaining the account and legal-consent record; deleting the account removes user-linked application rows through database cascades. Product analytics are retained for no more than 90 days. Limited infrastructure logs or processor recovery copies may remain for the processor's documented security/recovery period. Local diary data remains on your device until you remove it or clear app/browser storage.",
    rightsTitle: "Your rights",
    rights: "Subject to applicable law, you may have rights of access, correction, deletion, portability, restriction, objection where relevant, withdrawal of consent and complaint to your competent data-protection authority. BIXBO provides a complete local JSON export, an authenticated cloud-data export, separate health-consent withdrawal/re-consent and direct cloud-account deletion.",
    securityTitle: "Security",
    security: "BIXBO uses authenticated access, row-level database policies, HTTPS transport, separated server secrets and fail-closed cloud-health policies when explicit consent is not active. No software can promise absolute security; keep your device and account credentials protected.",
    localTitle: "Local data",
    local: "Cloud consent/account actions deliberately do not erase the diary stored locally on this device. This prevents a cloud-account action from unexpectedly destroying local health records. Local data can be exported or removed separately from BIXBO data controls.",
    medicalTitle: "Not medical advice",
    medical: "BIXBO records and summarizes information you enter. It is not a doctor, emergency service or substitute for professional medical diagnosis or treatment.",
    cloudControls: "Cloud privacy controls",
    exportText: "Download an authenticated copy of BIXBO cloud account data. Web Push authentication secrets are excluded from the export.",
    exportButton: "Download cloud data",
    exporting: "Preparing cloud export…",
    legacyTitle: "Finish cloud legal setup",
    legacyText: "This existing account predates BIXBO's versioned legal-consent record. Cloud health processing stays blocked until you separately accept the current Terms, acknowledge this Privacy Policy and explicitly consent to cloud processing of the health/special-category data you choose to store.",
    acceptTerms: "I accept the current Terms of Service.",
    acknowledgePrivacy: "I have read and acknowledge the current Privacy Policy.",
    explicitHealth: "I explicitly consent to cloud processing of the health and other special-category data I choose to store so diary sync, backups, reminders and sharing can work.",
    recordLegal: "Record these choices",
    recording: "Recording choices…",
    consentTitle: "Health-data cloud consent",
    consentActive: "Explicit health-data cloud consent is active. You can withdraw it without deleting your account.",
    withdrawText: "Withdrawal blocks further authenticated cloud-health reads/writes and removes the current BIXBO cloud diary, backups, partner-shared health projection and health-reminder cloud state. Your local diary remains on this device.",
    withdraw: "Withdraw health-data consent",
    confirmWithdraw: "Tap again to confirm withdrawal",
    withdrawing: "Withdrawing consent…",
    withdrawn: "Health-data cloud consent is withdrawn. Cloud health processing remains blocked until you explicitly consent again. Your account and local diary can remain.",
    regrant: "Explicitly consent again",
    granting: "Recording consent…",
    accountTitle: "Delete cloud account",
    accountText: "This permanently deletes your authenticated BIXBO cloud account and user-linked application data. Your local device copy is kept.",
    deleteAccount: "Delete cloud account",
    confirmDelete: "Tap again to permanently delete the cloud account",
    deleteWorking: "Deleting cloud account…",
    localKept: "Cloud account deleted. Local BIXBO data on this device was kept.",
    withdrawnDone: "Health-data consent was withdrawn and cloud health data was removed. The local diary was kept. You have been signed out of cloud sync.",
    notSignedIn: "Sign in to use authenticated cloud privacy controls.",
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
    purpose: "Údaje sa používajú na fungovanie denníka, synchronizáciu tvojich zariadení, výpočty a prehľady, zálohy, tebou zapnuté upozornenia a úzky rozsah údajov zdieľaných cez Couple. BIXBO nepoužíva zdravotné záznamy na reklamu.",
    basisTitle: "Právny základ a súhlas so zdravotnými údajmi",
    basis: `Údaje účtu a služby sa spracúvajú na poskytnutie služby. Cloudové spracúvanie osobitnej kategórie zdravotných údajov je samostatne podmienené výslovným súhlasom (aktuálna verzia ${HEALTH_CONSENT_VERSION}). Odvolanie súhlasu ponechá účet a lokálny denník, ale zablokuje nové cloudové spracúvanie zdravotných údajov a odstráni cloudový denník, cloudové zálohy, partnerskú health projekciu a cloudový stav zdravotných pripomienok.`,
    sharingTitle: "Zdieľanie s partnerom",
    sharing: "Prepojenie partnera nesprístupní celý denník. Couple backend dostáva iba úzku zdieľanú projekciu; súkromné poznámky, sex, jedlo, stolica, nálada, cvičenie, spánok, hmotnosť, lab výsledky, dokumenty ani celý súkromný denník sa do nej nekopírujú.",
    processorsTitle: "Infraštruktúra a sprostredkovatelia",
    processors: "Produkčná aplikácia beží na Cloudflare Workers. Supabase poskytuje BIXBO databázu, autentifikáciu, realtime služby, zálohy a Edge Functions. Pri push upozorneniach sa používa aj push služba poskytovateľa prehliadača alebo platformy. Technické infraštruktúrne údaje sa môžu spracúvať iba v rozsahu potrebnom na fungovanie a zabezpečenie týchto služieb.",
    analyticsTitle: "Produktová analytika",
    analytics: "Produktová analytika je predvolene vypnutá. Ak ju dobrovoľne zapneš, BIXBO uloží iba povolený názov obsahovo prázdnej udalosti a čas. Analytická tabuľka neobsahuje BIXBO user ID, URL obrazovky, zdravotné hodnoty, diagnózy, názvy liekov, text poznámok, partnerské údaje, fingerprint zariadenia ani voľný payload. Analytické riadky sa automaticky mažú po 90 dňoch.",
    retentionTitle: "Doba uchovávania",
    retention: "Cloudový denník sa uchováva počas aktívneho príslušného cloudového spracúvania a existencie účtu. Odvolanie health consent odstráni BIXBO cloudový zdravotný obsah a ponechá účet a právny záznam o súhlase; zmazanie účtu odstráni používateľské aplikačné riadky cez databázové cascades. Produktová analytika sa uchováva najviac 90 dní. Obmedzené infraštruktúrne logy alebo recovery kópie môžu zostať počas zdokumentovanej lehoty sprostredkovateľa. Lokálny denník zostáva v zariadení, kým ho neodstrániš alebo nevymažeš úložisko aplikácie/prehliadača.",
    rightsTitle: "Tvoje práva",
    rights: "Podľa uplatniteľného práva môžeš mať právo na prístup, opravu, vymazanie, prenosnosť, obmedzenie, námietku tam, kde sa uplatňuje, odvolanie súhlasu a sťažnosť príslušnému dozornému orgánu. BIXBO poskytuje kompletný lokálny JSON export, autentifikovaný cloudový export, samostatné odvolanie/opätovné udelenie health consent a priame zmazanie cloudového účtu.",
    securityTitle: "Bezpečnosť",
    security: "BIXBO používa autentifikovaný prístup, databázové RLS pravidlá, HTTPS prenos, oddelené serverové tajomstvá a fail-closed cloud-health pravidlá, keď nie je aktívny výslovný súhlas. Žiadny softvér nevie zaručiť absolútnu bezpečnosť; chráň si zariadenie a prihlasovacie údaje.",
    localTitle: "Lokálne údaje",
    local: "Cloudové consent/account akcie zámerne nevymažú denník uložený lokálne v tomto zariadení. Zabraňuje to tomu, aby správa cloud účtu nečakane zničila lokálne zdravotné záznamy. Lokálne údaje môžeš samostatne exportovať alebo odstrániť v dátových nastaveniach BIXBO.",
    medicalTitle: "Nie je to lekárska rada",
    medical: "BIXBO zaznamenáva a sumarizuje údaje, ktoré zadáš. Nie je lekár, tiesňová služba ani náhrada odbornej diagnostiky alebo liečby.",
    cloudControls: "Cloudové privacy ovládanie",
    exportText: "Stiahni si autentifikovanú kópiu údajov BIXBO cloudového účtu. Tajné Web Push autentifikačné údaje sa do exportu nezahŕňajú.",
    exportButton: "Stiahnuť cloudové údaje",
    exporting: "Pripravujem cloudový export…",
    legacyTitle: "Dokonči právne nastavenie cloudu",
    legacyText: "Tento existujúci účet vznikol ešte pred verziovaným legal-consent záznamom BIXBO. Cloudové spracúvanie zdravotných údajov zostane zablokované, kým samostatne neprijmeš aktuálne Podmienky, nepotvrdíš túto Ochranu súkromia a neudelíš výslovný súhlas s cloudovým spracúvaním zdravotných/osobitných údajov, ktoré sa rozhodneš uložiť.",
    acceptTerms: "Súhlasím s aktuálnymi Podmienkami používania.",
    acknowledgePrivacy: "Prečítala/prečítal som si a beriem na vedomie aktuálnu Ochranu súkromia.",
    explicitHealth: "Výslovne súhlasím s cloudovým spracúvaním zdravotných a ďalších údajov osobitnej kategórie, ktoré sa rozhodnem uložiť, aby mohli fungovať sync, zálohy, pripomienky a zdieľanie.",
    recordLegal: "Uložiť tieto voľby",
    recording: "Ukladám voľby…",
    consentTitle: "Cloudový súhlas so zdravotnými údajmi",
    consentActive: "Výslovný súhlas s cloudovým spracúvaním zdravotných údajov je aktívny. Môžeš ho odvolať bez zmazania účtu.",
    withdrawText: "Odvolanie zablokuje ďalšie autentifikované cloud-health čítanie/zápis a odstráni aktuálny BIXBO cloudový denník, zálohy, partnerskú health projekciu a cloudový stav zdravotných pripomienok. Lokálny denník zostane v tomto zariadení.",
    withdraw: "Odvolať súhlas so zdravotnými údajmi",
    confirmWithdraw: "Ťukni ešte raz na potvrdenie odvolania",
    withdrawing: "Odvolávam súhlas…",
    withdrawn: "Cloudový súhlas so zdravotnými údajmi je odvolaný. Cloudové zdravotné spracúvanie zostane zablokované, kým znovu výslovne nesúhlasíš. Účet a lokálny denník môžu zostať.",
    regrant: "Znovu výslovne súhlasiť",
    granting: "Ukladám súhlas…",
    accountTitle: "Zmazať cloudový účet",
    accountText: "Natrvalo zmaže autentifikovaný BIXBO cloudový účet a používateľské aplikačné údaje naň naviazané. Lokálna kópia v zariadení zostane zachovaná.",
    deleteAccount: "Zmazať cloudový účet",
    confirmDelete: "Ťukni ešte raz pre trvalé zmazanie cloudového účtu",
    deleteWorking: "Mažem cloudový účet…",
    localKept: "Cloudový účet bol zmazaný. Lokálne BIXBO údaje v tomto zariadení zostali zachované.",
    withdrawnDone: "Súhlas so zdravotnými údajmi bol odvolaný a cloudové zdravotné údaje boli odstránené. Lokálny denník zostal zachovaný. Z cloudového syncu si odhlásená/odhlásený.",
    notSignedIn: "Pre autentifikované cloudové privacy ovládanie sa prihlás.",
    terms: "Podmienky používania",
    effective: "Účinné od",
  },
} as const;

function PrivacyPage() {
  const { language } = useI18n();
  const c = COPY[language];
  const controller = useMemo(() => legalControllerDetails(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [consentState, setConsentState] = useState<CloudHealthConsentState>("signed-out");
  const [busy, setBusy] = useState<"export" | "legacy" | "withdraw" | "grant" | "delete" | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState("");
  const [legacyTerms, setLegacyTerms] = useState(false);
  const [legacyPrivacy, setLegacyPrivacy] = useState(false);
  const [legacyHealth, setLegacyHealth] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const isSignedIn = Boolean(data.session);
      setSignedIn(isSignedIn);
      if (isSignedIn) {
        try {
          const state = await cloudHealthConsentState();
          if (active) setConsentState(state);
        } catch (error) {
          if (active) setStatus(error instanceof Error ? error.message : String(error));
        }
      }
    });
    return () => { active = false; };
  }, []);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind);
    setStatus("");
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const acceptLegacy = () => run("legacy", async () => {
    await acceptCurrentLegalTerms();
    clearLocalCloudHealthConsentWithdrawn();
    setConsentState("active");
    window.location.reload();
  });

  const withdraw = () => {
    if (!confirmWithdraw) {
      setConfirmWithdraw(true);
      return;
    }
    void run("withdraw", async () => {
      await withdrawCloudHealthConsent();
      markLocalCloudHealthConsentWithdrawn();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSignedIn(false);
      setConsentState("signed-out");
      setConfirmWithdraw(false);
      setStatus(c.withdrawnDone);
    });
  };

  const regrant = () => run("grant", async () => {
    await grantCloudHealthConsent();
    clearLocalCloudHealthConsentWithdrawn();
    setConsentState("active");
    window.location.reload();
  });

  const deleteAccount = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    void run("delete", async () => {
      await deleteCloudAccount();
      clearLocalCloudHealthConsentWithdrawn();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSignedIn(false);
      setConfirmDelete(false);
      setStatus(c.localKept);
    });
  };

  const sections = [
    [c.dataTitle, c.data],
    [c.purposeTitle, c.purpose],
    [c.basisTitle, c.basis],
    [c.sharingTitle, c.sharing],
    [c.processorsTitle, c.processors],
    [c.analyticsTitle, c.analytics],
    [c.retentionTitle, c.retention],
    [c.rightsTitle, c.rights],
    [c.securityTitle, c.security],
    [c.localTitle, c.local],
    [c.medicalTitle, c.medical],
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
        <h2 className="text-sm font-semibold text-foreground">{c.cloudControls}</h2>
        {signedIn ? <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{c.exportText}</p>
          <Button type="button" variant="outline" disabled={busy != null} onClick={() => void run("export", downloadCloudDataExport)} className="min-h-11 w-full sm:w-auto">{busy === "export" ? c.exporting : c.exportButton}</Button>

          {consentState === "missing" ? <div className="rounded-2xl border border-border bg-tint p-4">
            <h3 className="text-sm font-semibold text-foreground">{c.legacyTitle}</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.legacyText}</p>
            <div className="mt-4 space-y-3 text-xs leading-5 text-foreground">
              <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={legacyTerms} onChange={(event) => setLegacyTerms(event.target.checked)} /><span>{c.acceptTerms} <Link to={"/terms" as never} className="font-semibold text-primary underline underline-offset-4">{c.terms}</Link></span></label>
              <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={legacyPrivacy} onChange={(event) => setLegacyPrivacy(event.target.checked)} /><span>{c.acknowledgePrivacy}</span></label>
              <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={legacyHealth} onChange={(event) => setLegacyHealth(event.target.checked)} /><span>{c.explicitHealth}</span></label>
            </div>
            <Button type="button" disabled={busy != null || !legacyTerms || !legacyPrivacy || !legacyHealth} onClick={() => void acceptLegacy()} className="mt-4 min-h-11 w-full sm:w-auto">{busy === "legacy" ? c.recording : c.recordLegal}</Button>
          </div> : null}

          {consentState === "active" ? <div className="rounded-2xl border border-border bg-tint p-4">
            <h3 className="text-sm font-semibold text-foreground">{c.consentTitle}</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.consentActive}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.withdrawText}</p>
            <Button type="button" variant="destructive" disabled={busy != null} onClick={withdraw} className="mt-4 min-h-11 w-full sm:w-auto">{busy === "withdraw" ? c.withdrawing : confirmWithdraw ? c.confirmWithdraw : c.withdraw}</Button>
          </div> : null}

          {consentState === "withdrawn" ? <div className="rounded-2xl border border-border bg-tint p-4">
            <h3 className="text-sm font-semibold text-foreground">{c.consentTitle}</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.withdrawn}</p>
            <Button type="button" disabled={busy != null} onClick={() => void regrant()} className="mt-4 min-h-11 w-full sm:w-auto">{busy === "grant" ? c.granting : c.regrant}</Button>
          </div> : null}
        </div> : <p className="mt-3 text-xs text-muted-foreground">{c.notSignedIn}</p>}
      </section>

      <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-sm font-semibold text-foreground">{c.accountTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.accountText}</p>
        {signedIn ? <Button type="button" variant="destructive" disabled={busy != null} onClick={deleteAccount} className="mt-4 min-h-11 w-full sm:w-auto">{busy === "delete" ? c.deleteWorking : confirmDelete ? c.confirmDelete : c.deleteAccount}</Button> : <p className="mt-3 text-xs text-muted-foreground">{c.notSignedIn}</p>}
        {status ? <p role="status" className="mt-3 text-xs leading-5 text-muted-foreground">{status}</p> : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{c.effective}: {PRIVACY_VERSION}</span>
        <Link to={"/terms" as never} className="font-semibold text-primary underline underline-offset-4">{c.terms}</Link>
      </div>
    </div>
  </AppShell>;
}
