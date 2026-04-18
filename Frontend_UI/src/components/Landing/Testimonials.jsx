import React from 'react';
import ScrollReveal from './ScrollReveal';
import testimonialDoctor1 from '../../assets/images/testimonial-doctor-1.jpg';
import testimonialDoctor2 from '../../assets/images/testimonial-doctor-2.jpg';
import testimonialPatient1 from '../../assets/images/testimonial-patient-1.jpg';
import testimonialPatient2 from '../../assets/images/testimonial-patient-2.png';

const DEMO_VIDEO_EMBED_ID = 'jh5U5BnpGN8';

const innerRevealStyle = (step) => ({
  animationDelay: `${step * 0.16}s`,
  '--landing-reveal-inner-ms': '1700ms'
});

const testimonials = [
  {
    name: 'Geethma Dias',
    role: 'Patient',
    content: 'PrimeHealth made booking my doctor appointment so easy. I got a consultation within the same day without any hassle. Highly recommended!',
    rating: 5,
    image: testimonialPatient1
  },
  {
    name: 'Vidushi Weerasinghe',
    role: 'General Practitioner',
    content: 'The platform helps me manage my patients\' appointments efficiently. The interface is intuitive and my patients love the convenience.',
    rating: 5,
    image: testimonialDoctor1
  },
  {
    name: 'Sinali Perera',
    role: 'Patient',
    content: 'I was skeptical about video consultations at first, but PrimeHealth made it so smooth. The doctor was professional and the service was excellent.',
    rating: 5,
    image: testimonialPatient2
  },
  {
    name: 'Sithmi Sasanka',
    role: 'Cardiologist',
    content: 'As a busy specialist, I appreciate how this platform helps me reach more patients and provide quality care efficiently.',
    rating: 5,
    image: testimonialDoctor2
  }
];

export default function Testimonials() {
  return (
    <section className="w-full border-t border-slate-200/80 bg-slate-50/40 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <ScrollReveal className="mb-20 text-center">
          <h2 className="mb-6 font-sans text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Loved by Patients & Doctors
          </h2>
          <p className="mx-auto max-w-3xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            See what users are saying about PrimeHealth and how it's transforming their healthcare experience.
          </p>
        </ScrollReveal>

        {/* Testimonials Grid */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} className="h-full" delayMs={index * 125} translatePx={30}>
              <div className="panel h-full rounded-3xl p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                {/* Stars */}
                <div className="landing-reveal-child mb-6 flex gap-1" style={innerRevealStyle(0)}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 fill-current text-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Testimonial text */}
                <p
                  className="landing-reveal-child mb-8 text-base font-normal leading-relaxed text-slate-700"
                  style={innerRevealStyle(1)}
                >
                  &quot;{testimonial.content}&quot;
                </p>

                {/* Author */}
                <div className="landing-reveal-child flex items-center gap-4" style={innerRevealStyle(2)}>
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 md:text-base">{testimonial.name}</p>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-20" delayMs={100} translatePx={28}>
          <div
            id="platform-demo"
            className="panel scroll-mt-24 rounded-3xl border-none bg-gradient-to-br from-brand-50 to-sea/10 p-8 text-center md:p-12"
          >
            <h3
              className="landing-reveal-child mb-3 font-sans text-2xl font-extrabold tracking-tight text-slate-900"
              style={innerRevealStyle(0)}
            >
              Platform demo
            </h3>
            <p
              className="landing-reveal-child mx-auto mb-8 max-w-2xl text-sm font-normal text-slate-600 md:text-base"
              style={innerRevealStyle(1)}
            >
              Watch a short walkthrough of PrimeHealth on YouTube.
            </p>
            <div
              className="landing-reveal-child mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-slate-900/10"
              style={innerRevealStyle(2)}
            >
              <div className="relative aspect-video w-full">
                <iframe
                  title="PrimeHealth platform demo on YouTube"
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${DEMO_VIDEO_EMBED_ID}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <p className="landing-reveal-child mt-4 text-sm text-slate-500" style={innerRevealStyle(3)}>
              <a
                href="https://youtu.be/jh5U5BnpGN8?si=ycvAqvRoCwMlIcl1"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sea underline-offset-2 hover:underline"
              >
                Open on YouTube
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
