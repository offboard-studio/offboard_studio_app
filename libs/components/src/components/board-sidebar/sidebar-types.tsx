/* eslint-disable @typescript-eslint/no-explicit-any */
// Sidebar Types and Interfaces

export interface SidebarLayer {
  id: string;
  title: string;
  content: React.ReactNode;
  width: string;
  closable?: boolean;
  persistent?: boolean;
}

export interface SidebarCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
  items: string[] | SidebarSubItem[];
  description?: string;
  disabled?: boolean;
}

export interface SidebarSubItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type?: 'block' | 'collection' | 'custom';
  blockType?: string;
  children?: SidebarSubItem[];
  action?: () => void;
  disabled?: boolean;
}

export interface SidebarItemProps {
  item?: {
    path: string;
    label: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
  label?: string;
  path?: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  depth?: number;
}

export interface SidebarItemCollapseProps {
  blocks: CollectionBlockType;
  keyPrefix?: string;
  blocks_label?: string;
  setBlock: (type: string) => void;
  depth?: number;
}

export interface BoardSideBarProps {
  editor: Editor;
  categories?: SidebarCategory[];
  defaultCollapsed?: boolean;
  theme?: 'dark' | 'light';
  onLayerChange?: (layers: SidebarLayer[]) => void;
  maxLayers?: number;
}

// Collection Block Types (assuming these exist in your codebase)
export interface CollectionBlock {
  label: string;
  type?: string;
  children?: CollectionBlockType;
  icon?: React.ReactNode;
  description?: string;
  deprecated?: boolean;
}

export interface CollectionBlockType {
  [key: string]: CollectionBlock;
}

// Editor interface (mock - adjust to match your actual Editor)
export interface Editor {
  addBlock: (type: string) => void;
  removeBlock?: (id: string) => void;
  updateBlock?: (id: string, data: any) => void;
  getBlocks?: () => any[];
  // Add other editor methods as needed
}

// Sidebar Configuration
export interface SidebarConfig {
  categories: SidebarCategory[];
  theme: 'dark' | 'light';
  animations: boolean;
  autoCollapse: boolean;
  collapseBreakpoint: number;
  maxLayers: number;
  layerTimeout: number;
  showTooltips: boolean;
}

// Default configuration
export const defaultSidebarConfig: SidebarConfig = {
  categories: [],
  theme: 'dark',
  animations: true,
  autoCollapse: true,
  collapseBreakpoint: 768,
  maxLayers: 3,
  layerTimeout: 2000,
  showTooltips: true,
};

// Sidebar State Management
export interface SidebarState {
  isCollapsed: boolean;
  activeLayers: SidebarLayer[];
  selectedCategory: string | null;
  selectedSubItem: string | null;
  hoveredItem: string | null;
}

export interface SidebarAction {
  type:
    | 'TOGGLE_COLLAPSE'
    | 'SET_LAYERS'
    | 'ADD_LAYER'
    | 'REMOVE_LAYER'
    | 'SELECT_CATEGORY'
    | 'SELECT_SUB_ITEM'
    | 'SET_HOVER';
  payload?: any;
}

// Sidebar Context
export interface SidebarContextType {
  state: SidebarState;
  dispatch: React.Dispatch<SidebarAction>;
  config: SidebarConfig;
  updateConfig: (config: Partial<SidebarConfig>) => void;
}

// Animation Types
export type AnimationType = 'slide' | 'fade' | 'scale' | 'none';

export interface LayerTransition {
  type: AnimationType;
  duration: number;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

// Theme Configuration
export interface SidebarTheme {
  primary: string;
  secondary: string;
  accent: string;
  hover: string;
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
  gradient?: string;
}

export const darkTheme: SidebarTheme = {
  primary: '#2c3e50',
  secondary: '#34495e',
  accent: '#3498db',
  hover: '#4a5568',
  text: '#ffffff',
  textMuted: '#bbb',
  border: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gradient: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
};

export const lightTheme: SidebarTheme = {
  primary: '#f8f9fa',
  secondary: '#e9ecef',
  accent: '#007bff',
  hover: '#dee2e6',
  text: '#333333',
  textMuted: '#666',
  border: 'rgba(0, 0, 0, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.15)',
  gradient: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
};

// Utility Types
export type SidebarEventHandler = (
  event: React.MouseEvent | React.KeyboardEvent
) => void;
export type LayerRenderer = (
  layer: SidebarLayer,
  index: number
) => React.ReactNode;
export type CategoryRenderer = (
  category: SidebarCategory,
  isSelected: boolean
) => React.ReactNode;

// Hook Types
export interface UseSidebarReturn {
  state: SidebarState;
  actions: {
    [x: string]: any;
    toggleCollapse: () => void;
    openCategory: (categoryId: string) => void;
    closeCategory: () => void;
    addLayer: (layer: SidebarLayer) => void;
    removeLayer: (layerId: string) => void;
    closeAllLayers: () => void;
  };
}

// Performance Types
export interface SidebarMetrics {
  renderTime: number;
  layerCount: number;
  animationFrames: number;
  memoryUsage?: number;
}

export interface SidebarPerformanceConfig {
  enableMetrics: boolean;
  debounceDelay: number;
  throttleLimit: number;
  virtualizeThreshold: number;
}

// Accessibility Types
export interface SidebarA11yConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  focusTrapEnabled: boolean;
  announceLayerChanges: boolean;
}

// Error Types
export class SidebarError extends Error {
  constructor(message: string, public code: string, public context?: any) {
    super(message);
    this.name = 'SidebarError';
  }
}

export interface SidebarErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
