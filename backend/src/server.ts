import dotenv from 'dotenv';
import { app } from './app';
import { connectDb, disconnectDb } from './db';
import { Dish } from './models/Dish';

dotenv.config();

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await connectDb();
    await Dish.init();

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

startServer();
