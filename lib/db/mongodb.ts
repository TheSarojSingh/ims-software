import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not defined');

interface Cache {
  conn:    typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongoose: Cache | undefined;
}

const cached: Cache = global.__mongoose ?? { conn: null, promise: null };
global.__mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize:    10,
    });
  }

  cached.conn = await cached.promise;
  await import('@/lib/db/models'); // register all schemas on every cold start
  return cached.conn;
}