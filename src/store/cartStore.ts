import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant, CartItem } from '../types';

// Maximum quantity per item to prevent abuse
const MAX_QUANTITY_PER_ITEM = 99;

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Product, variant?: ProductVariant, quantity?: number, customizationImageUrl?: string, selectedColors?: string[], productDescription?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, variant, quantity = 1, customizationImageUrl?: string, selectedColors?: string[], productDescription?: string) => {
        // Validate quantity - must be positive integer, max 99
        const validQuantity = Math.min(
          MAX_QUANTITY_PER_ITEM,
          Math.max(1, Math.floor(quantity))
        );

        const hasCustomization = !!customizationImageUrl || (selectedColors && selectedColors.length > 0) || !!productDescription;

        set((state) => {
          // Customized items (artwork, colors, description) are always unique line items
          if (hasCustomization) {
            return {
              items: [...state.items, {
                product,
                variant,
                quantity: validQuantity,
                customization_image_url: customizationImageUrl,
                selected_colors: selectedColors?.length ? selectedColors : undefined,
                product_description: productDescription || undefined,
              }],
            };
          }

          const existingIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              item.variant?.id === variant?.id &&
              !item.customization_image_url &&
              !item.selected_colors?.length &&
              !item.product_description
          );

          if (existingIndex > -1) {
            const newItems = [...state.items];
            // Cap total quantity at max
            newItems[existingIndex].quantity = Math.min(
              MAX_QUANTITY_PER_ITEM,
              newItems[existingIndex].quantity + validQuantity
            );
            return { items: newItems };
          }

          return {
            items: [...state.items, { product, variant, quantity: validQuantity }],
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(item.product.id === productId && item.variant?.id === variantId)
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        // Validate quantity - must be positive integer
        const validQuantity = Math.floor(quantity);

        if (validQuantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        // Cap at max quantity
        const cappedQuantity = Math.min(MAX_QUANTITY_PER_ITEM, validQuantity);

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId && item.variant?.id === variantId
              ? { ...item, quantity: cappedQuantity }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const basePrice = item.product.price + (item.variant?.price_adjustment || 0);
          const tiers = (item.product.price_tiers || []).sort((a: any, b: any) => a.min_qty - b.min_qty);
          let tierPrice = basePrice;
          for (const tier of tiers) {
            if (item.quantity >= tier.min_qty) tierPrice = tier.price_per_unit;
          }
          return total + tierPrice * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'nexalon-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
