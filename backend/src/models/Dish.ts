import { Schema, model } from 'mongoose';

export interface IDish {
  dishId: string;
  dishName: string;
  imageUrl: string;
  isPublished: boolean;
  version: number;
}

export interface DishDto {
  dishId: string;
  dishName: string;
  imageUrl: string;
  isPublished: boolean;
  version: number;
}

const dishSchema = new Schema<IDish>(
  {
    dishId: { type: String, required: true, unique: true },
    dishName: {
      type: String,
      required: true,
      validate: {
        validator: (v: unknown) => typeof v === 'string',
      },
    },
    imageUrl: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  {
    collection: 'dishes',
    versionKey: false,
    timestamps: false,
  }
);

dishSchema.path('dishName').validators = dishSchema.path('dishName').validators.filter(
  (v: any) => v.type !== 'required'
);
dishSchema.path('dishName').validate({
  validator: (v: unknown) => typeof v === 'string',
  message: 'Path `dishName` is required.',
  type: 'required',
});

export const Dish = model<IDish>('Dish', dishSchema);

export function toDishDto(doc: any): DishDto {
  return {
    dishId: String(doc.dishId),
    dishName: String(doc.dishName),
    imageUrl: String(doc.imageUrl),
    isPublished: Boolean(doc.isPublished),
    version: Number(doc.version),
  };
}
