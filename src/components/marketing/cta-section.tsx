"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const benefits = [
  "No credit card required",
  "Free trial included",
  "Cancel anytime",
  "Full feature access",
];

// Pre-computed particle positions to avoid hydration mismatch
const particles = [
  { left: 12, top: 8, delay: 0.2, duration: 4.5 },
  { left: 85, top: 15, delay: 1.3, duration: 5.2 },
  { left: 45, top: 25, delay: 2.1, duration: 3.8 },
  { left: 72, top: 42, delay: 0.8, duration: 4.9 },
  { left: 28, top: 55, delay: 3.2, duration: 5.5 },
  { left: 92, top: 68, delay: 1.7, duration: 4.2 },
  { left: 15, top: 78, delay: 2.9, duration: 3.5 },
  { left: 58, top: 88, delay: 0.5, duration: 4.7 },
  { left: 38, top: 35, delay: 4.1, duration: 5.8 },
  { left: 78, top: 92, delay: 1.1, duration: 3.9 },
  { left: 5, top: 45, delay: 3.7, duration: 4.4 },
  { left: 65, top: 12, delay: 2.5, duration: 5.1 },
  { left: 22, top: 95, delay: 0.9, duration: 4.0 },
  { left: 88, top: 52, delay: 3.4, duration: 5.6 },
  { left: 52, top: 72, delay: 1.9, duration: 3.7 },
];

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700" />

      {/* Animated orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl transition-transform duration-1000 ease-out"
        style={{
          left: `${mousePosition.x * 30}%`,
          top: `${mousePosition.y * 30}%`,
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full bg-indigo-400/20 blur-3xl transition-transform duration-1000 ease-out"
        style={{
          right: `${(1 - mousePosition.x) * 30}%`,
          bottom: `${(1 - mousePosition.y) * 30}%`,
        }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-sm font-semibold text-white">Start Improving Today</span>
        </div>

        {/* Headline */}
        <h2
          className={cn(
            "text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          Ready to Transform Your
          <br />
          <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-200 bg-clip-text text-transparent">
            Sales Performance?
          </span>
        </h2>

        {/* Subheadline */}
        <p
          className={cn(
            "text-xl text-white/80 max-w-2xl mx-auto mb-10 transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          Stop guessing. Start coaching with data. Kalyxi gives your team the insights they need to close more deals.
        </p>

        {/* Single CTA */}
        <div
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-700 font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-purple-200/50 to-transparent" />
            </div>
            <span className="relative">Get Started</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Benefits */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-6 gap-y-3 transition-all duration-700 delay-400",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-white/80">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
