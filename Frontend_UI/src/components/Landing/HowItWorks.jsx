import React from 'react';
import ScrollReveal from './ScrollReveal';

const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up with your email or phone number. Set up your health profile in just a few minutes.'
  },
  {
    number: '02',
    title: 'Browse & Find Doctors',
    description: 'Search for doctors by specialty, location, and availability. Read reviews and check their credentials.'
  },
  {
    number: '03',
    title: 'Book an Appointment',
    description: 'Pick your preferred date and time. Video or in-person consultations - you choose what works best.'
  },
  {
    number: '04',
    title: 'Consult & Get Care',
    description: 'Connect with your doctor at the scheduled time. Get prescriptions, medical advice, and referrals as needed.'
  }
];

const innerRevealStyle = (step) => ({
  animationDelay: `${step * 0.17}s`,
  '--landing-reveal-inner-ms': '1700ms'
});

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full border-t border-slate-200/80 pb-24 pt-14 md:pb-32 md:pt-16"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <ScrollReveal className="mb-20 text-center">
          <h2 className="mb-6 font-sans text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Getting Started is Simple
          </h2>
          <p className="mx-auto max-w-3xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            Four easy steps to connect with quality healthcare whenever you need it.
          </p>
        </ScrollReveal>

        {/* Steps Container */}
        <div className="relative">
          {/* Connection line - hidden on mobile */}
          <div className="absolute left-0 right-0 top-24 hidden h-1 bg-gradient-to-r from-transparent via-sea/30 to-transparent md:block" />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <ScrollReveal key={index} className="relative h-full" delayMs={index * 130} translatePx={30}>
                <div className="relative h-full">
                  {/* Step card */}
                  <div className="panel h-full rounded-3xl p-8 transition-shadow duration-300 hover:shadow-lg">
                    {/* Step number - Large circle */}
                    <div className="landing-reveal-child mb-6 flex items-center gap-4" style={innerRevealStyle(0)}>
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sea to-brand-700">
                        <span className="text-2xl font-bold text-white">{step.number}</span>
                      </div>
                      {/* Mobile vertical connector */}
                      {index < steps.length - 1 && (
                        <div className="absolute -bottom-8 left-8 h-8 w-0.5 bg-gradient-to-b from-sea to-transparent md:hidden" />
                      )}
                    </div>

                    {/* Content */}
                    <h3
                      className="landing-reveal-child mb-4 font-sans text-xl font-bold text-slate-900"
                      style={innerRevealStyle(1)}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="landing-reveal-child text-sm leading-relaxed text-slate-600 md:text-[0.95rem]"
                      style={innerRevealStyle(2)}
                    >
                      {step.description}
                    </p>

                    {/* Right arrow indicator for desktop */}
                    {index < steps.length - 1 && (
                      <div className="absolute -right-12 top-1/2 hidden -translate-y-1/2 transform lg:block">
                        <svg className="h-8 w-8 text-sea/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Bottom message */}
        <ScrollReveal className="mt-20 text-center" delayMs={100}>
          <p className="text-base text-slate-600">
            Ready to take control of your health?
          </p>
          <button className="button-primary mt-4 px-8 py-4">
            Start Your Journey
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}
