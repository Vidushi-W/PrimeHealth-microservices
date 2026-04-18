import React from 'react';
import featureAppointments from '../../assets/images/feature-appointments.jpg';
import featureDoctors from '../../assets/images/feature-doctors.jpg';
import featureTelemedicine from '../../assets/images/feature-telemedicine.jpg';
import featureSymptomChecker from '../../assets/images/feature-symptom-checker.jpg';
import featureInsights from '../../assets/images/feature-insights.jpg';

const features = [
  {
    icon: '🏥',
    title: 'Find & Book Doctors',
    description: 'Discover top-rated doctors in your area. Check availability and book appointments instantly without waiting.',
    image: featureDoctors,
    fromColor: '#eff6ff',
    toColor: '#cffafe'
  },
  {
    icon: '💬',
    title: 'Video Consultations',
    description: 'Connect with doctors via secure video calls from home. Perfect for follow-ups and non-emergency care.',
    image: featureTelemedicine,
    fromColor: '#faf5ff',
    toColor: '#fce7f3'
  },
  {
    icon: '🔍',
    title: 'Symptom Checker',
    description: 'Describe your symptoms and get AI-powered health insights. Helps you understand when to see a doctor.',
    image: featureSymptomChecker,
    fromColor: '#fffbeb',
    toColor: '#fed7aa'
  },
  {
    icon: '📊',
    title: 'Health Records',
    description: 'Access all your medical records, test results, and prescriptions in one secure place. Always at your fingertips.',
    image: featureInsights,
    fromColor: '#f0fdf4',
    toColor: '#d1fae5'
  },
  {
    icon: '📋',
    title: 'Appointment Management',
    description: 'Manage all your appointments in one place. Get reminders, reschedule, and track your health timeline.',
    image: featureAppointments,
    fromColor: '#ffe4e6',
    toColor: '#fecaca'
  },
  {
    icon: '👨‍⚕️',
    title: 'Personal Health Dashboard',
    description: 'Get personalized health insights, track your wellness goals, and receive recommendations tailored to you.',
    image: featureInsights,
    fromColor: '#eef2ff',
    toColor: '#dbeafe'
  }
];

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="mb-6 text-4xl font-black text-slate-900 md:text-5xl">
            Everything You Need for Better Health
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-600">
            From finding the right doctor to managing your health records, PrimeHealth provides all the tools you need in one intuitive platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="panel group cursor-pointer rounded-3xl border-none bg-gradient-to-br p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${feature.fromColor}, ${feature.toColor})`
              }}
            >
              {/* Icon */}
              <div className="text-5xl mb-4 inline-block transform group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <img
                src={feature.image}
                alt={feature.title}
                className="mb-5 h-40 w-full rounded-2xl object-cover shadow-sm"
                loading="lazy"
              />

              {/* Content */}
              <h3 className="mb-3 text-2xl font-black text-slate-900">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-slate-700">
                {feature.description}
              </p>

              {/* Arrow indicator */}
              <div className="flex items-center gap-2 mt-4 text-sea font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Learn more</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="mb-6 text-lg text-slate-600">
            Curious about any specific feature?
          </p>
          <button className="button-secondary px-8 py-3">
            Explore Full Feature List
          </button>
        </div>
      </div>
    </section>
  );
}
