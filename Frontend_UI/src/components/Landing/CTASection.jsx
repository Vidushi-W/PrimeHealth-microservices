import React from 'react';
import { Link } from 'react-router-dom';

export default function CTASection() {
  return (
    <section className="w-full py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12">
        {/* Main CTA Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sea via-brand-600 to-brand-700 p-12 text-center text-white shadow-soft md:p-20">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -z-10" />

          <h2 className="mb-6 text-4xl font-black md:text-5xl">
            Ready to Experience Better Healthcare?
          </h2>

          <p className="mx-auto mb-8 max-w-3xl text-xl font-light leading-relaxed text-white/90 md:text-2xl">
            Join thousands of patients already using PrimeHealth to discover doctors, book appointments, and take control of their health.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="button-secondary border-white bg-white px-8 py-4 text-sea hover:bg-white/90"
            >
              Get Started Free
            </Link>
            <button className="button-secondary border-white/70 bg-transparent px-8 py-4 text-white hover:bg-white/10">
              Schedule a Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-12 border-t border-white/20 flex flex-col sm:flex-row gap-8 justify-center">
            <div>
              <p className="text-3xl font-bold">250K+</p>
              <p className="text-white/80 text-sm mt-1">Happy Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-white/80 text-sm mt-1">Verified Doctors</p>
            </div>
            <div>
              <p className="text-3xl font-bold">98%</p>
              <p className="text-white/80 text-sm mt-1">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10 10.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Commitments</h3>
            <p className="text-gray-600">Start free with our basic plan. Upgrade whenever you're ready.</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM2 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.757 4.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-gray-600">Our support team is always ready to help with any questions.</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Bank-Level Security</h3>
            <p className="text-gray-600">Your health data is encrypted and protected with the highest standards.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
