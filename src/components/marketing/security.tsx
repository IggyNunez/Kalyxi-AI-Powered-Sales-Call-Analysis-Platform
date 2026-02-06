"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Lock, Server, Users, Database, Key } from "lucide-react";
import { cn } from "@/lib/utils";

const securityFeatures = [
  {
    icon: Lock,
    title: "Data Encryption",
    description: "All data encrypted in transit and at rest. Your call data is always protected.",
  },
  {
    icon: Database,
    title: "Row-Level Security",
    description: "Multi-tenant architecture with Supabase RLS ensures complete data isolation between organizations.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Granular permissions for Callers, Admins, and Superadmins. Control who sees what.",
  },
  {
    icon: Key,
    title: "Secure Authentication",
    description: "Built on Supabase Auth with secure session management and password hashing.",
  },
];

const trustIndicators = [
  { label: "Multi-tenant isolation", icon: Server },
  { label: "Secure API endpoints", icon: Shield },
  { label: "Data retention controls", icon: Database },
];

export function Security() {
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
    <section id="security" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(#8B5CF6 1px, transparent 1px), linear-gradient(90deg, #8B5CF6 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-6 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Enterprise-Grade Security</span>
          </div>
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Your Data is{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Protected
            </span>
          </h2>
          <p
            className={cn(
              "text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Built with security-first architecture to protect your most sensitive sales conversations.
          </p>
        </div>

        {/* Security Card */}
        <div
          className={cn(
            "relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 lg:p-12 transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Glow effect */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

          {/* Shield illustration */}
          <div className="absolute top-8 right-8 lg:top-12 lg:right-12 opacity-10">
            <Shield className="w-32 h-32 lg:w-48 lg:h-48 text-white" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Left - Features */}
            <div className="space-y-6">
              {securityFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-4 transition-all duration-500",
                      isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                    )}
                    style={{ transitionDelay: `${400 + index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right - Trust indicators */}
            <div className="flex flex-col justify-center">
              <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-6">Built for Enterprise</h3>
                <div className="space-y-4">
                  {trustIndicators.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl bg-white/5 transition-all duration-500",
                          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                        )}
                        style={{ transitionDelay: `${600 + index * 100}ms` }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-medium">{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Technology stack */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-4">Powered By</p>
                  <div className="flex flex-wrap gap-3">
                    {["Supabase", "PostgreSQL", "Row-Level Security", "JWT Auth"].map((tech, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-white/10 rounded-full text-sm text-white/80 font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
