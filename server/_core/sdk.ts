import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { COOKIE_NAME } from "../../shared/const";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: number;
  username: string;
};
const JWT_SECRET = new TextEncoder().encode(ENV.jwtSecret || "default-secret-key");

// Re-export for use in other modules
export { COOKIE_NAME };

class SDKServer {
  /**
   * Authenticate a request by checking for JWT token in cookies
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = req.headers.cookie || "";
    const cookieObj: Record<string, string> = {};
    
    cookies.split(";").forEach((cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        cookieObj[key] = decodeURIComponent(value);
      }
    });

    const token = cookieObj[COOKIE_NAME];
    if (!token) {
      throw ForbiddenError("No authentication token found");
    }

    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const payload = verified.payload as SessionPayload;

      if (!payload.userId || !payload.username) {
        throw ForbiddenError("Invalid token payload");
      }

      const user = await db.getUserById(payload.userId);
      if (!user) {
        throw ForbiddenError("User not found");
      }

      return user;
    } catch (error) {
      console.error("[Auth] Token verification failed:", error);
      throw ForbiddenError("Invalid or expired token");
    }
  }

  /**
   * Create a JWT token for a user
   */
  async createToken(userId: number, username: string): Promise<string> {
    const token = await new SignJWT({ userId, username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return token;
  }

  /**
   * Verify password (placeholder - will be implemented with bcrypt in auth procedures)
   */
  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    // This will be called from auth procedures which handle bcrypt
    return true;
  }
}

const AXIOS_TIMEOUT_MS = 10000;

export const sdk = new SDKServer();

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};
