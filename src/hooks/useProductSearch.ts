import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMarket } from '@/contexts/MarketContext';

export interface ProductSearchResult {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  total_ingresos_mxn: number | null;
  categoria: string | null;
  commission: number | null;
  price: number | null;
  rank: number | null;
}

interface UseProductSearchReturn {
  results: ProductSearchResult[];
  popularProducts: ProductSearchResult[];
  isSearching: boolean;
  isLoadingPopular: boolean;
  search: (query: string) => void;
  searchQuery: string;
  clearSearch: () => void;
}

export const useProductSearch = (): UseProductSearchReturn => {
  const { market } = useMarket();
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Load popular products on mount
  useEffect(() => {
    const loadPopularProducts = async () => {
      setIsLoadingPopular(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, producto_nombre, imagen_url, total_ingresos_mxn, categoria, commission, price, rank')
          .eq('market', market)
          .not('total_ingresos_mxn', 'is', null)
          .order('total_ingresos_mxn', { ascending: false })
          .limit(30);

        if (error) throw error;
        setPopularProducts(data || []);
      } catch (error) {
        console.error('Error loading popular products:', error);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    loadPopularProducts();
  }, [market]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, producto_nombre, imagen_url, total_ingresos_mxn, categoria, commission, price, rank')
        .eq('market', market)
        .ilike('producto_nombre', `%${query}%`)
        .order('total_ingresos_mxn', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [market]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce search by 300ms
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    setDebounceTimer(timer);
  }, [performSearch, debounceTimer]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setResults([]);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  }, [debounceTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    results,
    popularProducts,
    isSearching,
    isLoadingPopular,
    search,
    searchQuery,
    clearSearch,
  };
};
