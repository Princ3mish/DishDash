import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { listDishes, updateDish } from './dishService';
import { ApiError } from './errors';
import { validateDishId, validatePatchBody } from './validation';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/dishes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dishes = await listDishes();
    res.status(200).json(dishes);
  } catch (err) {
    next(err);
  }
});

app.patch('/dishes/:dishId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dishId = validateDishId(req.params.dishId);
    const body = validatePatchBody(req.body);
    const savedDish = await updateDish(dishId, body);
    res.status(200).json(savedDish);
  } catch (err) {
    next(err);
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, 'NOT_FOUND', 'Route not found'));
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload',
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    const responseBody: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.extra) {
      Object.assign(responseBody, err.extra);
    }
    res.status(err.status).json(responseBody);
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
  });
});
