import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface WishlistState {
  items: string[]; // Product IDs
  isLoading: boolean;

  // Actions
  addItem: (productId: string, userId?: string) => Promise<void>;
  removeItem: (productId: string, userId?: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  syncWithUser: (userId: string) => Promise<void>;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (productId, userId) => {
        const { items } = get();
        if (items.includes(productId)) return;

        set({ items: [...items, productId] });

        // If user is logged in, also save to database
        if (userId) {
          try {
            await supabase.from('wishlists').insert({
              user_id: userId,
              product_id: productId,
            });
          } catch (err) {
            console.error('Error saving wishlist to database:', err);
          }
        }
      },

      removeItem: async (productId, userId) => {
        const { items } = get();
        set({ items: items.filter(id => id !== productId) });

        // If user is logged in, also remove from database
        if (userId) {
          try {
            await supabase
              .from('wishlists')
              .delete()
              .eq('user_id', userId)
              .eq('product_id', productId);
          } catch (err) {
            console.error('Error removing from wishlist in database:', err);
          }
        }
      },

      isInWishlist: (productId) => {
        return get().items.includes(productId);
      },

      syncWithUser: async (userId) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', userId);

          if (error) throw error;

          const dbItems = data?.map(w => w.product_id) || [];
          const localItems = get().items;

          // Merge local items with database items
          const mergedItems = [...new Set([...localItems, ...dbItems])];
          set({ items: mergedItems });

          // Save any local-only items to database
          const itemsToAdd = localItems.filter(id => !dbItems.includes(id));
          if (itemsToAdd.length > 0) {
            await supabase.from('wishlists').insert(
              itemsToAdd.map(product_id => ({ user_id: userId, product_id }))
            );
          }
        } catch (err) {
          console.error('Error syncing wishlist:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'opossum-wishlist',
    }
  )
);
