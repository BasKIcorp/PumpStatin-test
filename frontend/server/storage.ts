import { eq } from "drizzle-orm";
import { users, type User, type InsertUser } from "@shared/schema";
import { getDb, initDatabase } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class SqliteStorage implements IStorage {
  constructor() {
    initDatabase();
  }

  async getUser(id: number): Promise<User | undefined> {
    return getDb().select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return getDb().select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const row = getDb()
      .insert(users)
      .values({
        ...insertUser,
        firstName: "",
        lastName: "",
        role: "user",
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      })
      .returning()
      .get();
    return row;
  }
}

export const storage = new SqliteStorage();
