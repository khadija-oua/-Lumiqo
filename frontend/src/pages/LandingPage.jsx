import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  MessageCircle,
  Brain,
  FileText,
  TrendingUp,
  Users,
  Upload,
  Sparkles,
  GraduationCap,
  BookOpen,
  Check,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import Logo from '../components/Logo';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';

// ---------------------------------------------------------------------------
// Small reusable hooks. Kept inline because they are landing-page-only.
// ---------------------------------------------------------------------------

function useInView(options = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      options,
    );
    obs.observe(node);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

function useCountUp(target, durationMs, enabled) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 2); // ease-out
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, enabled]);
  return value;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const themeLabel =
    theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre';

  return (
    <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`} aria-label="Navigation principale">
      <div className="lp-nav-inner">
        <Link to="/" className="lp-nav-brand" aria-label="Lumiqo">
          <Logo size="md" />
        </Link>
        <ul className="lp-nav-links">
          <li>
            <a href="#features">Fonctionnalités</a>
          </li>
          <li>
            <a href="#how-it-works">Comment ça marche</a>
          </li>
          <li>
            <a href="#for-who">Pour qui</a>
          </li>
        </ul>
        <div className="lp-nav-actions">
          <Link to="/login" className="btn btn-secondary btn-sm">
            Se connecter
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            S'inscrire
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-icon-only btn-sm lp-theme-toggle"
            onClick={toggle}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Hero illustration (inline SVG, animated via CSS classes)
// ---------------------------------------------------------------------------

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 600 500"
      className="lp-hero-svg"
      role="img"
      aria-label="Illustration de l'écosystème d'apprentissage Lumiqo"
    >
      {/* Background knowledge sphere */}
      <circle cx="300" cy="250" r="220" className="lp-svg-sphere" />

      {/* Floating particles */}
      <circle cx="70" cy="80" r="3" className="lp-particle p1" />
      <circle cx="540" cy="100" r="4" className="lp-particle p2" />
      <circle cx="90" cy="430" r="3.5" className="lp-particle p3" />
      <circle cx="560" cy="420" r="3" className="lp-particle p4" />
      <circle cx="300" cy="60" r="2.5" className="lp-particle p5" />
      <circle cx="40" cy="280" r="3" className="lp-particle p6" />
      <circle cx="580" cy="260" r="3" className="lp-particle p7" />

      {/* Dashed connector — doc to AI */}
      <line
        x1="245"
        y1="270"
        x2="335"
        y2="250"
        className="lp-svg-link"
        strokeDasharray="4 5"
      />
      {/* AI to small cards */}
      <line x1="455" y1="220" x2="495" y2="160" className="lp-svg-link" strokeDasharray="4 5" />
      <line x1="455" y1="285" x2="495" y2="350" className="lp-svg-link" strokeDasharray="4 5" />
      <line x1="395" y1="305" x2="365" y2="380" className="lp-svg-link" strokeDasharray="4 5" />

      {/* PDF document card */}
      <g className="float-doc">
        <rect x="100" y="180" width="140" height="180" rx="10" className="lp-svg-card" />
        <line x1="120" y1="210" x2="220" y2="210" className="lp-svg-line strong" />
        <line x1="120" y1="226" x2="200" y2="226" className="lp-svg-line" />
        <line x1="120" y1="242" x2="220" y2="242" className="lp-svg-line" />
        <line x1="120" y1="258" x2="190" y2="258" className="lp-svg-line" />
        <line x1="120" y1="280" x2="220" y2="280" className="lp-svg-line" />
        <line x1="120" y1="296" x2="180" y2="296" className="lp-svg-line" />
        <rect x="120" y="320" width="44" height="22" rx="4" className="lp-svg-pill" />
        <text x="142" y="335" textAnchor="middle" className="lp-svg-pill-text">
          PDF
        </text>
      </g>

      {/* AI core node */}
      <g className="float-ai">
        <circle cx="395" cy="250" r="60" className="lp-svg-ai-outer" />
        <circle cx="395" cy="250" r="38" className="lp-svg-ai-ring" />
        <circle cx="395" cy="250" r="18" className="lp-svg-ai-inner" />
        <circle cx="375" cy="232" r="3" className="lp-svg-ai-spark" />
        <circle cx="418" cy="240" r="2.5" className="lp-svg-ai-spark" />
        <circle cx="408" cy="272" r="2.5" className="lp-svg-ai-spark" />
        <circle cx="378" cy="268" r="2" className="lp-svg-ai-spark" />
      </g>

      {/* Quiz card */}
      <g className="float-card-1">
        <rect x="465" y="120" width="80" height="60" rx="10" className="lp-svg-card accent" />
        <text x="505" y="160" textAnchor="middle" className="lp-svg-q">
          ?
        </text>
      </g>

      {/* Chat bubble */}
      <g className="float-card-2">
        <rect x="475" y="335" width="84" height="52" rx="14" className="lp-svg-card" />
        <circle cx="495" cy="361" r="3.5" className="lp-svg-dot" />
        <circle cx="513" cy="361" r="3.5" className="lp-svg-dot" />
        <circle cx="531" cy="361" r="3.5" className="lp-svg-dot" />
      </g>

      {/* Bar chart card */}
      <g className="float-card-3">
        <rect x="320" y="380" width="90" height="60" rx="10" className="lp-svg-card accent" />
        <rect x="333" y="416" width="12" height="14" className="lp-svg-bar bar-1" />
        <rect x="351" y="408" width="12" height="22" className="lp-svg-bar bar-2" />
        <rect x="369" y="400" width="12" height="30" className="lp-svg-bar bar-3" />
        <rect x="387" y="392" width="12" height="38" className="lp-svg-bar bar-4" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero-grid">
        <div className="lp-hero-text">
          <span className="lp-badge anim-fade-up" style={{ animationDelay: '0ms' }}>
            ✨ Propulsé par l'IA Gemini
          </span>
          <h1 className="lp-h1 anim-fade-up" style={{ animationDelay: '150ms' }}>
            Apprenez à votre rythme,
            <br />
            guidé par l'IA
          </h1>
          <p className="lp-hero-sub anim-fade-up" style={{ animationDelay: '300ms' }}>
            Lumiqo génère des quiz personnalisés depuis vos cours, adapte la difficulté en temps réel,
            et vous accompagne avec Lumi — votre assistant pédagogique intelligent.
          </p>
          <div className="lp-hero-ctas anim-fade-up" style={{ animationDelay: '450ms' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Commencer gratuitement <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="btn btn-ghost btn-lg">
              Voir la démo
            </a>
          </div>
          <p className="lp-hero-proof anim-fade-up" style={{ animationDelay: '600ms' }}>
            🎓 Déjà utilisé dans plusieurs établissements · Gratuit pour commencer
          </p>
        </div>
        <div className="lp-hero-art anim-fade-in-scale" style={{ animationDelay: '200ms' }}>
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar() {
  const [ref, inView] = useInView();
  const count3 = useCountUp(3, 900, inView);
  return (
    <section ref={ref} className="lp-stats">
      <div className="lp-stats-inner">
        <div className="lp-stat">
          <div className="lp-stat-head">
            <span className="lp-stat-num">{count3}</span> agents IA
          </div>
          <div className="lp-stat-sub">Quiz · Chat · Profil</div>
        </div>
        <div className="lp-stats-divider" aria-hidden />
        <div className="lp-stat">
          <div className="lp-stat-head">Quiz adaptatifs</div>
          <div className="lp-stat-sub">Difficulté en temps réel</div>
        </div>
        <div className="lp-stats-divider" aria-hidden />
        <div className="lp-stat">
          <div className="lp-stat-head">Profil VARK personnalisé</div>
          <div className="lp-stat-sub">4 styles d'apprentissage</div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    Icon: Zap,
    title: 'Quiz adaptatifs',
    desc: "La difficulté s'ajuste automatiquement selon vos réponses. Facile, moyen ou difficile — Lumiqo trouve votre niveau.",
  },
  {
    Icon: MessageCircle,
    title: 'Lumi, votre assistant IA',
    desc: "Posez vos questions à Lumi 24h/24. Il connaît vos cours et adapte ses explications à votre style d'apprentissage.",
  },
  {
    Icon: Brain,
    title: 'Profil VARK personnalisé',
    desc: "Découvrez si vous apprenez mieux par le visuel, l'audio, la lecture ou la pratique. Lumiqo adapte tout en conséquence.",
  },
  {
    Icon: FileText,
    title: 'Génération depuis PDF',
    desc: "L'enseignant uploade un PDF et Lumiqo génère automatiquement un quiz complet et cohérent en quelques secondes.",
  },
  {
    Icon: TrendingUp,
    title: "Parcours d'apprentissage",
    desc: "Un parcours personnalisé vous guide dans l'ordre optimal des matériels selon votre profil et vos résultats.",
  },
  {
    Icon: Users,
    title: 'Tableau de bord enseignant',
    desc: "Les enseignants gèrent leurs cours, suivent les progrès des étudiants et génèrent des évaluations sans effort technique.",
  },
];

function Features() {
  const [ref, inView] = useInView();
  return (
    <section id="features" ref={ref} className="lp-section">
      <header className="lp-section-head">
        <h2>Tout ce dont vous avez besoin pour apprendre efficacement</h2>
        <p>Des outils intelligents conçus pour s'adapter à chaque étudiant</p>
      </header>
      <div className="lp-features-grid">
        {FEATURES.map(({ Icon, title, desc }, i) => (
          <article
            key={title}
            className={`lp-feature ${inView ? 'in' : ''}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <span className="lp-feature-icon">
              <Icon size={24} />
            </span>
            <h3 className="lp-feature-title">{title}</h3>
            <p className="lp-feature-desc">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

const STEPS = [
  {
    num: '01',
    Icon: Upload,
    title: "L'enseignant uploade le cours",
    desc: "Un simple PDF suffit. Lumiqo extrait le contenu et prépare la matière pour la génération de quiz.",
    accent: false,
  },
  {
    num: '02',
    Icon: Sparkles,
    title: "L'IA génère le quiz",
    desc: "Gemini analyse le contenu et crée des questions MCQ en français, avec 3 niveaux de difficulté et des distracteurs plausibles.",
    accent: true,
  },
  {
    num: '03',
    Icon: TrendingUp,
    title: "L'étudiant progresse",
    desc: "Le quiz s'adapte en temps réel. Le parcours VARK guide l'étudiant vers les matériels les plus adaptés à son profil.",
    accent: false,
  },
];

function HowItWorks() {
  const [ref, inView] = useInView();
  return (
    <section id="how-it-works" className="lp-section lp-section-alt">
      <header className="lp-section-head">
        <h2>Comment ça marche</h2>
        <p>En 3 étapes simples</p>
      </header>
      <div ref={ref} className={`lp-steps ${inView ? 'in' : ''}`}>
        {STEPS.map(({ num, Icon, title, desc, accent }, i) => (
          <div key={num} className="lp-step" style={{ transitionDelay: `${i * 150}ms` }}>
            <div className={`lp-step-num ${accent ? 'accent' : ''}`} aria-hidden>
              {num}
            </div>
            <span className="lp-step-icon">
              <Icon size={22} />
            </span>
            <h3 className="lp-step-title">{title}</h3>
            <p className="lp-step-desc">{desc}</p>
          </div>
        ))}
        {/* Animated horizontal connector (desktop) */}
        <svg className="lp-step-connector" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1="2" x2="1000" y2="2" />
        </svg>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// For who
// ---------------------------------------------------------------------------

function ForWho() {
  const [ref, inView] = useInView();
  return (
    <section id="for-who" ref={ref} className="lp-section">
      <header className="lp-section-head">
        <h2>Conçu pour vous</h2>
      </header>
      <div className={`lp-forwho-grid ${inView ? 'in' : ''}`}>
        <article className="lp-forwho lp-forwho-student" style={{ transitionDelay: '0ms' }}>
          <header className="lp-forwho-header lp-forwho-header-student">
            <GraduationCap size={48} />
            <h3>Étudiants</h3>
          </header>
          <ul className="lp-forwho-list">
            <li><Check size={18} /> Quiz adaptatifs à votre niveau</li>
            <li><Check size={18} /> Assistant Lumi disponible 24h/24</li>
            <li><Check size={18} /> Parcours personnalisé selon votre profil VARK</li>
            <li><Check size={18} /> Suivi de votre progression en temps réel</li>
          </ul>
          <Link to="/register" className="btn btn-primary btn-md">
            Créer un compte étudiant
          </Link>
        </article>

        <article className="lp-forwho lp-forwho-teacher" style={{ transitionDelay: '150ms' }}>
          <header className="lp-forwho-header lp-forwho-header-teacher">
            <BookOpen size={48} />
            <h3>Enseignants</h3>
          </header>
          <ul className="lp-forwho-list">
            <li><Check size={18} /> Génération de quiz depuis vos PDF en 1 clic</li>
            <li><Check size={18} /> Suivi des progrès de chaque étudiant</li>
            <li><Check size={18} /> Gestion complète de vos cours et matériels</li>
            <li><Check size={18} /> Aucune compétence technique requise</li>
          </ul>
          <Link to="/register" className="btn btn-primary btn-md">
            Créer un compte enseignant
          </Link>
        </article>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  {
    quote:
      "Lumiqo a complètement changé ma façon de réviser. Le quiz s'adapte vraiment à mon niveau et Lumi m'explique les concepts que je n'avais pas compris en cours.",
    name: 'Yasmine B.',
    role: 'Étudiante en informatique',
    initials: 'YB',
    avatarClass: 'avatar-teal',
  },
  {
    quote:
      "En tant qu'enseignant, générer un quiz depuis mon PDF de cours en moins d'une minute, c'est révolutionnaire. Mes étudiants sont plus engagés depuis qu'on utilise Lumiqo.",
    name: 'Prof. Karim A.',
    role: 'Enseignant en bases de données',
    initials: 'KA',
    avatarClass: 'avatar-navy',
  },
  {
    quote:
      "Le profil VARK m'a aidé à comprendre comment j'apprends. Maintenant je sais que je suis kinesthésique et Lumiqo me propose des exercices pratiques en priorité.",
    name: 'Omar M.',
    role: 'Étudiant en génie civil',
    initials: 'OM',
    avatarClass: 'avatar-accent',
  },
];

function Testimonials() {
  const [ref, inView] = useInView();
  return (
    <section ref={ref} className="lp-section">
      <header className="lp-section-head">
        <h2>Ce qu'ils en disent</h2>
        <p>Ils ont adopté Lumiqo dans leur parcours</p>
      </header>
      <div className={`lp-testimonials ${inView ? 'in' : ''}`}>
        {TESTIMONIALS.map((t, i) => (
          <figure key={t.name} className="lp-testimonial" style={{ transitionDelay: `${i * 120}ms` }}>
            <blockquote className="lp-testimonial-quote">« {t.quote} »</blockquote>
            <figcaption className="lp-testimonial-meta">
              <span className={`lp-testimonial-avatar ${t.avatarClass}`}>{t.initials}</span>
              <span>
                <span className="lp-testimonial-name">{t.name}</span>
                <span className="lp-testimonial-role">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCta() {
  const [ref, inView] = useInView();
  return (
    <section ref={ref} className={`lp-final ${inView ? 'in' : ''}`}>
      <div className="lp-final-inner">
        <h2>Prêt à transformer votre façon d'apprendre ?</h2>
        <p>Rejoignez Lumiqo aujourd'hui. Gratuit, sans engagement, en français.</p>
        <Link to="/register" className="lp-final-cta">
          Créer mon compte gratuitement <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Logo size="sm" />
          <span className="lp-footer-copy">© 2026 Lumiqo. Tous droits réservés.</span>
        </div>
       
        <div className="lp-footer-links">
          <Link to="/login">Se connecter</Link>
          <Link to="/register">Créer un compte</Link>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  // The page sets a body class so the landing-only background tweaks apply
  // without affecting the rest of the app.
  useEffect(() => {
    document.body.classList.add('lp-body');
    return () => document.body.classList.remove('lp-body');
  }, []);

  return (
    <div className="lp">
      <LandingNavbar />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <HowItWorks />
        <ForWho />
        <Testimonials />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
