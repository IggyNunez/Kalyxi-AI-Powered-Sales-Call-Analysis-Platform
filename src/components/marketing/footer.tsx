"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Mail } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { name: "Features", href: "/#features" },
      { name: "How It Works", href: "/#how-it-works" },
      { name: "AI Insights", href: "/#insights" },
      { name: "Security", href: "/#security" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "/#who-we-help" },
      { name: "Contact", href: "mailto:hello@kalyxi.ai" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Get Started", href: "/register" },
      { name: "Sign In", href: "/login" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
    ],
  },
};

const socialLinks = [
  { name: "Twitter", icon: Twitter, href: "https://twitter.com/kalyxi_ai" },
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/kalyxi" },
  { name: "Email", icon: Mail, href: "mailto:hello@kalyxi.ai" },
];

export function Footer() {
  return (
    <footer className="relative bg-gray-900">
      {/* Gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Link href="/" className="inline-block mb-6">
                <Image
                  src="/logo-white.png"
                  alt="Kalyxi"
                  width={140}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <p className="text-gray-400 mb-6 max-w-sm">
                Transform your sales calls into actionable insights with AI-powered analysis,
                coaching, and performance tracking.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300"
                      aria-label={social.name}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Link columns */}
            {Object.values(footerLinks).map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors duration-300"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Kalyxi. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
