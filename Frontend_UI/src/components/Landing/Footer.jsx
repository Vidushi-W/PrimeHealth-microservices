import React from 'react';
import ScrollReveal from './ScrollReveal';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'How it Works', href: '/#how-it-works' },
    { label: 'Why PrimeHealth', href: '/#about' }
  ],
  QuickLinks: [
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
    { label: 'Sign In', href: '/login' },
    { label: 'Sign Up', href: '/register' }
  ]
};

export default function Footer() {
  return (
    <footer id="contact" className="w-full border-t border-slate-800 bg-slate-900 text-slate-300">
      <ScrollReveal className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-12 lg:px-12">
        <div className="mb-8 grid grid-cols-1 gap-8 border-b border-gray-800 pb-8 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="font-sans text-lg font-bold tracking-tight text-white">PrimeHealth</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Healthcare made simple and accessible.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <p className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px]">☎</span>
                +94 11 000 1234
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px]">✉</span>
                support@primehealth.app
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-sea hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.29 20v-7.21H5.73V9.25h2.56V7.07c0-2.55 1.55-3.94 3.84-3.94 1.09 0 2.03.08 2.3.11v2.67h-1.58c-1.24 0-1.48.59-1.48 1.45v1.9h2.95l-.38 3.54h-2.57V20" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-sea hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18.5 0h-17A1.5 1.5 0 000 1.5v17A1.5 1.5 0 001.5 20h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0018.5 0zM6 17H3V7.5h3V17zm-1.5-11.25a1.735 1.735 0 110-3.47 1.735 1.735 0 010 3.47zM17 17h-3v-4.75c0-1.13-.02-2.6-1.585-2.6-1.59 0-1.835 1.24-1.835 2.52V17h-3V7.5h2.88v1.35h.04c.4-.76 1.39-1.56 2.86-1.56 3.06 0 3.625 2.01 3.625 4.63V17z" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-sea hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M20 3.795a8.158 8.158 0 01-2.336.639 4.074 4.074 0 001.787-2.247 8.151 8.151 0 01-2.583.989 4.078 4.078 0 00-6.946 3.718A11.571 11.571 0 011.458 2.393a4.077 4.077 0 001.263 5.441A4.061 4.061 0 01.8 7.713v.051a4.08 4.08 0 003.27 3.996 4.065 4.065 0 01-1.842.07 4.08 4.08 0 003.81 2.833A8.159 8.159 0 010 14.2a11.555 11.555 0 006.29 1.843c7.547 0 11.675-6.252 11.675-11.675 0-.178-.003-.355-.01-.529A8.321 8.321 0 0020 3.795" />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="mb-3 text-sm font-semibold text-white">{category === 'QuickLinks' ? 'Quick Links' : category}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-gray-400 transition-colors duration-300 hover:text-white">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-5 md:flex-row">
          <p className="text-sm text-gray-500">
            &copy; 2024 PrimeHealth. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-emerald-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              HIPAA aligned
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Secure platform
            </span>
          </div>
          <div className="flex gap-5 text-sm text-gray-400">
            <a href="/#contact" className="transition-colors duration-300 hover:text-white">Privacy</a>
            <a href="/#contact" className="transition-colors duration-300 hover:text-white">Terms</a>
          </div>
        </div>
      </ScrollReveal>
    </footer>
  );
}
