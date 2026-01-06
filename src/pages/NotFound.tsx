import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-neon mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved
          or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button as={Link} to="/">
            <Home className="h-5 w-5 mr-2" />
            Back to Home
          </Button>
          <Button as={Link} to="/products" variant="outline">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Browse Products
          </Button>
        </div>
      </div>
    </div>
  );
}
