import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import slideFamily from '../../assets/images/hero-slide-telehealth-family.png';
import slideDoctor from '../../assets/images/hero-slide-doctor-desk.png';
import slideVideoHome from '../../assets/images/hero-slide-video-call-home.png';
import { IconCheckSmall, IconStarFilled } from './landingIcons';

/** Time each slide stays mostly visible before crossfading to the next */
const HERO_SLIDE_INTERVAL_MS = 7000;
/** Crossfade between slides (keep well under interval so one image “holds” clearly) */
const HERO_CROSSFADE_MS = 1100;
/** Hero strip eases in when scrolled into view */
const HERO_SCROLL_REVEAL_MS = 720;

const heroSlides = [
  {
    src: slideFamily,
    alt: 'Family at home on a video visit with a clinician while a child receives breathing therapy'
  },
  {
    src: slideDoctor,
    alt: 'Physician at a desk in a modern clinic, ready to support patients'
  },
  {
    src: slideVideoHome,
    alt: 'Patient at home on a video call with a healthcare provider'
  }
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function LandingHero() {
  const reduceMotion = prefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [heroMediaVisible, setHeroMediaVisible] = useState(reduceMotion);
  const heroMediaWrapRef = useRef(null);
  const crossfadeMs = reduceMotion ? 0 : HERO_CROSSFADE_MS;
  const scrollRevealMs = reduceMotion ? 0 : HERO_SCROLL_REVEAL_MS;

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroSlides.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = heroMediaWrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setHeroMediaVisible(true);
      return undefined;
    }
    if (prefersReducedMotion()) {
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeroMediaVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center pb-16 pt-20 md:pb-32 md:pt-32">
      <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-brand-100 via-mint/20 to-transparent opacity-40 blur-3xl" />
      <div className="absolute bottom-20 left-0 -z-10 h-80 w-80 rounded-full bg-gradient-to-tr from-sea/10 to-transparent opacity-30 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 text-center md:px-8 lg:px-12">
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <span
            className="h-px w-10 shrink-0 bg-gradient-to-r from-transparent via-slate-300 to-transparent sm:hidden"
            aria-hidden
          />
          <span
            className="hidden h-px w-12 shrink-0 bg-gradient-to-r from-transparent via-slate-300 to-slate-300 sm:block sm:w-20 md:w-24"
            aria-hidden
          />
          <p className="max-w-[20rem] text-center text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.26em] text-slate-500 sm:max-w-none sm:text-xs sm:tracking-[0.3em]">
            Welcome to the future of healthcare
          </p>
          <span
            className="hidden h-px w-12 shrink-0 bg-gradient-to-l from-transparent via-slate-300 to-slate-300 sm:block sm:w-20 md:w-24"
            aria-hidden
          />
        </div>

        <h1 className="mb-6 font-sans text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
          Healthcare Made <span className="text-sea">Simple & Accessible</span>
        </h1>

        <p className="mx-auto mb-12 max-w-3xl text-lg font-normal leading-relaxed text-slate-600 md:text-xl">
          Connect with qualified doctors, book appointments in seconds, and access your health records anytime—all in one secure platform.
        </p>

        <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <Link to="/register" className="button-primary px-8 py-4">
            Get Started Now
          </Link>
          <a href="#platform-demo" className="button-secondary inline-flex items-center justify-center px-8 py-4">
            Watch Demo
          </a>
        </div>

        <div
          ref={heroMediaWrapRef}
          className={`relative mx-auto w-full max-w-5xl will-change-transform ${
            heroMediaVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}
          style={{
            transitionProperty: scrollRevealMs ? 'opacity, transform' : 'none',
            transitionDuration: scrollRevealMs ? `${scrollRevealMs}ms` : '0ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <div
            className="panel relative aspect-video overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-900/5 [backdrop-filter:none]"
            role="region"
            aria-roledescription="carousel"
            aria-label="Healthcare in action"
          >
            <p className="sr-only">
              Slide {activeIndex + 1} of {heroSlides.length}. Images change about every{' '}
              {Math.round(HERO_SLIDE_INTERVAL_MS / 1000)} seconds with a slow crossfade.
            </p>
            {heroSlides.map((slide, i) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                aria-hidden={i !== activeIndex}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover ease-in-out ${
                  i === activeIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
                }`}
                style={{
                  transitionProperty: crossfadeMs ? 'opacity' : 'none',
                  transitionDuration: crossfadeMs ? `${crossfadeMs}ms` : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
            <div
              className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2"
              aria-hidden
            >
              {heroSlides.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full shadow-sm transition-colors ease-out ${
                    i === activeIndex ? 'bg-white' : 'bg-white/45'
                  }`}
                  style={{ transitionDuration: crossfadeMs ? `${crossfadeMs}ms` : '0ms' }}
                />
              ))}
            </div>
          </div>

          <div className="absolute -left-8 top-1/3 hidden animate-float rounded-xl border border-gray-100 bg-white p-4 shadow-lg lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                <IconCheckSmall className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">250K+</p>
                <p className="text-xs text-gray-600">Active Patients</p>
              </div>
            </div>
          </div>

          <div
            className="absolute -right-8 bottom-1/4 hidden animate-float rounded-xl border border-gray-100 bg-white p-4 shadow-lg lg:block"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sea">
                <IconStarFilled className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">4.9/5</p>
                <p className="text-xs text-gray-600">Patient Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
