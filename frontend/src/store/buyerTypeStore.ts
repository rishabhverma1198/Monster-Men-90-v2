/**
 * Buyer Type Store
 * Manages Individual vs Wholesale buyer selection
 * Persists to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type BuyerType = 'single' | 'wholeseller';

interface BuyerTypeState {
  buyerType: BuyerType | null;
  setBuyerType: (type: BuyerType) => void;
  hasSelectedBuyerType: () => boolean;
  clearBuyerType: () => void;
}

export const useBuyerTypeStore = create<BuyerTypeState>()(
  persist(
    (set, get) => ({
      buyerType: (localStorage.getItem('buyer_type') as BuyerType) || null,
      setBuyerType: (type: BuyerType) => {
        set({ buyerType: type });
        localStorage.setItem('buyer_type', type);
        localStorage.setItem('has_visited', 'true');
      },
      hasSelectedBuyerType: () => {
        const type = get().buyerType;
        return type !== null && (type === 'single' || type === 'wholeseller');
      },
      clearBuyerType: () => {
        set({ buyerType: null });
        localStorage.removeItem('buyer_type');
        localStorage.removeItem('has_visited');
      },
    }),
    {
      name: 'buyer-type-storage',
    }
  )
);
