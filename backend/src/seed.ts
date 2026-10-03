import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectDb, disconnectDb } from './db';
import { Dish } from './models/Dish';

dotenv.config();

async function seed() {
  try {
    await connectDb();
    await Dish.init();

    const filePath = path.resolve(__dirname, '../data/dishes.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed file not found at ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);

    if (!Array.isArray(parsed)) {
      throw new Error('Seed data must be an array');
    }

    if (parsed.length === 0) {
      console.log('Inserted 0, skipped 0 (already existed)');
      return;
    }

    const operations = parsed.map((item: any) => ({
      updateOne: {
        filter: { dishId: String(item.dishId) },
        update: {
          $setOnInsert: {
            dishName: item.dishName,
            imageUrl: item.imageUrl,
            isPublished: Boolean(item.isPublished),
            version: 1,
          },
        },
        upsert: true,
      },
    }));

    const result = await Dish.bulkWrite(operations);
    const inserted = result.upsertedCount;
    const skipped = parsed.length - inserted;

    console.log(`Inserted ${inserted}, skipped ${skipped} (already existed)`);
  } catch (err) {
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
    if (process.exitCode === 1) {
      process.exit(1);
    }
  }
}

seed();
