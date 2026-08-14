import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Shirt, ArrowRight } from 'lucide-react';

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-[#1677FF] text-white relative z-50">
      <div className="max-w-7xl mx-auto px-10 py-2.5 flex items-center justify-center gap-2 sm:gap-3">
        <Shirt className="h-4 w-4 flex-shrink-0 opacity-90" />

        {/* Mobile copy */}
        <p className="text-sm font-semibold sm:hidden">
          Custom Apparel is Here!
        </p>

        {/* Desktop copy */}
        <p className="hidden sm:block text-sm font-medium">
          <span className="font-bold">NEW:</span> Custom-printed shirts, hoodies &amp; more — get your design on quality apparel
        </p>

        <Link
          to="/products?category=apparel"
          className="inline-flex items-center gap-1 bg-white text-[#1677FF] hover:bg-white/90 px-3 py-1 rounded-full text-xs font-bold transition-colors flex-shrink-0 shadow-sm"
        >
          Shop Apparel <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
