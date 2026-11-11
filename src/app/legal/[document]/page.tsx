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
        "Who this notice covers",
        "Complyra is a financial record organization and review service intended for adults in India. The service operator’s identity and privacy contact appear below. This notice describes the implemented product controls; it is a draft until the operator completes and approves it.",
      ],
      [
        "Information we process",
        "We process your name, verified email, a salted password hash, session metadata, policy acceptance version, preferences, and the financial records you choose to upload. These records may contain merchant descriptions, transaction dates, amounts and your remarks. Security events record account activity and account identifiers. Never upload passwords, card security codes, or records you are not authorized to share.",
      ],
      [
        "Purpose and choices",
        "We use these records to operate your private workspace, classify and review transactions, provide reports, verify access, prevent abuse, and send requested operational emails. External AI and statement reminder emails are off by default and can be enabled or withdrawn separately in Settings. Withdrawal stops future requests; it does not undo processing that has already occurred.",
      ],
      [
        "Processors and international processing",
        "The deployed service may use Oracle Cloud for storage and an SMTP provider for email. When you enable external AI, summaries, merchant narrations, and your assistant questions can be sent to OpenAI. Long number sequences in categorization requests are redacted, but free text can still contain personal information. Provider location, cross-border safeguards, processor terms and applicable retention settings must be documented by the operator before launch. Do not include unnecessary sensitive information in remarks or questions.",
      ],
      [
        "Retention and deletion",
        "Active account records remain until you delete the account or the operator applies a documented lawful retention requirement. New statement imports replace the active statement. Original uploaded files are processed in memory and are not retained by this application. Workspace audit history is capped at 300 entries, security history at 500 events, and expired verification/reset tokens are pruned during security updates. Account deletion removes the live workspace and account, revokes sessions, and anonymizes the account identity in the retained security event history. Hosting logs, processor copies and backups follow operator-managed retention, which must be published before launch.",
      ],
      [
        "Your controls and requests",
        "You can edit your display name, download your profile and workspace data, change your password, revoke sessions, withdraw optional AI/email choices, and delete your account in Settings. Contact the published privacy contact for email corrections, access, erasure, grievances, or other rights available under applicable Indian law. The operator must verify the requester’s identity and respond within the applicable statutory period.",
      ],
      [
        "Security and incidents",
        "The application uses verified email activation, memory-hard password hashing, revocable server-side sessions, account access rules and isolated workspace records. Production storage requires authenticated encryption and Oracle. No system can promise absolute security. The operator is responsible for access reviews, backups, incident response and legally required notifications.",
      ],
      [
        "Children and changes",
        "This service is intended for users aged 18 and over. Do not provide children’s records without appropriate legal authority. Material changes to processing require an updated notice and any legally required renewed consent; the operator must maintain this notice as the service changes.",
      ],
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      [
        "Operator and eligibility",
        "These terms govern use of Complyra by adults aged 18 or over. The legal operator must be identified below before production registration opens. By registering, you confirm that the information you provide is accurate, that you control the verified email address, and that you have authority to provide uploaded records.",
      ],
      [
        "Your account and records",
        "Protect your password and use a unique passphrase. You remain responsible for checking uploaded data and confirming transaction remarks, classifications and decisions. Accounts may be restricted for abuse, compromised access, or violations of these terms. Access rules may limit which accounts can register or sign in.",
      ],
      [
        "Scope of the service",
        "Complyra organizes uploaded INR statements and provides informational analytics, review prompts and optional AI assistance. It does not hold or move money, connect directly to bank accounts, file statutory returns, act as a regulated financial adviser, or certify legal or tax compliance. Consult a qualified professional when necessary. Automated findings are indicators requiring review, and AI output may be inaccurate.",
      ],
      [
        "Permitted use and ownership",
        "You retain rights to your uploaded records and grant the operator permission to process them to provide the requested service, subject to the privacy notice. Do not use the service for unauthorized access, fraud, harassment, unlawful surveillance, malicious uploads, or rights infringement. See the acceptable use policy.",
      ],
      [
        "Availability and changes",
        "Availability depends on the operator’s infrastructure and configured providers. Export important records and retain original statements. Material changes, paid features, and new processing purposes require appropriate notice and additional terms or consent where required. No subscription or payment commitment is created by these draft terms.",
      ],
      [
        "Closing your account",
        "You can export records and delete your account from Settings after confirming your password. The operator must handle any lawful retention, complaints and outstanding obligations according to the privacy notice and applicable law.",
      ],
      [
        "Applicable law and grievances",
        "The intended operating jurisdiction is India. Mandatory consumer and data protection rights remain available. Contact the published operator contact for complaints or grievances. These draft terms do not select a court, impose arbitration, or limit statutory remedies; final dispute and commercial terms require operator and legal review.",
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
    entity && contact && process.env.LEGAL_POLICIES_APPROVED === "true",
  );
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        ← Complyra
      </Link>
      <p className="mt-10 text-xs uppercase tracking-widest text-ink/50">
        India · Policy version 2026-11-04
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">
        {content.title}
      </h1>
      {!approved && (
        <p
          role="note"
          className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-700"
        >
          Draft for operator and legal review. Business identity, contact,
          provider details and retention arrangements are not yet finalized.
          Production registration remains closed until the operator completes
          and approves these policies.
        </p>
      )}
      <div className="my-7 rounded-xl border border-ink/15 p-4 text-sm leading-7">
        <p>Operator: {entity || "Not yet specified"}</p>
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
        Indian data protection obligations have phased effective dates. The
        operator must confirm which provisions apply to its deployment and
        processing activities.{" "}
        <a
          className="underline"
          href="https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa"
        >
          Official MeitY DPDP Rules
        </a>
        .
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
