import dotenv from 'dotenv';
dotenv.config();

import http from 'node:http';
import app from './app';
import { closePool } from './config/db';

const PORT = process.env.PORT || 6000;

const appServer = http.createServer(app);

appServer.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down...`);

  appServer.close(async () => {
    try {
      await closePool();
      console.log('PostgreSQL pool closed');

      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));