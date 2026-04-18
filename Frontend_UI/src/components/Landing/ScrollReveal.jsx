import React, { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Smooth ease-out for a slow, gentle reveal */
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DEFAULT_DURATION_MS = 780;
const TRANSLATE_HIDDEN_PX = 22;

function scrollY() {
  if (typeof window === 'undefined') return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function overlapHeight(rect, vh) {
  const top = Math.max(0, rect.top);
  const bottom = Math.min(vh, rect.bottom);
  return Math.max(0, bottom - top);
}

function overlapRatio(rect) {
  const h = rect.height;
  if (h <= 0 || typeof window === 'undefined') return 0;
  return overlapHeight(rect, window.innerHeight) / h;
}

/**
 * Avoid committing on load when only a sliver at the bottom of the viewport
 * touches the target (animation finishes before the user scrolls). Still commit
 * once the user scrolls — IntersectionObserver alone may not fire again, so we
 * also re-check on scroll (rAF-throttled).
 */
function passingGate(rect, intersectionRatio) {
  if (typeof window === 'undefined') return true;
  const vh = window.innerHeight;
  if (rect.bottom <= 0 || rect.top >= vh) return false;

  const ratio = intersectionRatio ?? overlapRatio(rect);
  if (rect.height > 48 && ratio < 0.04) return false;
  if (overlapHeight(rect, vh) < 12) return false;

  const sy = scrollY();
  const hasScrolled = sy > 40;
  const inMainBand = rect.top < vh * 0.62 && rect.top > -rect.height * 0.92;
  return hasScrolled || inMainBand;
}

/**
 * Scroll-only: slow fade + gentle rise when the block enters the viewport.
 * Uses inline transition (avoids Tailwind arbitrary easing parse issues).
 */
export default function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  threshold = 0.06,
  rootMargin = '0px 0px -6% 0px',
  durationMs = DEFAULT_DURATION_MS,
  translatePx = TRANSLATE_HIDDEN_PX
}) {
  const ref = useRef(null);
  const reduce = prefersReducedMotion();
  const [visible, setVisible] = useState(reduce);

  useEffect(() => {
    if (reduce) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    let committed = false;
    let rafId = 0;
    let obs = null;

    const commit = () => {
      if (committed) return;
      committed = true;
      if (obs) obs.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    };

    const tryReveal = () => {
      if (committed) return;
      const r = el.getBoundingClientRect();
      if (passingGate(r, overlapRatio(r))) commit();
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tryReveal);
    };
    const onResize = onScroll;

    obs = new IntersectionObserver(
      ([entry]) => {
        if (committed || !entry.isIntersecting) return;
        if (passingGate(entry.boundingClientRect, entry.intersectionRatio)) commit();
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(tryReveal);
    });

    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }, [reduce, threshold, rootMargin]);

  const transition = reduce
    ? 'none'
    : `opacity ${durationMs}ms ${EASING}, transform ${durationMs}ms ${EASING}`;

  const style = reduce
    ? { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${translatePx}px, 0)`,
        transition,
        transitionDelay: visible && delayMs > 0 ? `${delayMs}ms` : '0ms',
        willChange: visible ? 'auto' : 'opacity, transform'
      };

  return (
    <div
      ref={ref}
      className={className.trim()}
      style={style}
      data-revealed={reduce || visible ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}
