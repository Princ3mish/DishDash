export type Dish = {
  dishId: string;
  dishName: string;
  imageUrl: string;
  isPublished: boolean;
  version: number;
};

export type Draft = {
  dishName: string;
  isPublished: boolean;
};

export type DishEntry = {
  saved: Dish;
  draft: Draft;
  saving: boolean;
  error: string | null;
  conflict: Dish | null;
  newerAvailable: Dish | null;
};
