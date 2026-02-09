"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies</h2>
            <p className="text-gray-600 mb-4">
              Cookies are small text files that are stored on your device when you visit a website.
              They help websites remember your preferences and improve your browsing experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Cookies</h2>
            <p className="text-gray-600 mb-4">Kalyxi uses cookies for the following purposes:</p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Essential Cookies</h3>
            <p className="text-gray-600 mb-4">
              These cookies are necessary for the website to function properly. They enable core
              functionality such as authentication, security, and session management.
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Authentication tokens</li>
              <li>Session identifiers</li>
              <li>Security cookies</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Functional Cookies</h3>
            <p className="text-gray-600 mb-4">
              These cookies remember your preferences and settings to provide a more personalized experience.
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Language preferences</li>
              <li>Theme settings (dark/light mode)</li>
              <li>Dashboard layout preferences</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Analytics Cookies</h3>
            <p className="text-gray-600 mb-4">
              These cookies help us understand how visitors interact with our website so we can improve it.
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Page views and navigation patterns</li>
              <li>Feature usage statistics</li>
              <li>Error tracking</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Third-Party Cookies</h2>
            <p className="text-gray-600 mb-4">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Supabase</strong> - Authentication and database services</li>
              <li><strong>Vercel</strong> - Hosting and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Managing Cookies</h2>
            <p className="text-gray-600 mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>
                <strong>Browser settings:</strong> Most browsers allow you to refuse or delete cookies
                through their settings menu.
              </li>
              <li>
                <strong>Opt-out tools:</strong> Some third-party services provide their own opt-out mechanisms.
              </li>
            </ul>
            <p className="text-gray-600 mb-4">
              Please note that disabling essential cookies may affect the functionality of our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Cookie Retention</h2>
            <p className="text-gray-600 mb-4">
              Different cookies are retained for different periods:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Remain until their expiration date or until you delete them</li>
              <li><strong>Authentication cookies:</strong> Typically expire after 7-30 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Updates to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Cookie Policy from time to time. We will notify you of any significant
              changes by posting the new policy on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about our use of cookies, please contact us at{" "}
              <a href="mailto:privacy@kalyxi.ai" className="text-purple-600 hover:text-purple-700">
                privacy@kalyxi.ai
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
