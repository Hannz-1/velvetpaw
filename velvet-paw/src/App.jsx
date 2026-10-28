import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import "./App.css";

// Drop your images in src/assets. They are matched by a keyword in the file name,
// so exact names don't matter (e.g. "puppy.jpg", "lavender.png", "doodle.png", "shed-it.png").
const FILES = import.meta.glob("./assets/*.{png,jpg,jpeg,webp,avif}", { eager: true });
const pick = (...keys) => {
  // keys are tried in order, so the first keyword wins
  for (const k of keys) {
    const hit = Object.entries(FILES).find(([path]) => path.toLowerCase().includes(k));
    if (hit) return hit[1].default;
  }
  return "";
};

const IMAGES = {
  hero: pick("puppy", "yorkie"),
  lavender: pick("lavender", "sensitive"),
  doodle: pick("doodle", "spray", "detangl"),
  shedit: pick("shed"),
};

const PRODUCTS = [
  { tag: "Gentle cleansing", name: "Sensitive coat care", img: IMAGES.lavender, tone: "lavender" },
  { tag: "Coat preparation", name: "Daily Doodle", img: IMAGES.doodle, tone: "pink" },
  { tag: "Coat-specific care", name: "Shed It", img: IMAGES.shedit, tone: "peach" },
];

const SERVICES = [
  ["The Velvet Full Groom", "A wash, dry and brush-out, followed by a tailored cut, nails, ears and finishing touches."],
  ["Bath, Brush & Finish", "A gentle cleanse, condition, dry and brush-out for a fresh, tidy coat."],
  ["Shed-Control Groom", "Thorough coat care to remove loose hair and look after shedding and double coats."],
  ["Puppy Introductions", "A gentle introduction to grooming, building confidence at your puppy's pace."],
  ["Hand Stripping & Specialist Styling", "Specialist care and finishing for coats that need a different approach."],
];

const PROMISES = ["Plant-based", "Organic-only", "Rapeseed oil-free"];

const EASE = [0.22, 1, 0.36, 1];

/* ───────── small building blocks ───────── */

function Logo() {
  const reduce = useReducedMotion();
  return (
    <div className="logo">
      <span className="logo__mark">
        {/* the gold paw pops in once, just after load */}
        <motion.span
          className="logo__paw"
          aria-hidden="true"
          initial={{ scale: reduce ? 1 : 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 11, delay: reduce ? 0 : 1 }}
        />
        VP
      </span>
      <span className="logo__text">
        <span className="logo__name">The Velvet Paw</span>
        <span className="logo__place">Kettering</span>
      </span>
    </div>
  );
}

function BookingButton() {
  return (
    <button className="btn" type="button" disabled aria-disabled="true">
      Online booking coming soon
    </button>
  );
}

/* Headline whose lines rise out of a mask. lines = [[text, isItalic, isSage]] */
function Heading({ as = "h2", id, className, lines, inView = false }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const stagger = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.14 } } };
  const rise = {
    hidden: { y: reduce ? "0%" : "110%" },
    show: { y: "0%", transition: { duration: reduce ? 0 : 0.9, ease: EASE } },
  };
  const trigger = inView
    ? { initial: "hidden", whileInView: "show", viewport: { once: false, amount: 0.6 } }
    : {};
  return (
    <Tag id={id} className={className} variants={stagger} {...trigger}>
      {lines.map(([text, italic, sage]) => {
        const Wrap = italic ? "em" : "span";
        return (
          <Wrap key={text} className={`line ${sage ? "em--sage" : ""}`}>
            <motion.span className="line__in" variants={rise}>
              {text}
            </motion.span>
          </Wrap>
        );
      })}
    </Tag>
  );
}

/* A single paw print for the footprint trail */
function Paw({ left, top, rotate, reduce }) {
  return (
    <motion.svg
      className="paw"
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ left, top, rotate }}
      variants={{
        hidden: { opacity: 0, scale: reduce ? 1 : 0.4 },
        show: { opacity: 0.55, scale: 1, transition: { duration: reduce ? 0 : 0.45, ease: EASE } },
      }}
    >
      <ellipse cx="32" cy="43" rx="14" ry="11" />
      <ellipse cx="13" cy="29" rx="6" ry="8" transform="rotate(-22 13 29)" />
      <ellipse cx="25" cy="17" rx="6" ry="8" transform="rotate(-7 25 17)" />
      <ellipse cx="39" cy="17" rx="6" ry="8" transform="rotate(7 39 17)" />
      <ellipse cx="51" cy="29" rx="6" ry="8" transform="rotate(22 51 29)" />
    </motion.svg>
  );
}

const TRAIL = [
  ["2%", "58%", 78],
  ["16%", "10%", 102],
  ["30%", "58%", 80],
  ["44%", "10%", 100],
  ["58%", "58%", 78],
  ["72%", "10%", 102],
  ["86%", "58%", 80],
];

function PawTrail({ reduce }) {
  return (
    <motion.div
      className="cta__trail"
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.8 }}
      transition={{ staggerChildren: reduce ? 0 : 0.28 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.28 } } }}
      aria-hidden="true"
    >
      {TRAIL.map(([left, top, rotate]) => (
        <Paw key={left} left={left} top={top} rotate={rotate} reduce={reduce} />
      ))}
    </motion.div>
  );
}

const wrap = (min, max, v) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/* Ticker that speeds up when you scroll and runs backwards when you scroll up */
function Marquee({ reduce }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const boost = useTransform(smooth, [0, 1000], [0, 5], { clamp: false });
  const dir = useRef(1);
  const x = useTransform(baseX, (v) => `${v}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < 0) dir.current = -1;
    else if (b > 0) dir.current = 1;
    let move = dir.current * -1.7 * (delta / 1000);
    move += dir.current * move * Math.abs(b);
    baseX.set(wrap(-50, 0, baseX.get() + move));
  });

  const group = (key) => (
    <div className="marquee__group" key={key} aria-hidden={key === "b"}>
      {[...Array(4)].flatMap((_, r) =>
        PROMISES.map((p) => (
          <span className="marquee__item" key={`${r}-${p}`}>
            {p}
          </span>
        ))
      )}
    </div>
  );
  return (
    <div className="marquee" role="list" aria-label="Our promises">
      <motion.div className="marquee__track" style={{ x }}>
        {group("a")}
        {group("b")}
      </motion.div>
    </div>
  );
}

/* One product at a time on phones: swipe, tap the arrows, or tap a dot */
function ProductSlider({ reduce }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(PRODUCTS.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <ul className="products" ref={ref} onScroll={onScroll} aria-label="Peanut & Pickle products">
        {PRODUCTS.map((p, i) => (
          <motion.li
            key={p.name}
            className="product"
            initial={{ opacity: 0, y: reduce ? 0 : 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.35 }}
            transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : i * 0.05 }}
            aria-label={`${i + 1} of ${PRODUCTS.length}`}
          >
            <div className="product__card">
              <div className={`product__img product__img--${p.tone}`}>
                {p.img ? (
                  <img src={p.img} alt={`Peanut & Pickle ${p.name}`} loading="lazy" draggable="false" />
                ) : (
                  <span className="product__ph">Add product image</span>
                )}
              </div>
              <div className="product__text">
                <p className="eyebrow eyebrow--gold">{p.tag}</p>
                <h3>{p.name}</h3>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="slider__ui">
        <button className="slider__btn" type="button" aria-label="Previous product" disabled={active === 0} onClick={() => go(active - 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="slider__dots" role="group" aria-label="Choose product">
          {PRODUCTS.map((p, i) => (
            <button key={p.name} type="button" className="slider__dotbtn" aria-label={p.name} aria-current={active === i} onClick={() => go(i)}>
              <motion.span
                className="slider__dot"
                animate={{ width: active === i ? 26 : 8, opacity: active === i ? 1 : 0.3 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
              />
            </button>
          ))}
        </div>
        <button className="slider__btn" type="button" aria-label="Next product" disabled={active === PRODUCTS.length - 1} onClick={() => go(active + 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </>
  );
}

function Service({ index, title, text, open, onToggle, reduce }) {
  const id = `service-${index}`;
  return (
    <li className="service">
      <button
        className="service__head"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="service__num">{String(index + 1).padStart(2, "0")}</span>
        <span className="service__title">{title}</span>
        <motion.span
          className="service__icon"
          aria-hidden="true"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="service__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          >
            <p>{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ───────── page ───────── */

export default function App() {
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState(0);

  // thin gold reading-progress bar
  const { scrollYProgress, scrollY } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  // hero photo drifts slower than the page
  const photoY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 70]);

  const heroList = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.2 } },
  };
  const heroItem = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.75, ease: EASE } },
  };

  return (
    <main className="page">
      <motion.div className="progress" style={{ scaleX: progress }} aria-hidden="true" />

      {/* ───────── HERO ───────── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="topbar">
          <span className="topbar__item">
            <span className="pulse" aria-hidden="true" />
            <span>
              Opening soon<span className="sm-hide"> in Kettering</span>
            </span>
          </span>
          <span className="topbar__sep" aria-hidden="true" />
          <span className="topbar__item">
            <span className="pmark" aria-hidden="true">P</span>
            <span>Free onsite parking</span>
          </span>
        </div>

        <div className="hero__media">
          <motion.div
            className="hero__image"
            style={{ backgroundImage: `url(${IMAGES.hero})`, y: photoY }}
            initial={{ scale: reduce ? 1 : 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 1.8, ease: EASE }}
            role="img"
            aria-label="A Yorkshire terrier sitting on a wooden table"
          />
        </div>

        <motion.div
          className="hero__logo"
          initial={{ opacity: 0, y: reduce ? 0 : -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Logo />
        </motion.div>

        <motion.div className="hero__panel" variants={heroList} initial="hidden" animate="show">
          <motion.p className="eyebrow eyebrow--gold" variants={heroItem}>
            Boutique dog grooming - Kettering
          </motion.p>
          <Heading
            as="h1"
            id="hero-title"
            className="display"
            lines={[["Beautiful grooms."], ["Calmer visits.", true]]}
          />
          <motion.p className="lede" variants={heroItem}>
            A calm, welcoming space where your dog can feel at ease. Gentle grooming, a personal
            touch and care that puts their comfort first.
          </motion.p>
          <motion.div className="hero__cta" variants={heroItem}>
            <BookingButton />
          </motion.div>
          <motion.p className="hero__tagline" variants={heroItem}>
            Beautiful grooming. Thoughtful care.
          </motion.p>
        </motion.div>
      </section>

      {/* ───────── ETHOS ───────── */}
      <section className="ethos" aria-labelledby="ethos-title">
        <div className="wrap">
          <p className="eyebrow eyebrow--gold">The Velvet Paw ethos</p>
          <Heading
            id="ethos-title"
            className="display display--dark"
            inView
            lines={[["Thoughtful care."], ["Right down to the products.", true, true]]}
          />

          <div className="ethos__copy">
            <p>
              We use organic-only, plant-based products, free from rapeseed oil. What goes on your
              dog's skin and coat matters to us.
            </p>
            <p>
              Featuring Peanut &amp; Pickle, our coat care is chosen to suit your dog, from their
              first wash to the finishing touches.
            </p>
          </div>

          <div className="ethos__label">
            <span className="eyebrow eyebrow--sage">Products we use</span>
            <span className="ethos__brand">Peanut &amp; Pickle</span>
          </div>
        </div>

        <ProductSlider reduce={reduce} />

        <Marquee reduce={reduce} />
      </section>

      {/* ───────── SERVICES ───────── */}
      <section className="services" aria-labelledby="services-title">
        <div className="wrap services__grid">
          <div className="services__head">
          <p className="eyebrow eyebrow--gold">Our services</p>
          <Heading
            id="services-title"
            className="display display--dark"
            inView
            lines={[["For every coat."], ["For your dog.", true, true]]}
          />
          <p className="services__intro">
            From a freshen-up to a full groom, every appointment is tailored to your dog's coat,
            routine and comfort.
          </p>
          </div>

          <ol className="service-list">
            {SERVICES.map(([title, text], i) => (
              <Service
                key={title}
                index={i}
                title={title}
                text={text}
                reduce={reduce}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="cta" aria-labelledby="cta-title">
        <div className="wrap cta__inner">
          <p className="eyebrow eyebrow--gold">Come and see us</p>
          <Heading
            id="cta-title"
            className="display"
            inView
            lines={[["Book their"], ["next groom.", true]]}
          />
          <p className="lede">Online appointments are coming soon.</p>
          <BookingButton />
          <p className="cta__place">Kettering - Free onsite parking</p>
          <PawTrail reduce={reduce} />
        </div>
      </section>

      <footer className="footer">The Velvet Paw Kettering</footer>
    </main>
  );
}