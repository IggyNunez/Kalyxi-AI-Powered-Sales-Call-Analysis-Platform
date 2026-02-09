"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using Kalyxi&apos;s AI-powered sales call analysis platform, you agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Kalyxi provides an AI-powered platform for analyzing sales calls, generating insights,
              coaching recommendations, and performance tracking. Our services include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Call transcription and analysis</li>
              <li>AI-generated scoring and feedback</li>
              <li>Performance dashboards and analytics</li>
              <li>Team management tools</li>
              <li>Custom scorecard creation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activities that occur under your account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all account activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Upload content that violates any laws or regulations</li>
              <li>Use the service to harass, abuse, or harm others</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the service</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Resell or redistribute the service without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Content Ownership</h2>
            <p className="text-gray-600 mb-4">
              You retain ownership of all content you upload to Kalyxi, including call recordings
              and transcriptions. By using our service, you grant us a limited license to process
              this content for the purpose of providing our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI Analysis Disclaimer</h2>
            <p className="text-gray-600 mb-4">
              Our AI-powered analysis is provided for informational purposes and to assist with
              sales coaching. AI-generated insights and scores should be used as guidance and not
              as the sole basis for employment or performance decisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, Kalyxi shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of
              or inability to use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Termination</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to suspend or terminate your access to the service at any time
              for violation of these terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We may modify these terms at any time. Continued use of the service after changes
              constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, contact us at{" "}
              <a href="mailto:legal@kalyxi.ai" className="text-purple-600 hover:text-purple-700">
                legal@kalyxi.ai
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
