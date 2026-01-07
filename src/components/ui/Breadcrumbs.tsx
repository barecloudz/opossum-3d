import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6 overflow-x-auto">
      <Link
        to="/"
        className="text-theme opacity-60 hover:text-[var(--color-primary)] hover:opacity-100 transition-colors flex-shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 flex-shrink-0">
          <ChevronRight className="h-4 w-4 text-theme opacity-40" />
          {item.href ? (
            <Link
              to={item.href}
              className="text-theme opacity-60 hover:text-[var(--color-primary)] hover:opacity-100 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-theme opacity-80 truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
