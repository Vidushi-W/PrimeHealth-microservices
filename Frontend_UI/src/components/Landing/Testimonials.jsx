import React from 'react';
import testimonialDoctor1 from '../../assets/images/testimonial-doctor-1.jpg';
import testimonialDoctor2 from '../../assets/images/testimonial-doctor-2.jpg';
import testimonialPatient1 from '../../assets/images/testimonial-patient-1.jpg';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Patient',
    content: 'PrimeHealth made booking my doctor appointment so easy. I got a consultation within the same day without any hassle. Highly recommended!',
    rating: 5,
    image: testimonialPatient1
  },
  {
    name: 'Dr. Michael Chen',
    role: 'General Practitioner',
    content: 'The platform helps me manage my patients\' appointments efficiently. The interface is intuitive and my patients love the convenience.',
    rating: 5,
    image: testimonialDoctor1
  },
  {
    name: 'Priya Patel',
    role: 'Patient',
    content: 'I was skeptical about video consultations at first, but PrimeHealth made it so smooth. The doctor was professional and the service was excellent.',
    rating: 5,
    image: testimonialPatient1
  },
  {
    name: 'Dr. James Wilson',
    role: 'Cardiologist',
    content: 'As a busy specialist, I appreciate how this platform helps me reach more patients and provide quality care efficiently.',
    rating: 5,
    image: testimonialDoctor2
  }
];

export default function Testimonials() {
  return (
    <section className="w-full py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="mb-6 text-4xl font-black text-slate-900 md:text-5xl">
            Loved by Patients & Doctors
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-slate-600">
            See what users are saying about PrimeHealth and how it's transforming their healthcare experience.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="panel rounded-3xl p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Testimonial text */}
              <p className="mb-8 text-lg font-light leading-relaxed text-slate-700">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  loading="lazy"
                />
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video testimonial section */}
        <div className="panel mt-20 rounded-3xl border-none bg-gradient-to-br from-brand-50 to-sea/10 p-12 text-center">
          <h3 className="mb-6 text-3xl font-black text-slate-900">See Real Testimonials</h3>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600">
            Watch our video testimonials to hear directly from doctors and patients about their experience with PrimeHealth.
          </p>
          <div className="w-20 h-20 rounded-full bg-white border-4 border-sea mx-auto flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-300 shadow-lg">
            <svg className="w-10 h-10 text-sea ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
