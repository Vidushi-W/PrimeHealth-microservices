import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => (location.pathname === path ? 'text-sea' : 'text-slate-700 hover:text-sea');

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-brand-100 bg-white/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sea to-brand-700 flex items-center justify-center">
            <span className="text-white font-bold text-lg">✦</span>
          </div>
          <span className="text-2xl font-black text-slate-900">PrimeHealth</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`font-medium transition-colors duration-300 ${isActive('/')}`}>
            Home
          </Link>
          <Link to="/#features" className="font-medium text-slate-700 transition-colors duration-300 hover:text-sea">
            Features
          </Link>
          <Link to="/#about" className="font-medium text-slate-700 transition-colors duration-300 hover:text-sea">
            About
          </Link>
          <Link to="/#contact" className="font-medium text-slate-700 transition-colors duration-300 hover:text-sea">
            Contact
          </Link>
        </div>

        {/* Auth Links */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="button-secondary px-6 py-2"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="button-primary px-6 py-2.5"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 transition-colors duration-300 hover:bg-brand-50 md:hidden"
        >
          <svg className="h-6 w-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-brand-100 bg-white md:hidden">
          <div className="px-6 py-4 space-y-4">
            <Link to="/" className="block font-medium text-slate-700 hover:text-sea" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/#features" className="block font-medium text-slate-700 hover:text-sea" onClick={() => setMobileMenuOpen(false)}>
              Features
            </Link>
            <Link to="/#about" className="block font-medium text-slate-700 hover:text-sea" onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <Link to="/#contact" className="block font-medium text-slate-700 hover:text-sea" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
            <div className="space-y-3 border-t border-brand-100 pt-4">
              <Link
                to="/login"
                className="button-secondary block px-4 py-2 text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="button-primary block px-4 py-2 text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
