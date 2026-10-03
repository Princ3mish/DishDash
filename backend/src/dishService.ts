import { ApiError } from './errors';
import { Dish, DishDto, toDishDto } from './models/Dish';
import { validatePublishRules } from './validation';

export async function listDishes(): Promise<DishDto[]> {
  const docs = await Dish.find().lean();
  docs.sort((a, b) => {
    const isNumA = typeof a.dishId === 'string' && a.dishId.trim() !== '' && !Number.isNaN(Number(a.dishId));
    const isNumB = typeof b.dishId === 'string' && b.dishId.trim() !== '' && !Number.isNaN(Number(b.dishId));
    if (isNumA && isNumB) {
      return Number(a.dishId) - Number(b.dishId);
    }
    return String(a.dishId).localeCompare(String(b.dishId));
  });
  return docs.map(toDishDto);
}

export async function updateDish(
  dishId: string,
  input: { dishName: string; isPublished: boolean; expectedVersion: number }
): Promise<DishDto> {
  const existing = await Dish.findOne({ dishId }).lean();
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Dish not found');
  }

  validatePublishRules(input.dishName, existing.imageUrl, input.isPublished);

  const updated = await Dish.findOneAndUpdate(
    { dishId, version: input.expectedVersion },
    {
      $set: { dishName: input.dishName, isPublished: input.isPublished },
      $inc: { version: 1 },
    },
    { new: true }
  ).lean();

  if (updated) {
    return toDishDto(updated);
  }

  const current = await Dish.findOne({ dishId }).lean();
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Dish not found');
  }

  throw new ApiError(409, 'VERSION_CONFLICT', 'Dish was updated by someone else', {
    current: toDishDto(current),
  });
}
