import { getBackendUrl } from '@/lib/constants/string';
import { logger } from './logger.service';
import { ToastService } from './toast.service';
import type { ApiError } from '@/models/types/common';

/**
 * Centralized API client with proper error handling, logging, and type safety
 */
export class ApiService {
  private static instance: ApiService;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  private constructor() {
    this.baseURL = getBackendUrl();
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseURL}${cleanEndpoint}`;
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: unknown, context: string): never {
    logger.apiError('REQUEST', context, error as Error);

    if (error instanceof Error) {
      // Network or other JavaScript errors
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
      };
      
      ToastService.error(apiError.message);
      throw apiError;
    }

    // Unknown error
    const unknownError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    };
    
    ToastService.error(unknownError.message);
    throw unknownError;
  }

  /**
   * Process fetch response
   */
  private async processResponse<T>(response: Response, context: string): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    try {
      if (!response.ok) {
        let errorData: ApiError;

        if (isJson) {
          const errorResponse = await response.json();
          errorData = {
            code: errorResponse.code || `HTTP_${response.status}`,
            message: errorResponse.message || `Request failed with status ${response.status}`,
            details: errorResponse.details,
          };
        } else {
          const errorText = await response.text();
          errorData = {
            code: `HTTP_${response.status}`,
            message: errorText || `Request failed with status ${response.status}`,
          };
        }

        logger.error(`API Error: ${context}`, undefined, {
          status: response.status,
          error: errorData,
        });

        // Handle specific HTTP status codes
        if (response.status === 401) {
          ToastService.error('Authentication required. Please log in.');
          // Optionally redirect to login
        } else if (response.status === 403) {
          ToastService.error('You do not have permission to perform this action.');
        } else if (response.status === 404) {
          ToastService.error('The requested resource was not found.');
        } else if (response.status >= 500) {
          ToastService.error('Server error. Please try again later.');
        } else {
          ToastService.error(errorData.message);
        }

        throw errorData;
      }

      // Handle successful responses
      if (isJson) {
        const data = await response.json();
        logger.info(`API Success: ${context}`, { status: response.status });
        return data;
      } else {
        // For non-JSON responses, return the text
        const text = await response.text();
        return text as unknown as T;
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Re-throw API errors
        throw error;
      }
      
      // Handle JSON parsing errors or other unexpected errors
      throw this.handleError(error, context);
    }
  }

  /**
   * Generic request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const context = `${method.toUpperCase()} ${endpoint}`;

    logger.apiCall(method, endpoint, options.body ? { hasBody: true } : undefined);

    const config: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.processResponse<T>(response, context);
    } catch (error) {
      throw this.handleError(error, context);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return this.request<T>('GET', url);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const context = `UPLOAD ${endpoint}`;

    logger.apiCall('UPLOAD', endpoint, { fileName: file.name, fileSize: file.size });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('file', file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', async () => {
        try {
          const response = new Response(xhr.response, {
            status: xhr.status,
            headers: new Headers({
              'content-type': xhr.getResponseHeader('content-type') || 'application/json',
            }),
          });

          const result = await this.processResponse<T>(response, context);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        const error = this.handleError(new Error('Upload failed'), context);
        reject(error);
      });

      xhr.open('POST', url);
      
      // Add auth header if available
      if (this.defaultHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', this.defaultHeaders.Authorization);
      }

      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();