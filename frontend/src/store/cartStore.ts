/**
 * Cart Store (Zustand)
 * Manages cart state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/api';
import { apiService } from '../services/api';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;

  // Computed (getters)
  getItemCount: () => number;
  getTotalAmount: () => number;

  // Actions
  fetchCart: (signal?: AbortSignal) => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalAmount: () => {
        return get().items.reduce(
          (sum, item) => {
            const buyerPrice = item.products.buyer_price || item.products.price_buyer || 0;
            return sum + item.quantity * buyerPrice;
          },
          0
        );
      },

      fetchCart: async (signal?: AbortSignal) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.getCart({ signal });
          if (response.success) {
            set({ items: response.data || [], isLoading: false });
          }
        } catch (error: any) {
          if (error?.code === 'ABORTED') return;
          set({
            error: error.message || 'Failed to fetch cart',
            isLoading: false,
          });
        }
      },

      addItem: async (productId: string, quantity: number = 1) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.addToCart(productId, quantity);
          await get().fetchCart(); // Refresh cart
        } catch (error: any) {
          set({
            error: error.message || 'Failed to add item to cart',
            isLoading: false,
          });
          throw error;
        }
      },

      updateQuantity: async (cartItemId: string, quantity: number) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.updateCartItem(cartItemId, quantity);
          await get().fetchCart(); // Refresh cart
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update cart',
            isLoading: false,
          });
          throw error;
        }
      },

      removeItem: async (cartItemId: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.removeCartItem(cartItemId);
          await get().fetchCart(); // Refresh cart
        } catch (error: any) {
          set({
            error: error.message || 'Failed to remove item',
            isLoading: false,
          });
          throw error;
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          await apiService.clearCart();
          set({ items: [], isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to clear cart',
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
