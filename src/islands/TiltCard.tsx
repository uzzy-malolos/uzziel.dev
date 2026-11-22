import { useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

interface Props {
  children: ReactNode;
  max?: number;
}

export default function TiltCard({ children, max = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareOpacity = useMotionValue(0);

  const srx = useSpring(rx, { stiffness: 210, damping: 20 });
  const sry = useSpring(ry, { stiffness: 210, damping: 20 });
  const sOpacity = useSpring(glareOpacity, { stiffness: 220, damping: 26 });

  const glareBg = useMotionTemplate`radial-gradient(380px circle at ${gx}% ${gy}%, rgba(201, 161, 74, 0.16), transparent 62%)`;

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(r.width, 1);
    const py = (e.clientY - r.top) / Math.max(r.height, 1);
    const tiltY = (px - 0.5) * 2 * max;
    const tiltX = (0.5 - py) * 2 * max;
    rx.set(Math.max(-max, Math.min(max, tiltX)));
    ry.set(Math.max(-max, Math.min(max, tiltY)));
    gx.set(px * 100);
    gy.set(py * 100);
    glareOpacity.set(1);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className="relative h-full"
    >
      {children}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          style={{
            background: glareBg,
            opacity: sOpacity,
          }}
          className="pointer-events-none absolute inset-0 z-10"
        />
      )}
    </motion.div>
  );
}
