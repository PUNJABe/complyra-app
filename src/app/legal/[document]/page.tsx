import Link from "next/link";
import { notFound } from "next/navigation";
const documents: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  privacy: {
    title: "Privacy notice",
    sections: [
      [
        "Who operates Complyra",
        "Complyra is the public name of this service. These notices do not identify whether a separate legal entity operates it. The service operator can be contacted at the privacy and grievances address shown above. This service is intended for adults and is designed around INR-denominated financial records.",
      ],
      [
        "Information we process",
        "We process your name and email address, a salted password hash (not your password), email-verification and password-reset tokens, session and security events, the version and time of your policy acceptance, account preferences, and the transaction records you choose to import. Transaction data can include dates, amounts, merchant descriptions, categories and your remarks. The service does not need your bank password, card security code, or online-banking credentials; do not upload them or records you are not authorized to share.",
      ],
      [
        "How information is used",
        "We use account and transaction information to provide your private workspace, import and organize records, generate reports, authenticate users, protect the service, and send verification or password-reset emails you request. External AI assistance and statement reminder emails are off by default and have separate controls in Settings. Turning either off stops future optional processing or reminders; it cannot undo processing already completed.",
      ],
      [
        "Service providers and processing locations",
        "GitHub Pages serves the static website, Render hosts the API in Singapore, Neon hosts the encrypted application database in the United States (US East), and Resend sends verification and password-reset emails. These providers may process technical request data to deliver and secure their services and are subject to their own terms and privacy notices. When you explicitly enable external AI assistance, the relevant statement summary, merchant narration, or assistant message is sent to OpenAI to produce the requested response. Long number sequences in some categorization requests are redacted, but free-text remarks and questions can still contain personal information. Do not include unnecessary sensitive details. Provider infrastructure or support may involve other locations; information may therefore be processed outside your country, subject to applicable law.",
      ],
      [
        "Retention and deletion",
        "Imported transaction records and account data remain in the active service until you delete your account or deletion is otherwise required by law. A new statement import replaces the active statement. The original CSV or Excel file is processed in memory and is not retained by the application; the extracted records are saved to your workspace. Verification and reset links expire after 30 minutes. Sessions expire after 30 minutes of inactivity and no later than seven days after creation. Account deletion removes the live account and workspace, revokes sessions and pending tokens, and replaces the account email in existing security events with a deleted-account label. Provider logs and backups may persist under the providers' own retention schedules and are not immediately removed by this application.",
      ],
      [
        "Your choices and privacy requests",
        "In Settings you can update your display name, export your profile and workspace data, change your password, revoke sessions, turn off optional AI or reminder email, and delete your account. You may also contact the address above to request access, correction, erasure, or help with a grievance. We may ask for information needed to verify that a request is yours and will handle it under applicable law.",
      ],
      [
        "Security and incidents",
        "Passwords are processed using salted scrypt hashes. Application records are encrypted with AES-256-GCM before being stored, and production connections use HTTPS/TLS. Accounts require email verification; sessions can be revoked and workspace records are separated by account. No system can promise absolute security. If a security incident affects your information, the operator will take steps required by applicable law.",
      ],
      [
        "Children and notice changes",
        "The service is for people aged 18 and over. Do not submit a child's personal information. We will update this notice when our data practices materially change and obtain any renewed consent required by law. The policy version and effective date appear above.",
      ],
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      [
        "Operator and eligibility",
        "Complyra is the public service name; these terms do not identify whether a separate legal entity operates it. The service operator's contact address is shown above. These terms apply to adults aged 18 or over. By registering, you confirm that your details are accurate, that you control the email address you verify, and that you have authority to provide uploaded records.",
      ],
      [
        "Your account and records",
        "Keep your password private and use a unique passphrase. Your account becomes active only after email verification. You are responsible for the accuracy and lawful use of your records and for reviewing transaction categories, remarks and other output. The operator may suspend access to protect accounts, address abuse, or comply with law.",
      ],
      [
        "Scope of the service",
        "Complyra organizes INR-denominated CSV and Excel statements and provides informational analytics, review prompts and optional AI assistance. It does not connect to your bank, hold or move money, file statutory returns, or provide regulated financial, investment, tax or legal advice. Reports and automated classifications can be incomplete or wrong; review them against your source records and consult a qualified professional where needed. AI assistance is optional and may produce inaccurate output.",
      ],
      [
        "Permitted use and ownership",
        "You retain your rights to uploaded records. You give the operator a limited permission to receive, store, process and display those records only as needed to provide, secure and support the service described in the privacy notice. You must not use Complyra for unauthorized access, fraud, harassment, unlawful surveillance, malicious uploads, or infringement of another person's rights. The acceptable use policy also applies.",
      ],
      [
        "Availability and changes",
        "The service depends on third-party hosting and email providers and may be interrupted, changed, or discontinued. Keep your original statements and export important records. We will publish material changes to these terms and obtain additional consent where required by law. No payment obligation is created by these terms.",
      ],
      [
        "Closing your account",
        "You can export your records and delete your account from Settings after confirming your password. Account deletion removes active account and workspace data as described in the privacy notice; provider logs and backups may remain under their own retention schedules. Terms that by their nature need to continue, and any mandatory legal obligations, remain in effect.",
      ],
      [
        "Disclaimers and grievances",
        "To the extent permitted by applicable law, Complyra is provided without a promise of uninterrupted availability or error-free output. Nothing in these terms excludes liability or limits consumer, privacy, or other rights that cannot lawfully be excluded. For questions or complaints, contact the address above. These terms do not require arbitration or waive any statutory remedy.",
      ],
    ],
  },
  cookies: {
    title: "Cookie and local storage notice",
    sections: [
      [
        "Essential session cookie",
        "The complyra_session cookie contains a random session identifier. It is HttpOnly, SameSite=Lax and Secure in production, with a maximum seven-day lifetime. The corresponding session expires after 30 minutes of inactivity, is revocable server-side and does not contain your password or role. It is necessary to provide authenticated features.",
      ],
      [
        "Local preferences",
        "The interface may store your theme preference locally in your browser. This application does not load advertising trackers or third-party analytics scripts. Admin analytics are aggregate counts of operational records. Additional hosting/provider tracking, if introduced, must be disclosed by the operator and obtain consent when legally required.",
      ],
      [
        "Your browser choices",
        "You can clear cookies and local storage through your browser settings. Removing the session cookie signs you out. Essential cookies are used only for the requested account functionality.",
      ],
    ],
  },
  "acceptable-use": {
    title: "Acceptable use policy",
    sections: [
      [
        "Authorized financial records",
        "Upload only records you own or are authorized to process. Minimize personal information and do not upload credentials, authentication secrets, or card security codes.",
      ],
      [
        "Prohibited activity",
        "Do not attempt unauthorized access, credential stuffing, malware distribution, denial of service, data extraction from other accounts, unlawful profiling, fraud or circumvention of access restrictions. Do not intentionally submit misleading remarks or use output to deceive auditors or regulators.",
      ],
      [
        "Responsible reporting",
        "Report suspected vulnerabilities privately to the operator’s published contact. Avoid accessing other people’s records or disrupting the service. Permission for security testing requires a written scope from the operator.",
      ],
      [
        "Enforcement",
        "The operator may investigate abuse, restrict accounts and preserve records where legally required. Automated flags alone do not establish fraud or legal wrongdoing. Enforcement and grievances must follow applicable Indian law.",
      ],
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(documents).map((document) => ({ document }));
}
export default async function LegalPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  const content = documents[document];
  if (!content) notFound();
  const entity = process.env.LEGAL_ENTITY_NAME;
  const contact = process.env.PRIVACY_CONTACT_EMAIL;
  const approved = Boolean(
    contact && process.env.LEGAL_POLICIES_APPROVED === "true",
  );
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        ← Complyra
      </Link>
      <p className="mt-10 text-xs uppercase tracking-widest text-ink/50">
        India · Policy version 2026-11-12
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">
        {content.title}
      </h1>
      {!approved && (
        <p
          role="note"
          className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-700"
        >
          Draft for operator and legal review. Publish a working privacy
          contact, confirm these notices describe current service practices,
          and approve them before opening registration.
        </p>
      )}
      <div className="my-7 rounded-xl border border-ink/15 p-4 text-sm leading-7">
        <p>Public service name: Complyra</p>
        {entity && <p>Legal entity: {entity}</p>}
        <p>
          Privacy and grievances:{" "}
          {contact ? (
            <a className="underline" href={`mailto:${contact}`}>
              {contact}
            </a>
          ) : (
            "Contact to be published before launch"
          )}
        </p>
      </div>
      {content.sections.map(([title, text]) => (
        <section key={title} className="mt-8">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-8 text-ink/65">{text}</p>
        </section>
      ))}
      <p className="mt-10 text-xs leading-7 text-ink/50">
        These notices describe current Complyra service practices and do not
        limit rights available under applicable law. See the{" "}
        <a
          className="underline"
          href="https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa"
        >
          official MeitY Digital Personal Data Protection Rules
        </a>
        , and contact the operator for privacy requests or grievances.
      </p>
      <nav className="mt-9 flex flex-wrap gap-5 border-t border-ink/10 pt-6 text-xs">
        {Object.entries(documents).map(([key, value]) => (
          <Link key={key} href={`/legal/${key}`}>
            {value.title}
          </Link>
        ))}
      </nav>
    </main>
  );
}
