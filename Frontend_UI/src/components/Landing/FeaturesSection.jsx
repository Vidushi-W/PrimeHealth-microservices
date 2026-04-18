import React from 'react';
import ScrollReveal from './ScrollReveal';
import featureDoctors from '../../assets/images/feature-doctors.jpg';
import featureSymptomChecker from '../../assets/images/feature-symptom-checker.jpg';
import featureInsights from '../../assets/images/feature-insights.jpg';
import landingContactlessPayment from '../../assets/images/landing-contactless-payment.png';
import landingOnlinePayment from '../../assets/images/landing-online-payment.png';
import landingVideoConsultation from '../../assets/images/landing-video-consultation.png';
import {
  IconCalendar,
  IconChartRecords,
  IconDashboard,
  IconSearchHealth,
  IconUsersDoctors,
  IconVideo
} from './landingIcons';

const features = [
  {
    Icon: IconUsersDoctors,
    title: 'Find & Book Doctors',
    description: 'Discover top-rated doctors in your area. Check availability and book appointments instantly without waiting.',
    image: featureDoctors
  },
  {
    Icon: IconVideo,
    title: 'Video Consultations',
    description: 'Connect with doctors via secure video calls from home. Perfect for follow-ups and non-emergency care.',
    image: landingVideoConsultation
  },
  {
    Icon: IconSearchHealth,
    title: 'Symptom Checker',
    description: 'Describe your symptoms and get AI-powered health insights. Helps you understand when to see a doctor.',
    image: featureSymptomChecker
  },
  {
    Icon: IconChartRecords,
    title: 'Health Records',
    description: 'Access all your medical records, test results, and prescriptions in one secure place. Always at your fingertips.',
    image: featureInsights
  },
  {
    Icon: IconCalendar,
    title: 'Appointment Management',
    description: 'Manage all your appointments in one place. Get reminders, reschedule, and track your health timeline.',
    image: landingContactlessPayment
  },
  {
    Icon: IconDashboard,
    title: 'Personal Health Dashboard',
    description: 'Get personalized health insights, track your wellness goals, and receive recommendations tailored to you.',
    image: landingOnlinePayment
  }
];

const innerRevealStyle = (step) => ({
  animationDelay: `${step * 0.12}s`,
  '--landing-reveal-inner-ms': '1180ms'
});

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="w-full border-t border-slate-200/80 bg-slate-50/60 pt-24 pb-14 md:pt-32 md:pb-16"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <ScrollReveal className="mb-16 text-center md:mb-20">
          <h2 className="mb-6 font-sans text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Everything You Need for Better Health
          </h2>
          <p className="mx-auto max-w-3xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            From finding the right doctor to managing your health records, PrimeHealth provides all the tools you need in one intuitive platform.
          </p>
        </ScrollReveal>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const FeatureIcon = feature.Icon;
            return (
              <ScrollReveal key={index} className="h-full" delayMs={index * 80} translatePx={22}>
                <div className="group flex h-full cursor-pointer flex-col rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sea/25 hover:shadow-lg [backdrop-filter:none]">
                  <div
                    className="landing-reveal-child mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sea/10 text-sea ring-1 ring-sea/15 transition-transform duration-300 group-hover:bg-sea/15"
                    style={innerRevealStyle(0)}
                  >
                    <FeatureIcon className="h-7 w-7" aria-hidden />
                  </div>
                  <div
                    className="landing-reveal-child mb-5 overflow-hidden rounded-2xl ring-1 ring-slate-200/80"
                    style={innerRevealStyle(1)}
                  >
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>

                  <h3
                    className="landing-reveal-child mb-3 font-sans text-lg font-bold text-slate-900 md:text-xl"
                    style={innerRevealStyle(2)}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="landing-reveal-child grow text-sm leading-relaxed text-slate-600 md:text-[0.95rem]"
                    style={innerRevealStyle(3)}
                  >
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 font-semibold text-sea opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span>Learn more</span>
                    <svg className="h-4 w-4 transform transition-transform group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal className="mt-14 text-center md:mt-16" delayMs={120}>
          <p className="mb-6 text-base text-slate-600">
            Curious about any specific feature?
          </p>
          <button className="button-secondary px-8 py-3">
            Explore Full Feature List
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}
