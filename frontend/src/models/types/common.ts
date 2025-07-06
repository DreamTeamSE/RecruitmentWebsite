// ============================================================================
// Common Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string; // For validation errors
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

/**
 * Form validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Component props for error boundaries
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

/**
 * File upload types
 */
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

/**
 * Search/filter parameters
 */
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Status types for various entities
 */
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

/**
 * Common component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
}

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontFamily: string;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  apiUrl: string;
  appVersion: string;
  buildTimestamp: string;
}

/**
 * Utility type for making properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Utility type for deep partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type for async function states
 */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetch?: Date;
}

/**
 * Generic hook return type for data fetching
 */
export interface UseDataHook<T> extends AsyncState<T> {
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
}