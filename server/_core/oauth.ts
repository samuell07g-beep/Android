import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcrypt";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function registerOAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Login com username e password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const user = await db.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Create JWT token
      const token = await sdk.createToken(user.id, user.username);

      // Update last signed in
      await db.updateUserLastSignedIn(user.id);

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          credits: user.credits,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout do usuário
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  /**
   * POST /api/auth/register
   * Criar novo usuário revendedor (admin only)
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, name, credits } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      // Check if user already exists
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        res.status(400).json({ error: "Username already exists" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      await db.createUser(username, hashedPassword, name || username, "user", credits || "0");

      res.json({ success: true, message: "User created successfully" });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
}

/**
 * Initialize admin user with hashed password
 */
export async function initializeAdminUser() {
  try {
    const adminUser = await db.getUserByUsername("ADMIN");
    if (adminUser && adminUser.passwordHash !== "$2b$10$placeholder") {
      // Already initialized
      return;
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash("ADMIN999", 10);

    if (adminUser) {
      // Update existing admin user
      await db.updateUserPassword("ADMIN", hashedPassword);
    } else {
      // Create admin user
      await db.createUser("ADMIN", hashedPassword, "Administrator", "admin", "999999.00");
    }

    console.log("[Auth] Admin user initialized");
  } catch (error) {
    console.error("[Auth] Failed to initialize admin user:", error);
  }
}
