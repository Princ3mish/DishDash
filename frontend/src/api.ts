import type { Dish } from './types';

export class ApiClientError extends Error {
  kind: 'validation' | 'conflict' | 'not_found' | 'server' | 'network';
  current?: Dish;

  constructor(
    message: string,
    kind: 'validation' | 'conflict' | 'not_found' | 'server' | 'network',
    current?: Dish
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind;
    this.current = current;
  }
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDishes(signal?: AbortSignal): Promise<Dish[]> {
  let res: Response;
  try {
    res = await fetch('/dishes', { signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw new ApiClientError(
      'Cannot reach the server. Check that the backend is running.',
      'network'
    );
  }

  const data = await parseJsonSafely(res);

  if (!res.ok) {
    const msg = data?.error?.message || 'Failed to load dishes';
    throw new ApiClientError(msg, 'server');
  }

  return data as Dish[];
}

export async function patchDish(
  dishId: string,
  body: { dishName: string; isPublished: boolean; expectedVersion: number }
): Promise<Dish> {
  let res: Response;
  try {
    res = await fetch(`/dishes/${encodeURIComponent(dishId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(
      'Cannot reach the server. Your draft is kept; you can retry.',
      'network'
    );
  }

  const data = await parseJsonSafely(res);

  if (res.ok) {
    return data as Dish;
  }

  if (res.status === 400) {
    throw new ApiClientError(
      data?.error?.message || 'Validation failed',
      'validation'
    );
  }

  if (res.status === 404) {
    throw new ApiClientError(
      data?.error?.message || 'Dish not found',
      'not_found'
    );
  }

  if (res.status === 409) {
    throw new ApiClientError(
      'Another update was saved for this dish while you were editing.',
      'conflict',
      data?.current
    );
  }

  throw new ApiClientError(
    data?.error?.message || 'Unexpected server error. Please try again.',
    'server'
  );
}
