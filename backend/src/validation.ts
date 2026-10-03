import { ApiError } from './errors';

export function validateDishId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'dishId must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 128) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'dishId must be a non-empty string of max 128 characters');
  }
  return trimmed;
}

export function validatePatchBody(body: unknown): {
  dishName: string;
  isPublished: boolean;
  expectedVersion: number;
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  if (typeof b.dishName !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'dishName must be a string');
  }
  if (typeof b.isPublished !== 'boolean') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'isPublished must be a boolean');
  }
  if (typeof b.expectedVersion !== 'number' || !Number.isInteger(b.expectedVersion) || b.expectedVersion < 1) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'expectedVersion must be an integer greater than or equal to 1');
  }
  return {
    dishName: b.dishName.trim(),
    isPublished: b.isPublished,
    expectedVersion: b.expectedVersion,
  };
}

export function isValidHttpUrl(url: string): boolean {
  if (typeof url !== 'string' || /\s/.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function validatePublishRules(name: string, imageUrl: string, isPublished: boolean): void {
  if (isPublished) {
    if (!name || name.trim().length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'A published dish must have a non-empty name');
    }
    if (!isValidHttpUrl(imageUrl)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'A published dish must have a valid http or https image URL');
    }
  }
}
