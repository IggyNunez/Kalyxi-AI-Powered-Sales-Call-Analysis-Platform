"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  BarChart3,
  Target,
  Lightbulb,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Feature cards - 6 cards as specified
const features = [
  {
    icon: Mic,
    title: "AI Transcription",
    description: "Automatic, accurate transcription of every call with speaker detection and timestamps.",
    gradient: "from-purple-500 to-indigo-500",
    delay: 0,
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Talk ratio, sentiment trends, objection frequency, and performance insights over time.",
    gradient: "from-indigo-500 to-blue-500",
    delay: 100,
  },
  {
    icon: Target,
    title: "Call Scoring",
    description: "Every call scored against customizable criteria. Know exactly where to improve.",
    gradient: "from-blue-500 to-cyan-500",
    delay: 200,
  },
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    description: "Personalized coaching recommendations and specific action items for every rep.",
    gradient: "from-cyan-500 to-teal-500",
    delay: 0,
  },
  {
    icon: BookOpen,
    title: "Coaching Playbooks",
    description: "Build winning playbooks from top performers. Replicate success across your team.",
    gradient: "from-teal-500 to-emerald-500",
    delay: 100,
  },
  {
    icon: LayoutDashboard,
    title: "Team Dashboards",
    description: "Real-time visibility into team performance, trends, and improvement opportunities.",
    gradient: "from-emerald-500 to-green-500",
    delay: 200,
  },
];

function FeatureCard({
  feature,
}: {
  feature: (typeof features)[0];
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), feature.delay);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [feature.delay]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative p-6 rounded-2xl bg-white border border-gray-200/50 shadow-sm transition-all duration-500",
        "hover:shadow-lg hover:border-purple-200 hover:-translate-y-1",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
    >
      <div className="relative">
        {/* Icon */}
        <div
          className={cn(
            "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br text-white mb-4 shadow-lg",
            feature.gradient
          )}
        >
          <feature.icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
      </div>
    </div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <span className="text-sm font-semibold text-purple-700">Powerful Features</span>
          </div>
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Win More
            </span>
          </h2>
          <p
            className={cn(
              "text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Powerful features designed to help your sales team close more deals, faster.
          </p>
        </div>

        {/* Features Grid - 6 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
