import React from 'react';
import doctorProfileImage from '../../assets/images/doctor-profile.jpg';

const benefits = [
  {
    icon: '⏱️',
    title: 'Save Time',
    description: 'No more waiting on phone lines or endless email chains. Book appointments in seconds.'
  },
  {
    icon: '💰',
    title: 'Affordable Care',
    description: 'Transparent pricing with no hidden fees. Access quality healthcare within your budget.'
  },
  {
    icon: '🔒',
    title: 'Your Privacy Matters',
    description: 'Bank-level encryption keeps your health data secure and private. Only you control who sees your information.'
  },
  {
    icon: '🌍',
    title: 'Healthcare Anywhere',
    description: 'Access care from home, work, or while traveling. No location barriers to quality healthcare.'
  }
];

export default function Benefits() {
  return (
    <section id="about" className="w-full py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Real healthcare image */}
          <div className="relative">
            <div className="panel aspect-square overflow-hidden rounded-3xl">
              <img
                src={doctorProfileImage}
                alt="Real doctor consulting a patient"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div>
            <h2 className="mb-12 text-4xl font-black text-slate-900 md:text-5xl">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-sea to-teal-600">PrimeHealth?</span>
            </h2>

            <div className="space-y-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-6">
                  {/* Icon */}
                  <div className="text-4xl flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-sea/10">
                    {benefit.icon}
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="mb-2 text-2xl font-black text-slate-900">
                      {benefit.title}
                    </h3>
                    <p className="leading-relaxed text-slate-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional trust markers */}
            <div className="mt-12 pt-12 border-t border-gray-200">
              <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-600">Trusted by over 250,000 users worldwide</p>
              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-sea">4.9/5</p>
                  <p className="mt-1 text-sm text-slate-600">App Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-sea">98%</p>
                  <p className="mt-1 text-sm text-slate-600">Satisfaction Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-sea">50K+</p>
                  <p className="mt-1 text-sm text-slate-600">Verified Doctors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
