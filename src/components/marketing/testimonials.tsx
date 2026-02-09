"use client";

import { useState } from "react";
import { Quote, Play, Star, Building2, Users } from "lucide-react";

const testimonials = [
  {
    id: 1,
    quote: "If you're looking for a solution that can help your team, that can help your company, that can really give you the data that you need at live and also instant feedback, this is the company to work with.",
    highlight: "I very rarely see AI solutions that can really do a difference when it comes to the numbers, and this is one that can.",
    author: "Mussa",
    role: "Co-founder",
    company: "Web Rank Digital",
    industry: "SaaS Marketing Services",
    hasVideo: true,
    stats: {
      experience: "10+ years in sales",
      useCase: "Sales team performance & coaching",
    },
  },
];

export function Testimonials() {
  const [activeIndex] = useState(0);
  const testimonial = testimonials[activeIndex];

  const handleWatchVideo = () => {
    // Scroll to hero section smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Dispatch custom event to open video modal in Hero
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("openDemoVideo"));
    }, 500);
  };

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-white via-purple-50/30 to-white">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
            <Quote className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Customer Stories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Trusted by Sales{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Leaders
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how teams are transforming their sales performance with Kalyxi
          </p>
        </div>

        {/* Main Testimonial Card */}
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl shadow-purple-500/10 border border-gray-100 overflow-hidden">
            {/* Decorative Quote Icon - Top Right */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-indigo-600/10 rounded-full flex items-center justify-center">
              <Quote className="w-10 h-10 text-purple-300" />
            </div>

            <div className="grid lg:grid-cols-5 gap-8 p-8 sm:p-12">
              {/* Content - spans 3 columns */}
              <div className="lg:col-span-3 space-y-6">
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Main Quote */}
                <blockquote className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Highlight Quote */}
                <div className="relative pl-4 border-l-4 border-purple-500">
                  <p className="text-lg font-medium text-purple-700 italic">
                    &ldquo;{testimonial.highlight}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-4 pt-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/25">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">{testimonial.author}</div>
                    <div className="text-gray-600">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>

                {/* Watch Video Button */}
                {testimonial.hasVideo && (
                  <button
                    type="button"
                    onClick={handleWatchVideo}
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <span className="relative flex items-center justify-center w-8 h-8 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                    </span>
                    Watch Full Testimonial
                  </button>
                )}
              </div>

              {/* Stats Card - spans 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-gray-50 to-purple-50/50 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">About the Company</h4>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{testimonial.company}</div>
                        <div className="text-sm text-gray-600">{testimonial.industry}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{testimonial.stats.experience}</div>
                        <div className="text-sm text-gray-600">{testimonial.stats.useCase}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Benefits */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <h4 className="text-sm font-semibold text-purple-200 uppercase tracking-wider mb-4">Key Results</h4>
                  <ul className="space-y-3">
                    {[
                      "Instant feedback for sales reps",
                      "Better team performance tracking",
                      "Improved coaching effectiveness",
                      "White-glove onboarding support",
                    ].map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-purple-300 rounded-full" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Ready to transform your sales team?{" "}
            <a href="/register" className="text-purple-600 font-semibold hover:text-purple-700 underline underline-offset-2">
              Get started today
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
