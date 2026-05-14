import { ArrowLeft, Package, AlertCircle, Truck, RefreshCw, Camera, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReturnPolicy() {
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
          <h1 className="text-3xl font-bold text-theme mb-4">Return Policy</h1>
          <p className="text-theme opacity-70">
            At Nexalon Creations, we take pride in the quality of our 3D printed and laser-engraved products.
            Please review our return policy carefully before completing your purchase.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8">
          {/* Return Eligibility */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Package className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Return Eligibility</h2>
                <ul className="space-y-2 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Returns are accepted within <strong className="text-theme">14 days</strong> from the date you receive your item.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Items must be returned in unused, undamaged condition, and in their original packaging when possible.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Non-Returnable Items */}
          <section className="bg-[var(--color-surface)] border border-red-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Non-Returnable Items</h2>
                <ul className="space-y-2 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <strong className="text-theme">Custom printed or custom engraved items are final sale</strong> and are not eligible for return or refund.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    This includes any product made to order, personalized, modified, or produced to customer-provided specifications.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Return Shipping */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Truck className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Return Shipping</h2>
                <ul className="space-y-2 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Buyers are responsible for all return shipping costs.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Original shipping charges are non-refundable.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    We recommend using a trackable shipping service, as Nexalon Creations is not responsible for items lost or damaged during return transit.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Refunds */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <RefreshCw className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Refunds</h2>
                <ul className="space-y-2 text-theme opacity-70">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Once the returned item is received and inspected, approved refunds will be issued to the original payment method.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    Refunds will cover the purchase price of the item only, excluding shipping fees.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Damaged or Incorrect Items */}
          <section className="bg-[var(--color-surface)] border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Camera className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Damaged or Incorrect Items</h2>
                <p className="text-theme opacity-70">
                  If your item arrives damaged or you receive the wrong item, please contact us within{' '}
                  <strong className="text-theme">48 hours</strong> of delivery with photos and order details
                  so we can resolve the issue promptly.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Mail className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-theme mb-3">Contact</h2>
                <p className="text-theme opacity-70">
                  For return authorization or questions regarding this policy, please contact Nexalon Creations
                  prior to sending any items back.
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
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
