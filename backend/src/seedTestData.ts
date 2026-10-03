import dotenv from 'dotenv';
import { connectDb, disconnectDb } from './db';
import { Dish } from './models/Dish';

dotenv.config();

async function run() {
  try {
    await connectDb();
    await Dish.init();

    const isRemove = process.argv.includes('remove');

    if (isRemove) {
      await Dish.deleteOne({ dishId: 'test-bad-image' });
      console.log('Removed test dish');
    } else {
      await Dish.updateOne(
        { dishId: 'test-bad-image' },
        {
          $setOnInsert: {
            dishName: 'Bad Image Test Dish',
            imageUrl: 'not-a-valid-url',
            isPublished: false,
            version: 1,
          },
        },
        { upsert: true }
      );
      console.log('Test dish ready: test-bad-image');
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
    if (process.exitCode === 1) {
      process.exit(1);
    }
  }
}

run();
