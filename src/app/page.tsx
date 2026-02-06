import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { WhyKalyxi } from "@/components/marketing/why-kalyxi";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { WhoWeHelp } from "@/components/marketing/who-we-help";
import { AIInsights } from "@/components/marketing/ai-insights";
import { Security } from "@/components/marketing/security";
import { CTASection } from "@/components/marketing/cta-section";
import { Footer } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Sticky Navigation */}
      <Navbar />

      {/* Hero - Main value proposition */}
      <Hero />

      {/* Why Kalyxi - 4 pillars value prop */}
      <WhyKalyxi />

      {/* Features Grid - 6 cards */}
      <Features />

      {/* How It Works - 3 step process */}
      <HowItWorks />

      {/* Who We Help - Persona tabs */}
      <WhoWeHelp />

      {/* AI Insights Showcase - Sample report with Recharts */}
      <AIInsights />

      {/* Security / Trust - Enterprise features */}
      <Security />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
