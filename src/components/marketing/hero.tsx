"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, MessageSquare, Target, Sparkles, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Floating UI Card Components
function ScoreCard() {
  return (
    <div className="absolute -right-4 top-8 w-56 sm:w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/10 border border-gray-200/50 p-4 transform rotate-3 hover:rotate-0 transition-transform duration-500 animate-float-slow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Call Score</span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Excellent</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="176"
              strokeDashoffset="26"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">85</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Sentiment</span>
            <span className="text-emerald-600 font-semibold">Positive</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Deal Prob.</span>
            <span className="text-purple-600 font-semibold">72%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscriptCard() {
  return (
    <div className="absolute -left-8 top-32 w-60 sm:w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-200/50 p-4 transform -rotate-2 hover:rotate-0 transition-transform duration-500 animate-float-medium">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Moment</span>
      </div>
      <div className="space-y-2">
        <div className="p-2 bg-purple-50 rounded-lg border-l-2 border-purple-500">
          <p className="text-xs text-gray-700">&quot;We&apos;ve been looking for exactly this kind of solution...&quot;</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full">Buying Signal</span>
          <span className="text-[10px] text-gray-400">2:34</span>
        </div>
      </div>
    </div>
  );
}

function ActionsCard() {
  return (
    <div className="absolute right-4 bottom-4 w-52 sm:w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 border border-gray-200/50 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500 animate-float-fast">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Steps</span>
      </div>
      <div className="space-y-2">
        {["Send pricing proposal", "Schedule demo call", "Share case study"].map((action, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
              i === 0 ? "bg-purple-500" : i === 1 ? "bg-indigo-500" : "bg-blue-500"
            )}>
              {i + 1}
            </div>
            <span className="text-xs text-gray-700">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { clientX, clientY } = e;
      const { width, height, left, top } = heroRef.current.getBoundingClientRect();
      const x = (clientX - left - width / 2) / 50;
      const y = (clientY - top - height / 2) / 50;

      heroRef.current.style.setProperty("--mouse-x", `${x}px`);
      heroRef.current.style.setProperty("--mouse-y", `${y}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 lg:pt-0"
      style={{ "--mouse-x": "0px", "--mouse-y": "0px" } as React.CSSProperties}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-purple-50/30" />

      {/* Gradient Mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-400/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-bl from-indigo-400/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-200/50 shadow-sm mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">AI-Powered Call Analysis</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6 animate-fade-in-up">
              Turn Every Sales Call Into{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Actionable Insights
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-purple-500/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Subheadline - concrete outcomes, careful language */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed animate-fade-in-up animation-delay-100">
              Reduce time spent on call reviews. Get consistent coaching at scale.
              Spot deal risks early. Kalyxi analyzes your conversations and delivers
              specific action items your team can use immediately.
            </p>

            {/* Single CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10 animate-fade-in-up animation-delay-200">
              <Link
                href="/register"
                className="group relative w-full sm:w-auto px-8 py-4 text-base font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Get Started
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </Link>
            </div>

            {/* Value props instead of fake logos */}
            <div className="animate-fade-in-up animation-delay-300">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-purple-500" />
                  <span>Instant Scoring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span>Performance Trends</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span>Action Items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Product Preview */}
          <div className="relative h-[400px] sm:h-[500px] lg:h-[550px] animate-fade-in animation-delay-200">
            {/* Main Preview Container */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl overflow-hidden"
              style={{
                transform: `translate(var(--mouse-x), var(--mouse-y))`,
                transition: "transform 0.3s ease-out"
              }}
            >
              {/* Glowing border */}
              <div className="absolute inset-0 rounded-3xl border border-white/10" />
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-purple-500/20 via-transparent to-indigo-500/20 opacity-50" />

              {/* Dashboard Preview Background */}
              <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/5">
                {/* Mock header */}
                <div className="flex items-center gap-2 p-4 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 bg-white/5 rounded-lg text-xs text-white/40">app.kalyxi.ai/dashboard</div>
                  </div>
                </div>

                {/* Mini chart visualization */}
                <div className="p-4">
                  <div className="flex items-end gap-1 h-20">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-purple-500/40 to-indigo-500/40 transition-all duration-500"
                        style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <ScoreCard />
            <TranscriptCard />
            <ActionsCard />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
