"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Cpu, Sparkles, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Pre-generated waveform heights (deterministic instead of random in render)
const waveformHeights = [
  75, 45, 88, 32, 67, 91, 28, 54, 73, 39, 82, 47, 65, 93, 36, 58, 71, 44, 86, 31,
  69, 52, 78, 41, 63, 95, 34, 56, 74, 48, 81, 37, 66, 89, 29, 55, 72, 43, 84, 38,
];

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Import Your Calls",
    description: "Connect your dialer, upload recordings, or paste call notes. We support all major formats.",
    features: ["Zoom, Gong, Dialpad sync", "Bulk upload support", "API & webhook integration"],
    visual: "import",
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Analyzes Everything",
    description: "GPT-4 processes each call in seconds, extracting insights humans would miss.",
    features: ["Sentiment detection", "Objection mapping", "Key moment tagging"],
    visual: "analyze",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Get Actionable Insights",
    description: "Receive scores, coaching tips, and specific action items to improve every conversation.",
    features: ["Personalized coaching", "Deal risk alerts", "Win/loss patterns"],
    visual: "insights",
  },
];

function StepVisual({ step, isActive }: { step: string; isActive: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full rounded-2xl overflow-hidden transition-all duration-700",
        isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
      )}
    >
      {/* Import Visual */}
      {step === "import" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
            </div>
            <div className="flex-1 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center">
              <Upload className="w-12 h-12 text-purple-400 mb-4" />
              <p className="text-white/60 text-sm">Drop your calls here</p>
              <div className="mt-4 flex gap-2">
                {["MP3", "WAV", "M4A"].map((format) => (
                  <span key={format} className="px-2 py-1 bg-white/10 rounded text-xs text-white/40">
                    {format}
                  </span>
                ))}
              </div>
            </div>
            {/* Animated files */}
            <div className="mt-4 space-y-2">
              {[
                { name: "sales_call_jan15.mp3", status: "uploaded" },
                { name: "demo_acme_corp.wav", status: "processing" },
              ].map((file, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-3 bg-white/5 rounded-lg",
                    isActive && "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <span className="text-white/80 text-sm truncate">{file.name}</span>
                  {file.status === "uploaded" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analyze Visual */}
      {step === "analyze" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="h-full flex flex-col">
            {/* Waveform */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-white/60 text-xs">Analyzing call...</span>
              </div>
              <div className="flex items-end gap-0.5 h-16">
                {waveformHeights.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-t animate-pulse"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Processing indicators */}
            <div className="space-y-3">
              {[
                { label: "Transcribing audio", progress: 100, done: true },
                { label: "Detecting sentiment", progress: 85, done: false },
                { label: "Identifying objections", progress: 60, done: false },
                { label: "Scoring performance", progress: 30, done: false },
              ].map((task, i) => (
                <div key={i} className={cn("space-y-1", isActive && "animate-fade-in-up")} style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{task.label}</span>
                    {task.done ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-white/40 text-xs">{task.progress}%</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights Visual */}
      {step === "insights" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="h-full flex flex-col gap-4">
            {/* Score Card */}
            <div className={cn("p-4 bg-white/5 rounded-xl", isActive && "animate-fade-in-up")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs mb-1">Overall Score</p>
                  <p className="text-3xl font-bold text-white">87<span className="text-lg text-white/60">/100</span></p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-full">
                  Excellent
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className={cn("flex-1 space-y-2", isActive && "animate-fade-in-up")} style={{ animationDelay: "100ms" }}>
              <p className="text-white/60 text-xs">Key Insights</p>
              {[
                { type: "positive", text: "Strong objection handling at 2:34" },
                { type: "warning", text: "Missed opportunity to discuss pricing" },
                { type: "action", text: "Send case study within 24 hours" },
              ].map((insight, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg text-sm",
                    insight.type === "positive" && "bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500",
                    insight.type === "warning" && "bg-amber-500/10 text-amber-300 border-l-2 border-amber-500",
                    insight.type === "action" && "bg-purple-500/10 text-purple-300 border-l-2 border-purple-500"
                  )}
                >
                  {insight.text}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className={cn("p-3 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-xl border border-purple-500/20", isActive && "animate-fade-in-up")} style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">View full analysis</span>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
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

  // Auto-advance steps
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/30 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <span className="text-sm font-semibold text-purple-700">Simple 3-Step Process</span>
          </div>
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            From Call to{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Insight
            </span>{" "}
            in Seconds
          </h2>
          <p
            className={cn(
              "text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            No complex setup. No learning curve. Just import your calls and let AI do the heavy lifting.
          </p>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveStep(index)}
                className={cn(
                  "w-full text-left p-6 rounded-2xl border transition-all duration-300",
                  activeStep === index
                    ? "bg-white border-purple-200 shadow-lg shadow-purple-500/5"
                    : "bg-white/50 border-gray-200/50 hover:bg-white hover:border-gray-200",
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Step number/icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      activeStep === index
                        ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-600">{step.number}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>

                    {/* Features list - only show for active step */}
                    <div
                      className={cn(
                        "space-y-1.5 overflow-hidden transition-all duration-300",
                        activeStep === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      {step.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress indicator */}
                  {activeStep === index && (
                    <div className="hidden sm:block w-1 h-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-full bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full animate-progress-height" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Visual */}
          <div
            className={cn(
              "relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}
          >
            {/* Decorative gradient border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10" />

            {steps.map((step, index) => (
              <StepVisual key={index} step={step.visual} isActive={activeStep === index} />
            ))}

            {/* Step indicator dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    activeStep === index ? "w-6 bg-white" : "bg-white/50 hover:bg-white/75"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
