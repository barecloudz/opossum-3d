import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Store the current script src on first load
    const currentScript = document.querySelector('script[type="module"][src^="/assets/"]');
    const currentSrc = currentScript?.getAttribute('src') || '';

    // Check for updates every 30 seconds
    const checkForUpdates = async () => {
      try {
        // Fetch the latest index.html with cache busting
        const response = await fetch(`/?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const html = await response.text();

        // Extract the main script src from the fetched HTML
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        const latestSrc = match?.[1] || '';

        // If the script changed, show update banner
        if (currentSrc && latestSrc && currentSrc !== latestSrc) {
          setShowUpdate(true);
        }
      } catch (err) {
        // Silently fail - network issues shouldn't affect the app
      }
    };

    // Check immediately after 5 seconds, then every 30 seconds
    const initialTimeout = setTimeout(checkForUpdates, 5000);
    const interval = setInterval(checkForUpdates, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = async () => {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Force hard refresh
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-brand-charcoal border-t border-brand-neon/50 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-gray-300 text-sm">
          A new version is available!
        </p>
        <button
          onClick={handleUpdate}
          className="flex items-center gap-2 bg-brand-neon text-brand-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-emerald transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Update
        </button>
      </div>
    </div>
  );
}
