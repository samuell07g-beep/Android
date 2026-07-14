import { getDb } from "../db";

export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn("[Migration] Database not available, skipping migrations");
    return;
  }

  try {
    console.log("[Migration] Starting database migrations...");

    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        name TEXT,
        email VARCHAR(320),
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        credits INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] ✓ users table created");

    // Create key_stock table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS key_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('1day', '7days', '30days') NOT NULL UNIQUE,
        costInCredits INT NOT NULL,
        availableCount INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] ✓ key_stock table created");

    // Create keys table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        keyValue VARCHAR(255) NOT NULL,
        type ENUM('1day', '7days', '30days') NOT NULL,
        isUsed BOOLEAN DEFAULT FALSE,
        usedBy INT,
        usedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usedBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("[Migration] ✓ keys table created");

    // Create transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        description TEXT NOT NULL,
        creditAmount INT,
        transactionType ENUM('key_generation', 'credit_add', 'credit_remove', 'credit_set') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("[Migration] ✓ transactions table created");

    // Insert initial key_stock data if not exists
    await db.execute(`
      INSERT IGNORE INTO key_stock (type, costInCredits, availableCount) VALUES
      ('1day', 1, 0),
      ('7days', 2, 0),
      ('30days', 4, 0)
    `);
    console.log("[Migration] ✓ key_stock initial data inserted");

    console.log("[Migration] ✅ All migrations completed successfully!");
  } catch (error) {
    console.error("[Migration] ❌ Migration failed:", error);
    throw error;
  }
}
