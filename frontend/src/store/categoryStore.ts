/**
 * Category Store (Zustand)
 * Manages selected category (MEN/WOMEN)
 * Persists selection to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Category = 'men' | 'women' | 'all';

interface CategoryState {
  selectedCategory: Category;
  setCategory: (category: Category) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => {
      // Check if user selected category on first visit
      const userCategory = localStorage.getItem('user_category') as Category | null;
      const initialCategory = userCategory && (userCategory === 'men' || userCategory === 'women') 
        ? userCategory 
        : 'all';

      return {
        selectedCategory: initialCategory,
        
        setCategory: (category: Category) => {
          set({ selectedCategory: category });
          // Also update user_category for consistency
          if (category === 'men' || category === 'women') {
            localStorage.setItem('user_category', category);
          }
        },
      };
    },
    {
      name: 'category-storage',
    }
  )
);
