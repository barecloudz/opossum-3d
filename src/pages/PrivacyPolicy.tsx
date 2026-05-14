import { ArrowLeft, User, Database, Share2, FileText, Shield, Cookie, UserCheck, Baby, RefreshCw, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const effectiveDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-theme opacity-60 hover:text-[var(--color-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-theme mb-4">Privacy Policy</h1>
          <p className="text-theme opacity-50 text-sm mb-4">Effective Date: {effectiveDate}</p>
          <p className="text-theme opacity-70">
            Nexalon Creations values your privacy and is committed to protecting your personal information.
            This Privacy Policy explains how we collect, use, and safeguard your information when you
            interact with our business, website, or services.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8">
          {/* Information We Collect */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <User className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Information We Collect</h2>
                <p className="text-theme opacity-70 mb-3">
                  We may collect the following types of information when you place an order, contact us, or use our services:
                </p>
                <ul className="space-y-1 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Name
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Email address
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Shipping and billing address
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Phone number
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Payment information (processed securely through third-party payment providers)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Order details and custom design information you provide
                  </li>
                </ul>
                <p className="text-theme opacity-70 mt-3 text-sm">
                  <strong className="text-theme">We do not store full payment card numbers or sensitive financial data.</strong>
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Database className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">How We Use Your Information</h2>
                <p className="text-theme opacity-70 mb-3">Your information is used solely to:</p>
                <ul className="space-y-1 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Process and fulfill orders
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Communicate about your order, including confirmations and updates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Provide customer support
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Improve our products and services
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Comply with legal or tax obligations
                  </li>
                </ul>
                <p className="text-theme opacity-70 mt-3 font-medium">
                  We do not sell, rent, or trade your personal information to third parties.
                </p>
              </div>
            </div>
          </section>

          {/* Sharing of Information */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Share2 className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Sharing of Information</h2>
                <p className="text-theme opacity-70 mb-3">We may share limited information only when necessary with:</p>
                <ul className="space-y-1 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Shipping carriers to deliver your order
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Payment processors to complete transactions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Legal authorities if required by law
                  </li>
                </ul>
                <p className="text-theme opacity-70 mt-3 text-sm">
                  All third parties are expected to protect your information and use it only for the intended purpose.
                </p>
              </div>
            </div>
          </section>

          {/* Custom Designs and Files */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <FileText className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Custom Designs and Files</h2>
                <p className="text-theme opacity-70">
                  Any custom files, designs, or specifications you provide are used exclusively to fulfill your order.
                  Nexalon Creations does not claim ownership of your custom designs and will not share them without your
                  permission, except as required to complete production.
                </p>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Shield className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Data Security</h2>
                <p className="text-theme opacity-70">
                  We implement reasonable administrative and technical measures to protect your personal information.
                  While no system is completely secure, we take appropriate steps to safeguard your data from
                  unauthorized access or disclosure.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies and Website Data */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Cookie className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Cookies and Website Data</h2>
                <p className="text-theme opacity-70">
                  Our website may use basic cookies or analytics tools to improve user experience and understand
                  site usage. These tools do not collect personally identifiable information beyond standard usage data.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Your Rights</h2>
                <p className="text-theme opacity-70 mb-3">You may request to:</p>
                <ul className="space-y-1 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Review the personal information we have on file
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Correct inaccurate information
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Request deletion of your personal data, where legally permissible
                  </li>
                </ul>
                <p className="text-theme opacity-70 mt-3 text-sm">
                  Requests can be made by contacting Nexalon Creations directly.
                </p>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Baby className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Children's Privacy</h2>
                <p className="text-theme opacity-70">
                  Nexalon Creations does not knowingly collect personal information from individuals under the age of 13.
                </p>
              </div>
            </div>
          </section>

          {/* Policy Updates */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <RefreshCw className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Policy Updates</h2>
                <p className="text-theme opacity-70">
                  This Privacy Policy may be updated periodically. Any changes will be posted with a revised effective date.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Mail className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Contact Information</h2>
                <p className="text-theme opacity-70">
                  If you have questions or concerns regarding this Privacy Policy or how your information is handled,
                  please contact Nexalon Creations directly.
                </p>
                <Link
                  to="/custom-quote"
                  className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] hover:opacity-80 transition-opacity"
                >
                  Contact Us
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Last Updated */}
        <p className="text-center text-theme opacity-40 text-sm mt-10">
          Last updated: {effectiveDate}
        </p>
      </div>
    </div>
  );
}
