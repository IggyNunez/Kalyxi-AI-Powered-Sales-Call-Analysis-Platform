"use client";

import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

const sections = [
  {
    icon: Shield,
    title: "1. Introduction",
    content: `Kalyxi ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered sales call analysis platform.`,
  },
  {
    icon: Database,
    title: "2. Information We Collect",
    subsections: [
      {
        subtitle: "2.1 Information You Provide",
        items: [
          "Account information (name, email, password)",
          "Organization details",
          "Sales call recordings and transcriptions",
          "Notes and annotations",
        ],
      },
      {
        subtitle: "2.2 Automatically Collected Information",
        items: [
          "Device and browser information",
          "IP address and location data",
          "Usage patterns and analytics",
          "Cookies and similar technologies",
        ],
      },
    ],
  },
  {
    icon: Eye,
    title: "3. How We Use Your Information",
    items: [
      "To provide and maintain our services",
      "To analyze sales calls using AI technology",
      "To generate insights and coaching recommendations",
      "To improve our platform and develop new features",
      "To communicate with you about your account",
      "To ensure security and prevent fraud",
    ],
  },
  {
    icon: Lock,
    title: "4. Data Security",
    content: `We implement industry-standard security measures including encryption at rest and in transit, secure authentication, role-based access controls, and regular security audits. Your call data is processed securely and stored in compliance with applicable data protection regulations.`,
  },
  {
    icon: UserCheck,
    title: "5. Data Sharing",
    content: "We do not sell your personal information. We may share data with:",
    items: [
      "Service providers who assist in our operations",
      "AI processing partners (OpenAI) for call analysis",
      "Legal authorities when required by law",
    ],
  },
  {
    icon: UserCheck,
    title: "6. Your Rights",
    content: "Depending on your location, you may have rights to:",
    items: [
      "Access your personal data",
      "Correct inaccurate data",
      "Delete your data",
      "Export your data",
      "Opt out of certain processing",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Your Privacy Matters</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Privacy{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We are committed to protecting your data and being transparent about how we use it.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                        {section.title}
                      </h2>
                      {section.content && (
                        <p className="text-gray-600 leading-relaxed mb-4">{section.content}</p>
                      )}
                      {section.subsections && (
                        <div className="space-y-6">
                          {section.subsections.map((sub, subIndex) => (
                            <div key={subIndex}>
                              <h3 className="text-lg font-medium text-gray-800 mb-3">{sub.subtitle}</h3>
                              <ul className="space-y-2">
                                {sub.items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex items-start gap-3 text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      {section.items && !section.subsections && (
                        <ul className="space-y-2">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-3 text-gray-600">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl shadow-purple-500/25 p-6 sm:p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2">7. Contact Us</h2>
                  <p className="text-purple-100">
                    If you have questions about this Privacy Policy, please contact us at{" "}
                    <a
                      href="mailto:privacy@kalyxi.ai"
                      className="text-white font-semibold underline underline-offset-2 hover:no-underline"
                    >
                      privacy@kalyxi.ai
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
