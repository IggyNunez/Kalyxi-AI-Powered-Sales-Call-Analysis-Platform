import Link from "next/link";
import { Phone, BarChart3, Zap, Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Kalyxi</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            AI-Powered Sales Call
            <span className="text-indigo-600"> Analysis</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Transform your sales conversations into actionable insights. Kalyxi uses advanced AI to analyze your calls,
            identify winning patterns, and help your team close more deals.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything you need to improve sales performance
          </h2>
          <p className="mt-4 text-gray-600">
            Powerful features to help your team close more deals
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">AI Transcription</h3>
            <p className="mt-2 text-sm text-gray-600">
              Automatically transcribe your sales calls with high accuracy using advanced speech recognition.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Smart Analytics</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get detailed analytics on talk ratio, sentiment, objections, and more to understand call dynamics.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <Phone className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Call Scoring</h3>
            <p className="mt-2 text-sm text-gray-600">
              Each call receives an AI-generated score based on best practices and customizable criteria.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Actionable Insights</h3>
            <p className="mt-2 text-sm text-gray-600">
              Receive personalized coaching recommendations and identify areas for improvement.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Close more deals with AI-powered insights
              </h2>
              <p className="mt-4 text-gray-600">
                Kalyxi analyzes every aspect of your sales calls to help you understand what works and what doesn&apos;t.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Identify winning talk patterns and replicate success",
                  "Spot objections early and handle them effectively",
                  "Track deal probability and prioritize follow-ups",
                  "Coach your team with data-driven feedback",
                  "Monitor sentiment to gauge customer interest",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Overall Score</span>
                  <span className="text-2xl font-bold text-green-600">85%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-2 w-[85%] rounded-full bg-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Sentiment</p>
                    <p className="text-lg font-semibold text-green-600">Positive</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Deal Probability</p>
                    <p className="text-lg font-semibold text-indigo-600">72%</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-gray-700">Key Insight</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Strong discovery questions led to uncovering key pain points. Consider scheduling a demo follow-up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-indigo-600 px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to transform your sales calls?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
            Join thousands of sales teams using Kalyxi to close more deals and improve performance.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Kalyxi</span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Kalyxi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
