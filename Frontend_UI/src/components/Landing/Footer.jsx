import React from 'react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'How it Works', href: '/#how-it-works' },
    { label: 'Why PrimeHealth', href: '/#about' },
    { label: 'Get Started', href: '/register' }
  ],
  Company: [
    { label: 'About Us', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
    { label: 'Patient Login', href: '/login' },
    { label: 'Doctor Login', href: '/login' }
  ],
  Legal: [
    { label: 'Privacy Notice', href: '/#contact' },
    { label: 'Terms of Service', href: '/#contact' },
    { label: 'Cookie Policy', href: '/#contact' },
    { label: 'Disclaimer', href: '/#contact' }
  ],
  Support: [
    { label: 'Help Center', href: '/#contact' },
    { label: 'Contact Us', href: '/#contact' },
    { label: 'Book Appointment', href: '/login' },
    { label: 'Telemedicine', href: '/login' }
  ]
};

export default function Footer() {
  return (
    <footer id="contact" className="w-full border-t border-slate-800 bg-slate-900 text-slate-300">
      {/* Main footer content */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-16 md:py-20">
        {/* Top section with logo and newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 pb-16 border-b border-gray-800">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-white">PrimeHealth</h2>
              <p className="mt-2 text-slate-400">Healthcare Made Simple & Accessible</p>
            </div>
            <p className="max-w-sm leading-relaxed text-slate-400">
              Connect with quality doctors, book appointments instantly, and take control of your health. All in one beautiful platform.
            </p>
            {/* Social links */}
            <div className="flex gap-4 mt-6">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors duration-300 hover:bg-sea">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.29 20v-7.21H5.73V9.25h2.56V7.07c0-2.55 1.55-3.94 3.84-3.94 1.09 0 2.03.08 2.3.11v2.67h-1.58c-1.24 0-1.48.59-1.48 1.45v1.9h2.95l-.38 3.54h-2.57V20" />
                </svg>
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors duration-300 hover:bg-sea">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M20 3.795a8.158 8.158 0 01-2.336.639 4.074 4.074 0 001.787-2.247 8.151 8.151 0 01-2.583.989 4.078 4.078 0 00-6.946 3.718A11.571 11.571 0 011.458 2.393a4.077 4.077 0 001.263 5.441A4.061 4.061 0 01.8 7.713v.051a4.08 4.08 0 003.27 3.996 4.065 4.065 0 01-1.842.07 4.08 4.08 0 003.81 2.833A8.159 8.159 0 010 14.2a11.555 11.555 0 006.29 1.843c7.547 0 11.675-6.252 11.675-11.675 0-.178-.003-.355-.01-.529A8.321 8.321 0 0020 3.795" />
                </svg>
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors duration-300 hover:bg-sea">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18.5 0h-17A1.5 1.5 0 000 1.5v17A1.5 1.5 0 001.5 20h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0018.5 0zM6 17H3V7.5h3V17zm-1.5-11.25a1.735 1.735 0 110-3.47 1.735 1.735 0 010 3.47zM17 17h-3v-4.75c0-1.13-.02-2.6-1.585-2.6-1.59 0-1.835 1.24-1.835 2.52V17h-3V7.5h2.88v1.35h.04c.4-.76 1.39-1.56 2.86-1.56 3.06 0 3.625 2.01 3.625 4.63V17z" />
                </svg>
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors duration-300 hover:bg-sea">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 0a10 10 0 1010 10A10.009 10.009 0 0010 0zm3.647 5.12s1.88.129 2.261 1.96c.382 1.831-1.438 5.11-4.286 7.418 0 0-1.879 1.438-2.86 0a15.65 15.65 0 01-1.574-2.348l-1.208-.962a.61.61 0 01.009-1.006c.809-.674 1.618-.852 2.427-1.27.809-.418.67-1.575.252-2.341-.418-.766-2.295-1.142-3.486-.468v-.501C3.53 3.52 6.35 2.99 8.28 4.038c1.93 1.047 2.367 3.222 3.647 5.12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Newsletter signup */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
            <h3 className="text-white text-xl font-bold mb-2">Stay Updated</h3>
            <p className="mb-6 text-sm text-slate-400">Get the latest healthcare tips and platform updates delivered to your inbox.</p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 transition-colors duration-300 focus:border-sea focus:outline-none"
              />
              <button className="button-primary rounded-lg px-4 py-3">
                Subscribe
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">We respect your privacy. Unsubscribe at any time.</p>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-6">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-sm">
            &copy; 2024 PrimeHealth. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
            <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
            <a href="#" className="hover:text-white transition-colors duration-300">Cookies</a>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-green-400 text-sm font-semibold">✓ HIPAA Compliant</p>
            </div>
            <div className="text-center">
              <p className="text-green-400 text-sm font-semibold">✓ ISO 27001</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
