import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProductCard from '../components/product/ProductCard';
import Spinner from '../components/ui/Spinner';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export default function Wishlist() {
  const { items, clearWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (items.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            category:categories(*)
          `)
          .in('id', items)
          .eq('is_active', true);

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [items]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-theme mb-2">My Wishlist</h1>
          <p className="text-theme opacity-60">
            {items.length} {items.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" onClick={clearWishlist}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Wishlist Items */}
      {items.length === 0 ? (
        <Card className="text-center py-16">
          <Heart className="h-16 w-16 text-theme opacity-30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-theme mb-2">Your wishlist is empty</h2>
          <p className="text-theme opacity-60 mb-6">
            Save items you love by clicking the heart icon on products
          </p>
          <Button as={Link} to="/products">
            <ShoppingBag className="h-5 w-5 mr-2" />
            Browse Products
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Note about logged in users */}
      {!user && items.length > 0 && (
        <Card className="mt-8 text-center">
          <p className="text-theme opacity-60">
            <Link to="/login" className="text-[var(--color-primary)] hover:underline">
              Sign in
            </Link>{' '}
            to save your wishlist across devices
          </p>
        </Card>
      )}
    </div>
  );
}
