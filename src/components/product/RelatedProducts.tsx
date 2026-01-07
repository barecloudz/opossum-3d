import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ProductCard from './ProductCard';
import Spinner from '../ui/Spinner';
import type { Product } from '../../types';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId: string | null;
}

export default function RelatedProducts({ currentProductId, categoryId }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            category:categories(*)
          `)
          .eq('is_active', true)
          .neq('id', currentProductId)
          .limit(4);

        // If product has a category, prioritize products from the same category
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // If not enough products from same category, fetch more
        if (data && data.length < 4 && categoryId) {
          const existingIds = data.map(p => p.id);
          const { data: moreProducts } = await supabase
            .from('products')
            .select(`
              *,
              images:product_images(*),
              category:categories(*)
            `)
            .eq('is_active', true)
            .neq('id', currentProductId)
            .not('id', 'in', `(${existingIds.join(',')})`)
            .limit(4 - data.length)
            .order('created_at', { ascending: false });

          if (moreProducts) {
            setProducts([...data, ...moreProducts]);
          } else {
            setProducts(data);
          }
        } else {
          setProducts(data || []);
        }
      } catch (err) {
        console.error('Error fetching related products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [currentProductId, categoryId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-8 border-t border-[var(--color-border)]">
      <h2 className="text-2xl font-bold text-theme mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
