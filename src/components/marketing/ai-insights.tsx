"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, TrendingUp, AlertCircle, Target, Clock, ThumbsUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

// Sample data for the insights showcase
const sampleInsights = {
  overallScore: 87,
  sentiment: "Positive",
  sentimentScore: 0.72,
  talkRatio: { rep: 42, prospect: 58 },
  keyMoments: [
    { time: "1:23", type: "positive", text: "Strong rapport building" },
    { time: "3:45", type: "objection", text: 'Objection: "Too expensive"' },
    { time: "4:12", type: "positive", text: "Effective objection handling" },
    { time: "6:30", type: "action", text: "Prospect requested demo" },
  ],
  objections: [
    { text: "Price concern", handled: true, effectiveness: 85 },
    { text: "Implementation time", handled: true, effectiveness: 70 },
  ],
  recommendations: [
    "Send ROI calculator within 24 hours",
    "Schedule follow-up demo with technical team",
    "Share case study from similar industry",
  ],
};

// Sentiment trend data for Recharts
const sentimentData = [
  { time: "0:00", sentiment: 60, label: "Opening" },
  { time: "1:00", sentiment: 65, label: "" },
  { time: "2:00", sentiment: 55, label: "Discovery" },
  { time: "3:00", sentiment: 70, label: "" },
  { time: "4:00", sentiment: 50, label: "Objection" },
  { time: "5:00", sentiment: 75, label: "Handled" },
  { time: "6:00", sentiment: 85, label: "" },
  { time: "7:00", sentiment: 90, label: "Interest" },
  { time: "8:00", sentiment: 85, label: "" },
  { time: "9:00", sentiment: 88, label: "Close" },
];

function SentimentChart() {
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sentimentData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[40, 100]}
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(17, 17, 27, 0.95)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            itemStyle={{ color: "#8B5CF6" }}
            formatter={(value) => [`${value}%`, "Sentiment"]}
          />
          <Area
            type="monotone"
            dataKey="sentiment"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#sentimentGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AIInsights() {
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
    <section id="insights" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800" />

      {/* Gradient accents */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-6 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <span className="text-sm font-semibold text-white/80">Sample Analysis Report</span>
          </div>
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            See What AI{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Uncovers
            </span>
          </h2>
          <p
            className={cn(
              "text-lg text-white/60 max-w-2xl mx-auto transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            Every call gets a comprehensive analysis with actionable insights your team can use immediately.
          </p>
        </div>

        {/* Insights Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Score & Sentiment */}
          <div
            className={cn(
              "space-y-6 transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Score Card */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Call Score</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                  Excellent
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="url(#insightScoreGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * sampleInsights.overallScore) / 100}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="insightScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{sampleInsights.overallScore}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">Sentiment</span>
                      <span className="text-emerald-400 font-semibold">{sampleInsights.sentiment}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        style={{ width: `${sampleInsights.sentimentScore * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">Talk Ratio</span>
                      <span className="text-white/80 font-semibold">{sampleInsights.talkRatio.rep}% / {sampleInsights.talkRatio.prospect}%</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-500" style={{ width: `${sampleInsights.talkRatio.rep}%` }} />
                      <div className="bg-indigo-500" style={{ width: `${sampleInsights.talkRatio.prospect}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sentiment Trend with Recharts */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Sentiment Trend</span>
              </div>
              <SentimentChart />
            </div>
          </div>

          {/* Middle Column - Key Moments */}
          <div
            className={cn(
              "p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-700 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Key Moments</span>
            </div>
            <div className="space-y-3">
              {sampleInsights.keyMoments.map((moment, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-xl border-l-2 transition-all duration-300",
                    moment.type === "positive" && "bg-emerald-500/10 border-emerald-500",
                    moment.type === "objection" && "bg-amber-500/10 border-amber-500",
                    moment.type === "action" && "bg-purple-500/10 border-purple-500"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        moment.type === "positive" && "text-emerald-400",
                        moment.type === "objection" && "text-amber-400",
                        moment.type === "action" && "text-purple-400"
                      )}
                    >
                      {moment.type}
                    </span>
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {moment.time}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">{moment.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Objections & Actions */}
          <div
            className={cn(
              "space-y-6 transition-all duration-700 delay-400",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Objections */}
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Objections Handled</span>
              </div>
              <div className="space-y-4">
                {sampleInsights.objections.map((objection, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/80">{objection.text}</span>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400 font-semibold">{objection.effectiveness}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${objection.effectiveness}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-sm border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Next Steps</span>
              </div>
              <div className="space-y-3">
                {sampleInsights.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                      {index + 1}
                    </div>
                    <span className="text-sm text-white/80 pt-0.5">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
