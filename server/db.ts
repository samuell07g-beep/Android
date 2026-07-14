import { eq, and, desc, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, keyStock, keys, transactions, Key, KeyStock, Transaction } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(username: string, passwordHash: string, name: string, role: "admin" | "user" = "user", credits: string = "0") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values({
    username,
    passwordHash,
    name,
    role,
    credits,
  });

  return result;
}

export async function updateUserCredits(userId: number, newCredits: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
}

export async function updateUserPassword(username: string, hashedPassword: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.username, username));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(users);
}

// ============ KEY STOCK FUNCTIONS ============

export async function getKeyStockByType(type: "1day" | "7days" | "30days") {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(keyStock).where(eq(keyStock.type, type)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllKeyStock() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(keyStock);
}

export async function initializeKeyStock() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Initialize stock types if they don't exist
  const types = [
    { type: "1day" as const, costInCredits: 1 },
    { type: "7days" as const, costInCredits: 2 },
    { type: "30days" as const, costInCredits: 4 },
  ];

  for (const type of types) {
    const existing = await getKeyStockByType(type.type);
    if (!existing) {
      await db.insert(keyStock).values({
        type: type.type,
        costInCredits: type.costInCredits,
        availableCount: 0,
      });
    }
  }
}

export async function addKeysToStock(type: "1day" | "7days" | "30days", keyList: string[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Insert keys
  for (const keyValue of keyList) {
    await db.insert(keys).values({
      keyValue: keyValue.trim(),
      type,
      isUsed: "false",
    });
  }

  // Update stock count
  const stock = await getKeyStockByType(type);
  if (stock) {
    const newCount = stock.availableCount + keyList.length;
    await db.update(keyStock).set({ availableCount: newCount }).where(eq(keyStock.type, type));
  }
}

export async function getAvailableKeysForType(type: "1day" | "7days" | "30days", count: number): Promise<Key[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(keys)
    .where(and(eq(keys.type, type), eq(keys.isUsed, "false")))
    .limit(count);
}

export async function markKeysAsUsed(keyIds: number[], userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  for (const keyId of keyIds) {
    await db
      .update(keys)
      .set({
        isUsed: "true",
        usedBy: userId,
        usedAt: new Date(),
      })
      .where(eq(keys.id, keyId));
  }
}

export async function decrementKeyStock(type: "1day" | "7days" | "30days", count: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const stock = await getKeyStockByType(type);
  if (stock) {
    const newCount = Math.max(0, stock.availableCount - count);
    await db.update(keyStock).set({ availableCount: newCount }).where(eq(keyStock.type, type));
  }
}

// ============ TRANSACTION FUNCTIONS ============

export async function createTransaction(
  userId: number,
  type: "key_generation" | "credit_add" | "credit_remove",
  description: string,
  creditAmount?: string,
  keyType?: "1day" | "7days" | "30days",
  keyCount?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(transactions).values({
    userId,
    type,
    description,
    creditAmount,
    keyType,
    keyCount,
  });
}

export async function getUserTransactions(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getAllTransactions(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}
