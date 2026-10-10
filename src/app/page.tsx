import DistrictArt from "@/components/DistrictArt";
import MobileMenu from "@/components/MobileMenu";
import MotionToggle from "@/components/MotionToggle";
import StoryStage from "@/components/StoryStage";
import SiteFooter from "@/components/SiteFooter";

const NAV = [
  { href: "#story", label: "Story" },
  { href: "#districts", label: "Districts" },
  { href: "#principles", label: "Principles" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
];

const CHAPTERS = [
  {
    id: "ground",
    num: "01",
    label: "Ground",
    title: "We start with the soil, not the skyline.",
    body: "Before a single pile is driven we map water, wind and the species already living on the plot. The masterplan bends around them.",
    side: "right",
  },
  {
    id: "rise",
    num: "02",
    label: "Rise",
    title: "Glass where light matters. Timber everywhere else.",
    body: "Mass-timber cores and triple-glazed skins go up in weeks, not years — prefabricated within 80 km of the site.",
    side: "left",
  },
  {
    id: "bloom",
    num: "03",
    label: "Bloom",
    title: "Every floor is a planting plan.",
    body: "Terraces, facade troughs and roof meadows are engineered into the structure from day one, irrigated by rain the building catches itself.",
    side: "right",
  },
  {
    id: "dusk",
    num: "04",
    label: "Dusk",
    title: "A district that keeps living after hours.",
    body: "When the light goes, the gardens keep cooling the streets and the windows come on one by one. This is what we hand over: a neighbourhood, already alive.",
    side: "left",
  },
] as const;

const DISTRICTS = [
  {
    kind: "quay",
    name: "Lumen Quay",
    place: "Harbourfront · 14 towers",
    text: "A former container wharf turned into fourteen glass-and-timber towers stepping down to the water, linked by planted bridges.",
    stats: [
      ["38,000 m²", "planted facade"],
      ["2,400", "homes"],
      ["2022", "completed"],
    ],
  },
  {
    kind: "spire",
    name: "Verdant Spire",
    place: "Hillside · 1 tower, 61 floors",
    text: "The tallest timber-hybrid in the region, wrapped in nine sky gardens that residents tend together, one every seven floors.",
    stats: [
      ["61", "floors"],
      ["9", "sky gardens"],
      ["2025", "completed"],
    ],
  },
  {
    kind: "commons",
    name: "Fernhill Commons",
    place: "Former rail yard · 22 low-rises",
    text: "Twenty-two low-rise blocks around a restored meadow, with car-free streets and a school that opens onto the wildflowers.",
    stats: [
      ["11 ha", "restored meadow"],
      ["0", "through-traffic streets"],
      ["since 2026", "in construction"],
    ],
  },
] as const;

const PRINCIPLES = [
  { num: "40%", title: "Plant first", text: "Planting is drawn before floor plans. Forty per cent of every plot stays open soil." },
  { num: "90%", title: "Catch every drop", text: "Roof meadows and cisterns hold nine-tenths of rainfall on site and feed the facade gardens." },
  { num: "−62%", title: "Build light", text: "Mass timber stores carbon instead of emitting it: embodied CO₂ is down 62% against concrete." },
  { num: "80 km", title: "Stay nearby", text: "Eighty per cent of components are made within 80 km of the site, by people who live there." },
];

const IMPACT = [
  { value: "1.2 M", label: "plants established across our districts" },
  { value: "−4.1 °C", label: "street-level summer temperature" },
  { value: "62%", label: "less embodied carbon than concrete" },
  { value: "214", label: "species recorded on our sites" },
];

const PROCESS = [
  { title: "Listen", text: "Six months of site ecology surveys and resident workshops before any drawing." },
  { title: "Draw", text: "A masterplan drawn around existing trees, water flows and prevailing wind." },
  { title: "Prefabricate", text: "Timber cassettes and planters built off-site, within 80 km." },
  { title: "Rise", text: "Structure and skin in under twenty weeks per tower, with almost no site waste." },
  { title: "Tend", text: "We stay on as gardeners for ten years, then hand the tools to residents." },
];

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="site-header">
        <a href="#main" className="brand" aria-label="Skybloom, back to top">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
            <rect x="9" y="8" width="6" height="20" rx="1" fill="currentColor" />
            <rect x="17" y="13" width="6" height="15" rx="1" fill="currentColor" opacity="0.75" />
            <circle cx="12" cy="7" r="4" fill="var(--color-moss)" />
            <circle cx="21" cy="12" r="3" fill="var(--color-bloom)" />
          </svg>
          <span>Skybloom</span>
        </a>
        <nav aria-label="Main" className="site-nav">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <MotionToggle />
        <MobileMenu nav={NAV} cta={{ href: "#contact", label: "Talk to us" }} />
      </header>

      <main id="main" tabIndex={-1}>
        {/* ---------------- 3D story: hero + four chapters over the sticky district ---------------- */}
        <section id="story" data-story aria-labelledby="hero-title" className="story">
          <StoryStage />
          <div className="story__content">
            <div className="hero">
              <div className="hero__inner">
                <p className="eyebrow">Eco-city developer · est. 2014</p>
                <h1 id="hero-title" className="hero__title">
                  Cities that <em>grow</em> back.
                </h1>
                <p className="hero__lede">
                  Skybloom builds glass-and-timber districts where every tower carries its own garden. Scroll to watch one rise.
                </p>
                <div className="hero__actions">
                  <a className="btn btn--solid" href="#districts">
                    See our districts
                  </a>
                  <a className="btn btn--ghost" href="#contact">
                    Talk to us
                  </a>
                </div>
              </div>
              <p className="hero__hint" aria-hidden="true">
                <span className="hero__hint-line" /> Scroll to grow the district
              </p>
            </div>

            {CHAPTERS.map((c) => (
              <article key={c.id} id={c.id} className={`chapter chapter--${c.side}`} aria-labelledby={`${c.id}-title`}>
                <div className={`chapter__card ${c.id === "dusk" ? "chapter__card--dusk" : ""}`}>
                  <p className="chapter__num">
                    <span>{c.num}</span> {c.label}
                  </p>
                  <h2 id={`${c.id}-title`} className="chapter__title">
                    {c.title}
                  </h2>
                  <p className="chapter__body">{c.body}</p>
                </div>
              </article>
            ))}
            <div className="story__tail" />
          </div>
        </section>

        {/* ---------------- Districts ---------------- */}
        <section id="districts" className="band band--paper" aria-labelledby="districts-title">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Built &amp; building</p>
              <h2 id="districts-title" className="section-title">
                Three districts, <em>one idea</em>.
              </h2>
              <p className="section-lede">Each place is different. The rule is the same: the garden is part of the structure, not added at the end.</p>
            </div>
            <ul className="districts">
              {DISTRICTS.map((d) => (
                <li key={d.name} className="district">
                  <div className="district__art">
                    <DistrictArt kind={d.kind} />
                  </div>
                  <div className="district__body">
                    <p className="district__place">{d.place}</p>
                    <h3 className="district__name">{d.name}</h3>
                    <p className="district__text">{d.text}</p>
                    <dl className="district__stats">
                      {d.stats.map(([value, label]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- Principles ---------------- */}
        <section id="principles" className="band band--paper-2" aria-labelledby="principles-title">
          <div className="wrap principles-grid">
            <div className="section-head section-head--sticky">
              <p className="eyebrow">Principles</p>
              <h2 id="principles-title" className="section-title">
                How we <em>build</em>.
              </h2>
              <p className="section-lede">Four rules we do not negotiate on, written into every contract we sign.</p>
            </div>
            <ol className="principles">
              {PRINCIPLES.map((p) => (
                <li key={p.title} className="principle">
                  <p className="principle__num">{p.num}</p>
                  <div>
                    <h3 className="principle__title">{p.title}</h3>
                    <p className="principle__text">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Impact ---------------- */}
        <section id="impact" className="band band--dusk" aria-labelledby="impact-title">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow eyebrow--light">Impact, audited yearly</p>
              <h2 id="impact-title" className="section-title section-title--light">
                Measured, <em>not promised</em>.
              </h2>
            </div>
            <dl className="impact">
              {IMPACT.map((item) => (
                <div key={item.label} className="impact__item">
                  <dt className="impact__label">{item.label}</dt>
                  <dd className="impact__value">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- Process ---------------- */}
        <section id="process" className="band band--paper" aria-labelledby="process-title">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Process</p>
              <h2 id="process-title" className="section-title">
                From plot to <em>neighbourhood</em>.
              </h2>
              <p className="section-lede">Five steps, roughly three years, and a decade of looking after what we planted.</p>
            </div>
            <ol className="process">
              {PROCESS.map((step, i) => (
                <li key={step.title} className="process__step">
                  <span className="process__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="process__title">{step.title}</h3>
                  <p className="process__text">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Contact ---------------- */}
        <section id="contact" className="band band--ink" aria-labelledby="contact-title">
          <div className="wrap contact">
            <div>
              <p className="eyebrow eyebrow--light">Contact</p>
              <h2 id="contact-title" className="section-title section-title--light">
                Plant a district <em>with us</em>.
              </h2>
              <p className="section-lede section-lede--light">
                Partnering on a plot, a policy or a pilot? Our team answers every message within two working days.
              </p>
            </div>
            <ul className="contact__links">
              <li>
                <a className="contact__link" href="mailto:kyan775909@gmail.com">
                  <span>Email</span>
                  <span className="contact__value">kyan775909@gmail.com</span>
                </a>
              </li>
              <li>
                <a className="contact__link" href="https://wa.me/79193999749" target="_blank" rel="noopener noreferrer">
                  <span>WhatsApp</span>
                  <span className="contact__value">+7 919 399-97-49</span>
                </a>
              </li>
              <li>
                <a className="contact__link" href="https://t.me/hassan_9400" target="_blank" rel="noopener noreferrer">
                  <span>Telegram</span>
                  <span className="contact__value">@hassan_9400</span>
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter nav={NAV} />
    </>
  );
}
