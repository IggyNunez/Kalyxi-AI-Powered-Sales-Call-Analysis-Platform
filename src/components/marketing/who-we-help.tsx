"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, Users, Headphones, Settings, Check, ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const personas = [
  {
    id: "founders",
    icon: Rocket,
    title: "Founders & CEOs",
    pain: "You can't scale what you can't measure. Flying blind on sales performance is killing your growth.",
    outcome: "Get real-time visibility into every deal, without sitting on every call.",
    benefits: [
      "Dashboard showing team-wide performance trends",
      "Early warning on at-risk deals",
      "Data to coach investors on sales efficiency",
    ],
    color: "purple",
  },
  {
    id: "managers",
    icon: Users,
    title: "Sales Managers",
    pain: "You don't have time to listen to every call, but inconsistent coaching is hurting quota attainment.",
    outcome: "Scale your coaching to the entire team with AI-powered insights.",
    benefits: [
      "Automated call scoring saves 10+ hours/week",
      "Identify exactly where each rep needs help",
      "Build playbooks from your top performers",
    ],
    color: "indigo",
  },
  {
    id: "reps",
    icon: Headphones,
    title: "SDRs & AEs",
    pain: "You know you could be better, but you don't get enough feedback on what's actually working.",
    outcome: "Get instant, specific coaching after every call to accelerate your growth.",
    benefits: [
      "See exactly what top performers do differently",
      "Personalized tips based on your call patterns",
      "Track your improvement over time",
    ],
    color: "blue",
  },
  {
    id: "revops",
    icon: Settings,
    title: "RevOps & Enablement",
    pain: "Building enablement programs without call data is like driving with your eyes closed.",
    outcome: "Data-driven enablement that actually moves the needle.",
    benefits: [
      "Identify skill gaps across the org",
      "Measure training effectiveness with real data",
      "Automate QA and compliance monitoring",
    ],
    color: "teal",
  },
];

export function WhoWeHelp() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("founders");
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

  const activePersona = personas.find((p) => p.id === activeTab);

  return (
    <section id="who-we-help" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Built for{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Your Role
            </span>
          </h2>
          <p
            className={cn(
              "text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Whether you&apos;re closing deals or building teams, Kalyxi adapts to your workflow.
          </p>
        </div>

        {/* Tabs */}
        <div
          className={cn(
            "flex flex-wrap justify-center gap-2 mb-12 transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => setActiveTab(persona.id)}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-300",
                activeTab === persona.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300"
              )}
            >
              <persona.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{persona.title}</span>
              <span className="sm:hidden">{persona.title.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activePersona && (
          <div
            className={cn(
              "grid lg:grid-cols-2 gap-8 lg:gap-12 items-center transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Left - Pain & Outcome */}
            <div className="space-y-6">
              {/* Pain Point */}
              <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-semibold text-red-700 uppercase tracking-wider">The Challenge</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{activePersona.pain}</p>
              </div>

              {/* Outcome */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-semibold text-purple-700 uppercase tracking-wider">The Solution</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{activePersona.outcome}</p>
              </div>

              {/* CTA */}
              <button
                type="button"
                className="group flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 transition-colors"
              >
                <span>See how it works for {activePersona.title.toLowerCase()}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Right - Benefits */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-3xl" />
              <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">What you get:</h3>
                <div className="space-y-4">
                  {activePersona.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 transition-all duration-300 hover:bg-purple-50 hover:border-purple-100"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-700 pt-1">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Testimonial placeholder */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400" />
                    <div>
                      <p className="text-sm text-gray-600 italic">&quot;Game-changer for our team.&quot;</p>
                      <p className="text-xs text-gray-500 mt-1">— VP Sales, Series B SaaS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
