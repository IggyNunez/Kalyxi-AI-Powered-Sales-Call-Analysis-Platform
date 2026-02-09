"use client";

import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { FileText, CheckCircle, UserX, Scale, AlertTriangle, Clock, RefreshCw, Mail } from "lucide-react";

const sections = [
  {
    icon: CheckCircle,
    title: "1. Acceptance of Terms",
    content: `By accessing or using Kalyxi's AI-powered sales call analysis platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.`,
  },
  {
    icon: FileText,
    title: "2. Description of Service",
    content: "Kalyxi provides an AI-powered platform for analyzing sales calls, generating insights, coaching recommendations, and performance tracking. Our services include:",
    items: [
      "Call transcription and analysis",
      "AI-generated scoring and feedback",
      "Performance dashboards and analytics",
      "Team management tools",
      "Custom scorecard creation",
    ],
  },
  {
    icon: UserX,
    title: "3. User Accounts",
    content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:",
    items: [
      "Provide accurate and complete registration information",
      "Keep your password secure and confidential",
      "Notify us immediately of any unauthorized access",
      "Accept responsibility for all account activities",
    ],
  },
  {
    icon: AlertTriangle,
    title: "4. Acceptable Use",
    content: "You agree not to:",
    items: [
      "Upload content that violates any laws or regulations",
      "Use the service to harass, abuse, or harm others",
      "Attempt to gain unauthorized access to our systems",
      "Interfere with the proper functioning of the service",
      "Reverse engineer or attempt to extract source code",
      "Resell or redistribute the service without authorization",
    ],
  },
  {
    icon: FileText,
    title: "5. Content Ownership",
    content: `You retain ownership of all content you upload to Kalyxi, including call recordings and transcriptions. By using our service, you grant us a limited license to process this content for the purpose of providing our services.`,
  },
  {
    icon: Scale,
    title: "6. AI Analysis Disclaimer",
    content: `Our AI-powered analysis is provided for informational purposes and to assist with sales coaching. AI-generated insights and scores should be used as guidance and not as the sole basis for employment or performance decisions.`,
  },
  {
    icon: AlertTriangle,
    title: "7. Limitation of Liability",
    content: `To the maximum extent permitted by law, Kalyxi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.`,
  },
  {
    icon: Clock,
    title: "8. Termination",
    content: `We reserve the right to suspend or terminate your access to the service at any time for violation of these terms or for any other reason at our sole discretion.`,
  },
  {
    icon: RefreshCw,
    title: "9. Changes to Terms",
    content: `We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the modified terms.`,
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">Legal Agreement</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Terms of{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Service
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please read these terms carefully before using our platform.
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
                    <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                        {section.title}
                      </h2>
                      {section.content && (
                        <p className="text-gray-600 leading-relaxed mb-4">{section.content}</p>
                      )}
                      {section.items && (
                        <ul className="space-y-2">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-3 text-gray-600">
                              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0" />
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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/25 p-6 sm:p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2">10. Contact</h2>
                  <p className="text-indigo-100">
                    For questions about these Terms of Service, contact us at{" "}
                    <a
                      href="mailto:legal@kalyxi.ai"
                      className="text-white font-semibold underline underline-offset-2 hover:no-underline"
                    >
                      legal@kalyxi.ai
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
