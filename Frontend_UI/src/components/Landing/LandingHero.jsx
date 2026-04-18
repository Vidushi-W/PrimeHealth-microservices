import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../../assets/images/hero-main.jpg';

export default function LandingHero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-20 pb-16 md:pt-32 md:pb-32">
      {/* Background gradient accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-100 via-mint/20 to-transparent rounded-full blur-3xl opacity-40 -z-10" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-gradient-to-tr from-sea/10 to-transparent rounded-full blur-3xl opacity-30 -z-10" />

      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2">
          <span className="w-2 h-2 bg-sea rounded-full animate-pulse" />
          <span className="text-sm font-medium text-brand-700">Welcome to the future of healthcare</span>
        </div>

        {/* Main headline */}
        <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
          Healthcare Made <span className="text-transparent bg-clip-text bg-gradient-to-r from-sea to-teal-600">Simple & Accessible</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-12 max-w-3xl text-xl font-light leading-relaxed text-slate-600 md:text-2xl">
          Connect with qualified doctors, book appointments in seconds, and access your health records anytime. All from one beautiful platform.
        </p>

        {/* CTA Buttons */}
        <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="button-primary px-8 py-4"
          >
            Get Started Now
          </Link>
          <button className="button-secondary px-8 py-4">
            Watch Demo
          </button>
        </div>

        {/* Hero image */}
        <div className="relative w-full max-w-5xl mx-auto">
          <div className="panel aspect-video overflow-hidden rounded-3xl">
            <img
              src={heroImage}
              alt="Doctor consulting a patient through telemedicine"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          
          {/* Floating cards for visual interest */}
          <div className="absolute -left-8 top-1/3 bg-white p-4 rounded-xl shadow-lg border border-gray-100 hidden lg:block animate-float">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">250K+</p>
                <p className="text-xs text-gray-600">Active Patients</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-8 bottom-1/4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 hidden lg:block animate-float" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sea font-bold text-sm">⭐</span>
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
