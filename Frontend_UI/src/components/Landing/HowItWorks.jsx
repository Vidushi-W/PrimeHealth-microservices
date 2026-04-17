import React from 'react';

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

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="mb-6 text-4xl font-black text-slate-900 md:text-5xl">
            Getting Started is Simple
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-600">
            Four easy steps to connect with quality healthcare whenever you need it.
          </p>
        </div>

        {/* Steps Container */}
        <div className="relative">
          {/* Connection line - hidden on mobile */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sea/30 to-transparent" />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step card */}
                <div className="panel h-full rounded-3xl p-8 transition-shadow duration-300 hover:shadow-lg">
                  {/* Step number - Large circle */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sea to-brand-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-2xl font-bold">{step.number}</span>
                    </div>
                    {/* Mobile vertical connector */}
                    {index < steps.length - 1 && (
                      <div className="md:hidden absolute left-8 -bottom-8 w-0.5 h-8 bg-gradient-to-b from-sea to-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="mb-4 text-2xl font-black text-slate-900">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-slate-600">
                    {step.description}
                  </p>

                  {/* Right arrow indicator for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-12 top-1/2 transform -translate-y-1/2">
                      <svg className="w-8 h-8 text-sea/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H6" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom message */}
        <div className="mt-20 text-center">
          <p className="text-lg text-slate-600">
            Ready to take control of your health?
          </p>
          <button className="button-primary mt-4 px-8 py-4">
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}
