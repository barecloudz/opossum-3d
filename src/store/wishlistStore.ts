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

        // If user is logged in, also save to database (upsert to handle race conditions)
        if (userId) {
          try {
            await supabase.from('wishlists').upsert(
              { user_id: userId, product_id: productId },
              { onConflict: 'user_id,product_id', ignoreDuplicates: true }
            );
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
          // Get local items first to avoid race condition
          const localItems = [...get().items];

          const { data, error } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', userId);

          if (error) throw error;

          const dbItems = data?.map(w => w.product_id) || [];

          // Merge local items with database items (deduplicated)
          const mergedItems = [...new Set([...localItems, ...dbItems])];
          set({ items: mergedItems });

          // Save any local-only items to database using upsert to handle duplicates
          const itemsToAdd = localItems.filter(id => !dbItems.includes(id));
          if (itemsToAdd.length > 0) {
            await supabase.from('wishlists').upsert(
              itemsToAdd.map(product_id => ({ user_id: userId, product_id })),
              { onConflict: 'user_id,product_id', ignoreDuplicates: true }
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
      name: 'nexalon-wishlist',
    }
  )
);
