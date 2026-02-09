"use client";

import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Cookie, Shield, Settings, Globe, Clock, RefreshCw, Mail } from "lucide-react";

const sections = [
  {
    icon: Cookie,
    title: "1. What Are Cookies",
    content: `Cookies are small text files that are stored on your device when you visit a website. They help websites remember your preferences and improve your browsing experience.`,
  },
  {
    icon: Settings,
    title: "2. How We Use Cookies",
    content: "Kalyxi uses cookies for the following purposes:",
    subsections: [
      {
        subtitle: "2.1 Essential Cookies",
        description: "These cookies are necessary for the website to function properly. They enable core functionality such as authentication, security, and session management.",
        items: [
          "Authentication tokens",
          "Session identifiers",
          "Security cookies",
        ],
      },
      {
        subtitle: "2.2 Functional Cookies",
        description: "These cookies remember your preferences and settings to provide a more personalized experience.",
        items: [
          "Language preferences",
          "Theme settings (dark/light mode)",
          "Dashboard layout preferences",
        ],
      },
      {
        subtitle: "2.3 Analytics Cookies",
        description: "These cookies help us understand how visitors interact with our website so we can improve it.",
        items: [
          "Page views and navigation patterns",
          "Feature usage statistics",
          "Error tracking",
        ],
      },
    ],
  },
  {
    icon: Globe,
    title: "3. Third-Party Cookies",
    content: "We may use third-party services that set their own cookies:",
    items: [
      "Supabase - Authentication and database services",
      "Vercel - Hosting and analytics",
    ],
  },
  {
    icon: Shield,
    title: "4. Managing Cookies",
    content: "You can control and manage cookies in several ways:",
    items: [
      "Browser settings: Most browsers allow you to refuse or delete cookies through their settings menu.",
      "Opt-out tools: Some third-party services provide their own opt-out mechanisms.",
    ],
    note: "Please note that disabling essential cookies may affect the functionality of our platform.",
  },
  {
    icon: Clock,
    title: "5. Cookie Retention",
    content: "Different cookies are retained for different periods:",
    items: [
      "Session cookies: Deleted when you close your browser",
      "Persistent cookies: Remain until their expiration date or until you delete them",
      "Authentication cookies: Typically expire after 7-30 days",
    ],
  },
  {
    icon: RefreshCw,
    title: "6. Updates to This Policy",
    content: `We may update this Cookie Policy from time to time. We will notify you of any significant changes by posting the new policy on this page.`,
  },
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-6">
            <Cookie className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Cookie Information</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Cookie{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Learn how we use cookies to improve your experience on our platform.
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
                    <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
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
                            <div key={subIndex} className="bg-gray-50 rounded-xl p-4">
                              <h3 className="text-lg font-medium text-gray-800 mb-2">{sub.subtitle}</h3>
                              <p className="text-gray-600 text-sm mb-3">{sub.description}</p>
                              <ul className="space-y-2">
                                {sub.items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex items-start gap-3 text-gray-600 text-sm">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
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
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.note && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                          <p className="text-sm text-amber-800">{section.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl shadow-amber-500/25 p-6 sm:p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2">7. Contact Us</h2>
                  <p className="text-amber-100">
                    If you have questions about our use of cookies, please contact us at{" "}
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
