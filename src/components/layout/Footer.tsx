import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="hidden md:block bg-brand-charcoal border-t border-brand-gray mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-bold text-brand-neon">OPOSSUM</span>
              <span className="text-sm text-gray-400">3D</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Custom 3D printing and laser engraving. Bringing your ideas to life.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/products" className="text-gray-400 hover:text-brand-neon text-sm transition-colors">
                Products
              </Link>
              <Link to="/custom-quote" className="text-gray-400 hover:text-brand-neon text-sm transition-colors">
                Custom Orders
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <p className="text-gray-400 text-sm">
              Have questions? Request a custom quote and we'll get back to you!
            </p>
          </div>
        </div>

        <div className="border-t border-brand-gray mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Opossum 3D. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
