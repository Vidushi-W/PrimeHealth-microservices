import React from 'react';
import { Link } from 'react-router-dom';
import LandingHero from '../components/Landing/LandingHero';
import FeaturesSection from '../components/Landing/FeaturesSection';
import HowItWorks from '../components/Landing/HowItWorks';
import Benefits from '../components/Landing/Benefits';
import Testimonials from '../components/Landing/Testimonials';
import CTASection from '../components/Landing/CTASection';
import Footer from '../components/Landing/Footer';

export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden bg-brand-radial">
      <LandingHero />
      <FeaturesSection />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
}
