import React from 'react';
import ScrollReveal from './ScrollReveal';
import benefitsLeadImage from '../../assets/images/landing-benefits-doctor.png';
import { IconClock, IconCurrency, IconGlobe, IconShieldLock } from './landingIcons';

const benefits = [
  {
    Icon: IconClock,
    title: 'Save Time',
    description: 'No more waiting on phone lines or endless email chains. Book appointments in seconds.'
  },
  {
    Icon: IconCurrency,
    title: 'Affordable Care',
    description: 'Transparent pricing with no hidden fees. Access quality healthcare within your budget.'
  },
  {
    Icon: IconShieldLock,
    title: 'Your Privacy Matters',
    description: 'Bank-level encryption keeps your health data secure and private. Only you control who sees your information.'
  },
  {
    Icon: IconGlobe,
    title: 'Healthcare Anywhere',
    description: 'Access care from home, work, or while traveling. No location barriers to quality healthcare.'
  }
];

const innerRevealStyle = (step) => ({
  animationDelay: `${step * 0.16}s`,
  '--landing-reveal-inner-ms': '1680ms'
});

export default function Benefits() {
  return (
    <section id="about" className="w-full border-t border-slate-200/80 bg-white/70 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-16">
          <ScrollReveal className="relative order-2 flex min-h-[280px] w-full lg:order-1 lg:h-full lg:min-h-0" translatePx={28}>
            <div className="flex min-h-[300px] w-full flex-col overflow-hidden rounded-3xl border-0 bg-gradient-to-b from-slate-100/70 via-white to-brand-50/25 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.12)] lg:h-full lg:min-h-0">
              <div className="flex min-h-0 flex-1 items-end justify-center overflow-hidden px-1 pb-0 pt-6 sm:px-2 sm:pt-8 md:px-3 md:pt-10 lg:h-full lg:px-1 lg:pb-0 lg:pt-4">
                <img
                  src={benefitsLeadImage}
                  alt="Physician in a white coat with arms crossed"
                  className="landing-reveal-child h-auto w-full max-w-xl origin-bottom object-contain object-bottom will-change-transform scale-[1.14] max-h-[min(88%,520px)] sm:scale-[1.18] sm:max-h-[min(86%,560px)] lg:max-h-full lg:max-w-none lg:scale-[1.42] xl:scale-[1.52]"
                  style={innerRevealStyle(0)}
                  loading="lazy"
                />
              </div>
            </div>
          </ScrollReveal>

          <div className="order-1 flex flex-col lg:order-2">
            <ScrollReveal translatePx={26}>
              <p className="landing-reveal-child mb-3 text-sm font-semibold uppercase tracking-wider text-sea" style={innerRevealStyle(0)}>
                Why PrimeHealth
              </p>
              <h2 className="landing-reveal-child mb-10 font-sans text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl" style={innerRevealStyle(1)}>
                Why Choose <span className="text-sea">PrimeHealth?</span>
              </h2>
            </ScrollReveal>

            <div className="space-y-8">
              {benefits.map((benefit, index) => {
                const BenefitIcon = benefit.Icon;
                return (
                  <ScrollReveal key={index} delayMs={index * 90} translatePx={26}>
                    <div className="flex gap-6">
                      <div
                        className="landing-reveal-child flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-sea/10 text-slate-800 ring-1 ring-slate-900/5"
                        style={innerRevealStyle(0)}
                      >
                        <BenefitIcon className="h-7 w-7" aria-hidden />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="landing-reveal-child mb-2 font-sans text-xl font-bold text-slate-900"
                          style={innerRevealStyle(1)}
                        >
                          {benefit.title}
                        </h3>
                        <p
                          className="landing-reveal-child text-sm leading-relaxed text-slate-600 md:text-[0.95rem]"
                          style={innerRevealStyle(2)}
                        >
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            {/* Additional trust markers */}
            <ScrollReveal className="mt-12 border-t border-gray-200 pt-12" delayMs={80} translatePx={24}>
              <p
                className="landing-reveal-child mb-6 text-sm font-semibold uppercase tracking-wider text-slate-600"
                style={innerRevealStyle(0)}
              >
                Trusted by over 250,000 users worldwide
              </p>
              <div className="flex items-center gap-8">
                <div className="landing-reveal-child text-center" style={innerRevealStyle(1)}>
                  <p className="text-3xl font-bold text-sea">4.9/5</p>
                  <p className="mt-1 text-sm text-slate-600">App Rating</p>
                </div>
                <div className="landing-reveal-child text-center" style={innerRevealStyle(2)}>
                  <p className="text-3xl font-bold text-sea">98%</p>
                  <p className="mt-1 text-sm text-slate-600">Satisfaction Rate</p>
                </div>
                <div className="landing-reveal-child text-center" style={innerRevealStyle(3)}>
                  <p className="text-3xl font-bold text-sea">50K+</p>
                  <p className="mt-1 text-sm text-slate-600">Verified Doctors</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
