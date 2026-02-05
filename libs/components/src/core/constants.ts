// ============================================
// Application Constants
// ============================================

export const PROJECT_FILE_EXTENSION = '.vc3';
export const VERSION = '3.0';
export const PROJECT_BOARD_NAME = 'Python3-Noetic';

// ============================================
// Timing Constants (in milliseconds)
// ============================================

/** Throttle interval for collaboration sync operations */
export const COLLAB_SYNC_THROTTLE_MS = 1000;

/** Throttle interval for screenshot capture */
export const SCREENSHOT_THROTTLE_MS = 30000;

/** Default timeout for API requests */
export const API_TIMEOUT_MS = 30000;

/** Rate limit interval for deployment requests per host */
export const DEPLOYMENT_RATE_LIMIT_MS = 5000;

/** Stale time for React Query cache */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// UI Constants
// ============================================

/** Default editor zoom level */
export const DEFAULT_ZOOM = 100;

/** Default grid size for editor */
export const DEFAULT_GRID_SIZE = 20;

/** Maximum number of users to fetch at once */
export const MAX_USERS_FETCH_LIMIT = 50;

/** Firestore 'in' query limit */
export const FIRESTORE_IN_QUERY_LIMIT = 30;

// ============================================
// Screenshot/Image Constants
// ============================================

/** Screenshot quality (0-1) */
export const SCREENSHOT_QUALITY = 0.5;

/** Screenshot dimensions */
export const SCREENSHOT_WIDTH = 400;
export const SCREENSHOT_HEIGHT = 300;

// ============================================
// Retry/Backoff Constants
// ============================================

/** Number of retries for failed queries */
export const QUERY_RETRY_COUNT = 2;

// ============================================
// Port Types
// ============================================

/**
 * Types of ports used in the diagram editor.
 */
export enum PortTypes {
    INPUT = 'port.input',
    OUTPUT = 'port.output',
    PARAM = 'port.parameter'
}

// ============================================
// Interfaces
// ============================================

/**
 * Interface for meta information about project.
 */
export interface ProjectInfo {
    name: string;
    version: string;
    description: string;
    author: string;
    image: string;
}

/**
 * Interface for block information.
 */
export interface BlockData {
    selectedInputIds: string[];
    selectedOutputIds: string[];
}

// ============================================
// Theme Colors
// ============================================

export const THEME_COLORS = {
    primary: '#BB86FC',
    secondary: '#03DAC6',
    background: '#0a0a0a',
    surface: '#111111',
    error: '#f44336',
    warning: '#ff9800',
    success: '#4caf50',
    text: {
        primary: '#ffffff',
        secondary: '#666666',
        disabled: '#444444',
    },
    border: 'rgba(255, 255, 255, 0.05)',
} as const;