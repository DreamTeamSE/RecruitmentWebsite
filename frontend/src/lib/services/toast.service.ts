import toast from 'react-hot-toast';

/**
 * Centralized toast notification service
 * Provides consistent styling and behavior across the application
 */
export class ToastService {
  static success(message: string): void {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        borderRadius: '10px',
        background: '#10B981',
        color: '#fff',
      },
    });
  }

  static error(message: string): void {
    toast.error(message, {
      duration: 6000,
      position: 'top-right',
      style: {
        borderRadius: '10px',
        background: '#EF4444',
        color: '#fff',
      },
    });
  }

  static warning(message: string): void {
    toast(message, {
      duration: 5000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        borderRadius: '10px',
        background: '#F59E0B',
        color: '#fff',
      },
    });
  }

  static info(message: string): void {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        borderRadius: '10px',
        background: '#3B82F6',
        color: '#fff',
      },
    });
  }

  static loading(message: string): string {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        borderRadius: '10px',
        background: '#6B7280',
        color: '#fff',
      },
    });
  }

  static dismiss(toastId?: string): void {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> {
    return toast.promise(promise, messages, {
      position: 'top-right',
      style: {
        borderRadius: '10px',
      },
    });
  }
}