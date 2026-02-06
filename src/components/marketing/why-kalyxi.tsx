"use client";

import { useEffect, useRef, useState } from "react";
import { Target, Users, AlertTriangle, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const pillars = [
  {
    icon: Target,
    title: "Accurate Analysis",
    description: "GPT-4 powered analysis captures nuances that manual review misses. Every call gets consistent, thorough evaluation.",
    color: "purple",
  },
  {
    icon: Users,
    title: "Coaching at Scale",
    description: "Deliver personalized feedback to every rep after every call—without managers spending hours on review.",
    color: "indigo",
  },
  {
    icon: AlertTriangle,
    title: "Deal Risk Detection",
    description: "Identify at-risk deals early through sentiment analysis, objection tracking, and engagement signals.",
    color: "amber",
  },
  {
    icon: Zap,
    title: "Actionable Insights",
    description: "Move beyond vanity metrics. Get specific, implementable recommendations that drive real improvement.",
    color: "emerald",
  },
];

export function WhyKalyxi() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Why{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Kalyxi
            </span>
          </h2>
          <p
            className={cn(
              "text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Built for sales teams who want data-driven coaching without the manual overhead.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            const colorClasses = {
              purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
              indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/25",
              amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
              emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
            };

            return (
              <div
                key={index}
                className={cn(
                  "group p-6 rounded-2xl bg-white border border-gray-200/50 shadow-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-1",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br text-white mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110",
                    colorClasses[pillar.color as keyof typeof colorClasses]
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{pillar.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{pillar.description}</p>
              </div>
            );
          })}
        </div>

        {/* Security credibility line */}
        <div
          className={cn(
            "flex items-center justify-center gap-3 text-sm text-gray-500 transition-all duration-700 delay-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Multi-tenant architecture with row-level security and role-based access control</span>
        </div>
      </div>
    </section>
  );
}
