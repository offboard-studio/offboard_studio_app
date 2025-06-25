/* eslint-disable @typescript-eslint/no-explicit-any */
// Write a singleton class for the values 
// that are used in the app, such as the database connection, logger, etc.
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppSingleton {
  private store: Map<string, any> = new Map();

  setOnce(key: string, value: any): void {
    this.store.set(key, value);
  }

  get<T = any>(key: string): T | undefined {
    return this.store.get(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.store.entries()) {
      result[key] = value;
    }
    return result;
  }
}
