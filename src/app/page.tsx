import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleCheck,
  FileUp,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";

const services = [
  {
    icon: FileUp,
    title: "Bring your statements together",
    text: "Import CSV and Excel statements into one private workspace. Keep your latest financial picture within reach.",
    tag: "Statement management",
  },
  {
    icon: Layers3,
    title: "Give every payment a purpose",
    text: "Categorize familiar merchants automatically. Review unclear payments with a remark, and save your own merchant rules.",
    tag: "Transaction intelligence",
  },
  {
    icon: BarChart3,
    title: "See where your money goes",
    text: "Explore spending patterns, department breakdowns and possible duplicates using your uploaded records.",
    tag: "Analytics & reporting",
  },
  {
    icon: MessageSquareText,
    title: "A little help, right beside you",
    text: "Ask questions about your statement. Opt in to AI assistance for category suggestions and finance explanations.",
    tag: "Finance assistant",
  },
  {
    icon: ShieldCheck,
    title: "Build a clearer review trail",
    text: "Keep transaction decisions and policy changes together, with a history you can revisit before reporting.",
    tag: "Compliance workspace",
  },
  {
    icon: LockKeyhole,
    title: "Stay in control of your data",
    text: "Verified email access, private workspaces, downloadable records and account controls put you in charge.",
    tag: "Privacy & access",
  },
];
export default function Home() {
  return (
    <div className="marketing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-nav wrap">
        <Link className="wordmark" href="/">
          <span className="brand-icon">
            <Layers3 size={22} />
          </span>
          complyra<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
          <Link href="/auth/login">Sign in</Link>
        </nav>
        <div className="site-actions">
          <ThemeToggle />
          <Link href="/auth/register" className="button button-small">
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> YOUR FINANCES. A CLEARER PICTURE.
            </p>
            <h1>
              Make sense of
              <br />
              every <em>transaction.</em>
            </h1>
            <p className="hero-description">
              Less time sorting statements. More clarity on what matters. Meet
              your workspace for smarter spending, confident reviews, and
              everyday financial control.
            </p>
            <div className="hero-actions">
              <Link href="/auth/register" className="button">
                Create your workspace <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="text-link">
                Take a closer look <ArrowDownIcon />
              </a>
            </div>
            <p className="hero-note">
              <ShieldCheck size={15} /> Verify your email. Keep your workspace
              private.
            </p>
          </div>
          <div
            className="product-preview"
            aria-label="Illustrative product preview"
          >
            <div className="preview-top">
              <span className="preview-logo">c.</span>
              <span>
                My workspace <span className="preview-slash">/</span> Overview
              </span>
              <span className="sample-label">ILLUSTRATIVE DATA</span>
            </div>
            <div className="preview-body">
              <div className="preview-heading">
                <div>
                  <p>THE BIG PICTURE</p>
                  <h2>A little more clarity.</h2>
                </div>
                <span className="preview-period">This month ↗</span>
              </div>
              <div className="preview-metrics">
                <div>
                  <span>Total expenses</span>
                  <strong>
                    ₹48,250<span>.00</span>
                  </strong>
                  <small>Across 64 transactions</small>
                </div>
                <div>
                  <span>Ready for review</span>
                  <strong>03</strong>
                  <small className="amber-text">
                    Your context makes a difference
                  </small>
                </div>
              </div>
              <div className="preview-chart">
                <div className="chart-label">
                  Spending at a glance <span>Last 6 months</span>
                </div>
                <div className="bars">
                  {[34, 58, 43, 76, 53, 66].map((height, index) => (
                    <div key={index}>
                      <span style={{ height: `${height}%` }} />
                      <small>
                        {["May", "Jun", "Jul", "Aug", "Sep", "Oct"][index]}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="preview-transaction">
                <span className="transaction-icon">
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>A payment needs your context</strong>
                  <p>Add a remark to confirm its category.</p>
                </div>
                <CircleCheck size={21} />
              </div>
            </div>
            <div className="preview-float">
              <span>
                <Check size={16} />
              </span>
              <div>
                From statement to understanding.
                <small>One thoughtful decision at a time.</small>
              </div>
            </div>
          </div>
        </section>
        <section className="value-strip">
          <div className="wrap">
            <span>BUILT FOR THE WAY YOU MANAGE MONEY</span>
            <p>
              Individuals <span>✧</span> Finance teams <span>✧</span> Growing
              businesses <span>✧</span> Accounting workflows
            </p>
          </div>
        </section>
        <section id="services" className="services wrap section-space">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ONE WORKSPACE. MORE UNDERSTANDING.</p>
              <h2>
                From scattered records
                <br />
                to informed decisions.
              </h2>
            </div>
            <p>
              The tools to organize, understand and review your finances -
              connected in one place.
            </p>
          </div>
          <div className="service-grid">
            {services.map(({ icon: Icon, title, text, tag }, index) => (
              <article className="service-card" key={title}>
                <div className="service-icon">
                  <Icon size={23} />
                  <span>0{index + 1}</span>
                </div>
                <p className="service-tag">{tag}</p>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="workflow section-space">
          <div className="wrap">
            <p className="eyebrow">A SIMPLE ROUTINE, A BETTER PICTURE</p>
            <h2>Upload. Understand. Stay on top.</h2>
            <div className="workflow-grid">
              {[
                [
                  "01",
                  "Start with your statement",
                  "Create your account, verify your email, then upload a CSV or Excel statement.",
                ],
                [
                  "02",
                  "Add the context only you know",
                  "Review flagged payments, confirm categories and teach your workspace your preferences.",
                ],
                [
                  "03",
                  "Make the next decision clearer",
                  "Explore reports, ask the assistant, and use 24-hour update reminders to keep your records current.",
                ],
              ].map(([number, title, text]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="security" className="security-section wrap section-space">
          <div className="security-visual">
            <div className="shield-orbit">
              <ShieldCheck size={66} strokeWidth={1.25} />
            </div>
            <span className="security-caption">
              YOUR WORKSPACE. YOUR CONTROL.
            </span>
            <div className="security-pills">
              <span>
                <LockKeyhole size={14} /> Verified access
              </span>
              <span>
                <CircleCheck size={14} /> Human review
              </span>
            </div>
          </div>
          <div>
            <p className="eyebrow">THOUGHTFULLY PROTECTED</p>
            <h2>
              Financial data deserves
              <br />
              careful handling.
            </h2>
            <p className="section-description">
              Access is verified. Workspaces are private. You choose whether to
              use external AI assistance, and you can export your records or
              delete your account.
            </p>
            <ul className="security-list">
              <li>
                <Check size={17} /> Email verification before account activation
              </li>
              <li>
                <Check size={17} /> Revocable sessions and controlled admin
                access
              </li>
              <li>
                <Check size={17} /> Clear privacy choices and reviewable
                decisions
              </li>
            </ul>
            <Link className="text-link" href="/legal/privacy">
              Read our privacy notice <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="faq-section wrap section-space">
          <div>
            <p className="eyebrow">A FEW THINGS TO KNOW</p>
            <h2>Clarity starts here.</h2>
          </div>
          <div className="faq-list">
            {[
              [
                "Do I need to sign in to explore?",
                "You can explore this website freely. Sign in with a verified email to upload statements and use your private workspace.",
              ],
              [
                "Which statements can I upload?",
                "CSV, XLSX and XLS files up to 5 MB, with up to 2,000 transactions. Include transaction dates, amounts and merchant descriptions. PDF import is not currently supported.",
              ],
              [
                "Will AI make decisions for me?",
                "AI assistance is optional. Doubtful transactions require your remarks and category confirmation. Suggestions and risk signals should be checked against your source records.",
              ],
              [
                "Does Complyra replace my accountant?",
                "Complyra helps organize and review financial records. It does not provide professional tax, legal or investment advice, submit filings, or certify regulatory compliance.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="cta-section wrap">
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER, MORE ORGANIZED.</p>
            <h2>
              Let your numbers
              <br />
              tell a clearer story.
            </h2>
          </div>
          <div>
            <Link href="/auth/register" className="button button-light">
              Get started with Complyra <ArrowRight size={18} />
            </Link>
            <p>One workspace for your financial everyday.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer wrap">
        <div>
          <Link className="wordmark" href="/">
            complyra.
          </Link>
          <p>A clearer way to work with your finances.</p>
        </div>
        <nav aria-label="Legal">
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/acceptable-use">Acceptable use</Link>
        </nav>
        <span>© {new Date().getFullYear()} Complyra</span>
      </footer>
    </div>
  );
}
function ArrowDownIcon() {
  return <span aria-hidden="true">↓</span>;
}
