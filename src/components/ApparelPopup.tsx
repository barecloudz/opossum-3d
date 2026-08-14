import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, Shirt } from 'lucide-react';

const SESSION_KEY = 'apparel_popup_seen';

export default function ApparelPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto relative w-full max-w-sm bg-[#0D1B2A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#1677FF]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="relative px-7 pt-8 pb-7 text-center">
            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1677FF]/15 border border-[#1677FF]/30 mb-5">
              <Shirt className="h-7 w-7 text-[#1677FF]" />
            </div>

            {/* Tag */}
            <div className="inline-flex items-center gap-1.5 bg-[#1677FF]/15 border border-[#1677FF]/30 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 bg-[#1677FF] rounded-full animate-pulse" />
              <span className="text-[#1677FF] text-xs font-semibold uppercase tracking-wide">New Arrival</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white leading-tight mb-2">
              Check Out Our<br />
              <span className="text-[#1677FF]">Custom Apparel!</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              We now offer custom-printed clothing — shirts, hoodies, and more. Get your design on quality apparel.
            </p>

            <Link
              to="/products?category=apparel"
              onClick={dismiss}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-2xl transition-colors btn-press text-sm shadow-lg shadow-[#1677FF]/30"
            >
              Shop Apparel <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={dismiss}
              className="mt-3 text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              No thanks, keep browsing
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
