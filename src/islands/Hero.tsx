import { useEffect, useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';

type HeroProps = { projectCount: number };

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero({ projectCount }: HeroProps) {
  const section = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  // Pointer-driven 3D depth parallax for the working desk (zero React re-renders).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.7 });

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });

  // Scroll fan offsets
  const gameScrollY = useTransform(scrollYProgress, [0, 1], [0, -55]);
  const gameScrollRot = useTransform(scrollYProgress, [0, 1], [-6, -2]);
  const webScrollY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const webScrollRot = useTransform(scrollYProgress, [0, 1], [7, 2]);
  const appScrollY = useTransform(scrollYProgress, [0, 1], [0, -25]);
  const appScrollRot = useTransform(scrollYProgress, [0, 1], [4, -3]);

  // Layered depth planes on pointer move (back < mid < front)
  const webPx = useTransform(smoothX, [-1, 1], [-10, 10]);
  const webPy = useTransform(smoothY, [-1, 1], [-8, 8]);
  const gamePx = useTransform(smoothX, [-1, 1], [-16, 16]);
  const gamePy = useTransform(smoothY, [-1, 1], [-12, 12]);
  const appPx = useTransform(smoothX, [-1, 1], [-24, 24]);
  const appPy = useTransform(smoothY, [-1, 1], [-16, 16]);

  const gameTransform = useMotionTemplate`translate3d(${gamePx}px, calc(${gameScrollY}px + ${gamePy}px), 0) rotate(${gameScrollRot}deg)`;
  const webTransform = useMotionTemplate`translate3d(${webPx}px, calc(${webScrollY}px + ${webPy}px), 0) rotate(${webScrollRot}deg)`;
  const appTransform = useMotionTemplate`translate3d(${appPx}px, calc(${appScrollY}px + ${appPy}px), 0) rotate(${appScrollRot}deg)`;

  const handleStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse' || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / Math.max(r.width, 1) - 0.5) * 2;
    const ny = ((e.clientY - r.top) / Math.max(r.height, 1) - 0.5) * 2;
    pointerX.set(Math.max(-1, Math.min(1, nx)));
    pointerY.set(Math.max(-1, Math.min(1, ny)));
  };

  const handleStageLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section ref={section} className="hero-section relative overflow-x-clip" aria-labelledby="hero-heading">
      <div className="hero-ambient" aria-hidden="true" />
      <div className="container relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-5 text-xs text-stone">
          <span>Emmanuel Uzziel A. Malolos</span>
          <span>Independent creator · Bay, Laguna, PH</span>
        </div>
        <div className="hero-layout grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-4 lg:py-20">
          <div className="relative z-10">
            <motion.div
              className="mb-7 flex items-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <img
                src="/photos/uzziel-headshot.webp"
                alt="Uzziel Malolos"
                width="48"
                height="48"
                className="h-12 w-12 rounded-full object-cover object-top ring-2 ring-gold/45 ring-offset-2 ring-offset-cream dark:ring-offset-ink"
              />
              <p className="text-sm leading-snug text-stone">
                Full-stack creator.<br />
                <span className="text-ink dark:text-cream">A little bit of everything. All the way through.</span>
              </p>
            </motion.div>

            <h1 id="hero-heading" className="hero-heading" aria-label="I design, build, and ship.">
              <span className="hero-line" aria-hidden="true"><span>I design,</span></span>
              <span className="hero-line" aria-hidden="true"><span>build, and</span></span>
              <span className="hero-line" aria-hidden="true"><em className="text-accent">ship.</em></span>
            </h1>

            <motion.p
              className="mt-7 max-w-[37ch] text-lg leading-relaxed text-stone"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
            >
              Useful apps. Worlds you can get lost in. Websites for real businesses.
              Made with care, from the Philippines.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
            >
              <a href="#selected-work" data-cursor="hover" data-magnetic className="button-primary">
                Explore my work <span aria-hidden="true">↘</span>
              </a>
              <a href="/contact" data-cursor="hover" data-magnetic className="button-secondary">
                Let’s make something <span aria-hidden="true">↗</span>
              </a>
            </motion.div>
          </div>

          <div
            ref={stageRef}
            onPointerMove={handleStageMove}
            onPointerLeave={handleStageLeave}
            className="hero-stage"
            aria-label="A few things I’ve made"
          >
            <div className="hero-stage-orbit" aria-hidden="true" />
            <span className="hero-stage-note" aria-hidden="true">From the working desk</span>

            <motion.a
              href="/work/long-way-around"
              className="hero-artifact hero-artifact-game"
              style={{ transform: reduced ? 'none' : gameTransform }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
              data-cursor-label="Explore Long Way Around"
            >
              <div className="artifact-chrome">
                <span className="flex gap-1" aria-hidden="true"><i /><i /><i /></span>
                <span>Long Way Around · A pixel RPG</span>
              </div>
              <img
                src="/work/project-screenshots/long-way-around/village.png"
                alt="Long Way Around: Ida talking to Theo in Willowfen village with custom pixel portrait and World HUD"
                width="1152"
                height="648"
                fetchPriority="high"
                className="aspect-video w-full object-cover"
              />
              <div className="artifact-caption">
                <span>There’s a story around here.</span>
                <span aria-hidden="true">↗</span>
              </div>
            </motion.a>

            <motion.a
              href="/work/saklay"
              className="hero-artifact hero-artifact-web"
              style={{ transform: reduced ? 'none' : webTransform }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.65, delay: 0.22, ease: EASE }}
              data-cursor-label="Explore Saklay"
            >
              <div className="artifact-chrome">
                <span className="flex gap-1" aria-hidden="true"><i /><i /><i /></span>
                <span>saklay · Community website</span>
              </div>
              <img
                src="/work/project-screenshots/saklay-home-live.png"
                alt="Saklay community website with its warm editorial design"
                width="1440"
                height="900"
                loading="eager"
                className="aspect-[16/10] w-full object-cover object-top"
              />
            </motion.a>

            <motion.a
              href="/work/eco-man"
              className="hero-artifact hero-artifact-app"
              style={{ transform: reduced ? 'none' : appTransform }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.65, delay: 0.3, ease: EASE }}
              data-cursor-label="Explore Eco-Man"
            >
              <span className="hero-app-screen">
                <img
                  src="/work/eco-man/today.webp"
                  alt="Eco-Man, an Android record book, showing this month’s sales, expenses, and a Scan a receipt button"
                  width="540"
                  height="1128"
                  className="block w-full"
                />
              </span>
              <img
                src="/logos/eco-man.webp"
                alt=""
                width="52"
                height="52"
                className="hero-app-badge app-logo"
              />
            </motion.a>

            <span className="hero-stage-caption">Games, websites &amp; things that work.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-sm text-stone">
          <p className="flex items-center gap-2.5">
            <span className="status-dot-live inline-block h-2 w-2 rounded-full bg-leaf text-leaf" aria-hidden="true" />
            Open to freelance &amp; product collaborations
          </p>
          <a href="/work" className="link-line font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:text-accent dark:text-cream" data-cursor="hover">
            {projectCount} projects, and counting <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
