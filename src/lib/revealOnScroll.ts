export function initRevealOnScroll(root: ParentNode = document) {
  if (typeof window === 'undefined') return;
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!targets.length) return;

  // Skip elements that have already been observed (idempotent across astro:page-load).
  const fresh = targets.filter((el) => !el.dataset.revealObserved);
  if (!fresh.length) return;
  fresh.forEach((el) => {
    el.dataset.revealObserved = 'true';
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reveal = (el: HTMLElement) => {
    const delay = Number(el.dataset.revealDelay ?? '0');
    if (delay > 0) el.style.transitionDelay = `${delay}ms`;
    el.classList.add('in');
  };

  if (reduced || !('IntersectionObserver' in window)) {
    fresh.forEach((el) => el.classList.add('in'));
    return;
  }

  // Only hide elements that start below the current viewport; anything already
  // visible or scrolled past reveals immediately so fast scrolls never leave blanks.
  const pending = new Set<HTMLElement>();
  const vh = window.innerHeight || 900;
  for (const el of fresh) {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.96) {
      el.classList.add('in');
    } else {
      el.classList.add('reveal-ready');
      pending.add(el);
    }
  }

  if (!pending.size) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          reveal(entry.target);
          pending.delete(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: '0px 0px -2% 0px' },
  );

  pending.forEach((el) => io.observe(el));

  // Fallback sweep during fast/programmatic scrolls so tall or quickly passed
  // elements can never stay stuck at opacity: 0.
  let raf = 0;
  const sweep = () => {
    raf = 0;
    const h = window.innerHeight || 900;
    pending.forEach((el) => {
      if (el.getBoundingClientRect().top <= h * 0.98) {
        reveal(el);
        pending.delete(el);
        io.unobserve(el);
      }
    });
    if (!pending.size) {
      window.removeEventListener('scroll', onScroll);
    }
  };
  const onScroll = () => {
    if (!raf) raf = window.requestAnimationFrame(sweep);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener(
    'astro:before-swap',
    () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    },
    { once: true },
  );
}
