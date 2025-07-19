// useSidebar Custom Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SidebarState,
  SidebarLayer,
  SidebarConfig,
  defaultSidebarConfig,
  UseSidebarReturn,
} from './sidebar-types';

interface UseSidebarOptions {
  config?: Partial<SidebarConfig>;
  onLayerChange?: (layers: SidebarLayer[]) => void;
  onCategoryChange?: (categoryId: string | null) => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const useSidebar = (
  options: UseSidebarOptions = {}
): UseSidebarReturn => {
  const {
    config = {},
    onLayerChange,
    onCategoryChange,
    autoClose = false,
    autoCloseDelay = 2000,
  } = options;

  const mergedConfig = { ...defaultSidebarConfig, ...config };
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Main sidebar state
  const [state, setState] = useState<SidebarState>({
    isCollapsed: false,
    activeLayers: [],
    selectedCategory: null,
    selectedSubItem: null,
    hoveredItem: null,
  });

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (
        mergedConfig.autoCollapse &&
        window.innerWidth <= mergedConfig.collapseBreakpoint
      ) {
        setState((prev) => ({ ...prev, isCollapsed: true }));
      } else {
        setState((prev) => ({ ...prev, isCollapsed: false }));
      }
    };

    if (mergedConfig.autoCollapse) {
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial check
    }

    return () => {
      if (mergedConfig.autoCollapse) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [mergedConfig.autoCollapse, mergedConfig.collapseBreakpoint]);

  // Auto-close functionality
  useEffect(() => {
    if (autoClose && state.activeLayers.length > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          activeLayers: [],
          selectedCategory: null,
          selectedSubItem: null,
        }));
      }, autoCloseDelay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoClose, autoCloseDelay, state.activeLayers.length]);

  // Notify parent components of layer changes
  useEffect(() => {
    if (onLayerChange) {
      onLayerChange(state.activeLayers);
    }
  }, [state.activeLayers, onLayerChange]);

  // Notify parent components of category changes
  useEffect(() => {
    if (onCategoryChange) {
      onCategoryChange(state.selectedCategory);
    }
  }, [state.selectedCategory, onCategoryChange]);

  // Clear auto-close timeout when user interacts
  const clearAutoCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Toggle sidebar collapse state
  const toggleCollapse = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
    }));
  }, []);

  // Open a category and create its layer
  const openCategory = useCallback(
    (categoryId: string) => {
      clearAutoCloseTimeout();

      setState((prev) => ({
        ...prev,
        selectedCategory: categoryId,
        selectedSubItem: null,
      }));
    },
    [clearAutoCloseTimeout]
  );

  // Close category and remove its layers
  const closeCategory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedCategory: null,
      selectedSubItem: null,
      activeLayers: [],
    }));
  }, []);

  // Add a new layer to the sidebar
  const addLayer = useCallback(
    (layer: SidebarLayer) => {
      clearAutoCloseTimeout();

      setState((prev) => {
        const existingLayerIndex = prev.activeLayers.findIndex(
          (l) => l.id === layer.id
        );

        if (existingLayerIndex !== -1) {
          // Replace existing layer
          const newLayers = [...prev.activeLayers];
          newLayers[existingLayerIndex] = layer;
          return {
            ...prev,
            activeLayers: newLayers,
          };
        } else {
          // Add new layer (respect max layers limit)
          const newLayers = [...prev.activeLayers, layer];
          if (newLayers.length > mergedConfig.maxLayers) {
            newLayers.shift(); // Remove first layer if exceeding limit
          }
          return {
            ...prev,
            activeLayers: newLayers,
          };
        }
      });
    },
    [clearAutoCloseTimeout, mergedConfig.maxLayers]
  );

  // Remove a specific layer and all layers after it
  const removeLayer = useCallback((layerId: string) => {
    setState((prev) => {
      const layerIndex = prev.activeLayers.findIndex(
        (layer) => layer.id === layerId
      );

      if (layerIndex !== -1) {
        const newLayers = prev.activeLayers.slice(0, layerIndex);
        return {
          ...prev,
          activeLayers: newLayers,
          selectedSubItem: layerIndex === 0 ? null : prev.selectedSubItem,
        };
      }

      return prev;
    });
  }, []);

  // Close all layers
  const closeAllLayers = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeLayers: [],
      selectedCategory: null,
      selectedSubItem: null,
    }));
  }, []);

  // Set hovered item (for potential future features)
  const setHoveredItem = useCallback((itemId: string | null) => {
    setState((prev) => ({
      ...prev,
      hoveredItem: itemId,
    }));
  }, []);

  // Select sub-item
  const selectSubItem = useCallback(
    (subItemId: string) => {
      clearAutoCloseTimeout();

      setState((prev) => ({
        ...prev,
        selectedSubItem: subItemId,
      }));
    },
    [clearAutoCloseTimeout]
  );

  // Get layer position calculation
  const getLayerPosition = useCallback(
    (index: number) => {
      const baseWidth = state.isCollapsed ? 60 : 80;
      let left = baseWidth;

      for (let i = 0; i < index; i++) {
        const layerWidth = parseInt(state.activeLayers[i]?.width || '200px');
        left += layerWidth;
      }

      return `${left}px`;
    },
    [state.isCollapsed, state.activeLayers]
  );

  // Check if sidebar should show overlay (mobile)
  const shouldShowOverlay = useCallback(() => {
    return state.isCollapsed && state.activeLayers.length > 0;
  }, [state.isCollapsed, state.activeLayers.length]);

  // Performance optimization: memoized actions object
  const actions = useCallback(
    () => ({
      toggleCollapse,
      openCategory,
      closeCategory,
      addLayer,
      removeLayer,
      closeAllLayers,
      setHoveredItem,
      selectSubItem,
      getLayerPosition,
      shouldShowOverlay,
      clearAutoCloseTimeout,
    }),
    [
      toggleCollapse,
      openCategory,
      closeCategory,
      addLayer,
      removeLayer,
      closeAllLayers,
      setHoveredItem,
      selectSubItem,
      getLayerPosition,
      shouldShowOverlay,
      clearAutoCloseTimeout,
    ]
  );

  return {
    state,
    actions: actions(),
  };
};

// Additional utility hooks

// Hook for managing sidebar keyboard navigation
export const useSidebarKeyboard = (
  isActive: boolean,
  onEscape?: () => void,
  onEnter?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowKeys?.('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowKeys?.('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowKeys?.('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowKeys?.('right');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape, onEnter, onArrowKeys]);
};

// Hook for managing sidebar animations
export const useSidebarAnimations = (enabled: boolean = true) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = useCallback(() => {
    if (!enabled) return;
    setIsAnimating(true);
  }, [enabled]);

  const endAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return {
    isAnimating,
    startAnimation,
    endAnimation,
  };
};

// Hook for sidebar performance monitoring
export const useSidebarPerformance = (enableMetrics: boolean = false) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    layerCount: 0,
    lastUpdate: Date.now(),
  });

  const updateMetrics = useCallback(
    (layerCount: number) => {
      if (!enableMetrics) return;

      const now = Date.now();
      setMetrics((prev) => ({
        renderTime: now - prev.lastUpdate,
        layerCount,
        lastUpdate: now,
      }));
    },
    [enableMetrics]
  );

  return {
    metrics,
    updateMetrics,
  };
};
