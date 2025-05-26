export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'API Error');
    }
  
    return res.json();
  }
  