import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(user: AuthenticatedUser | null = null): {
  ctx: TrpcContext;
  setCookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>;
} {
  const setCookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookieCalls.push({ name, value, options });
      },
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, setCookieCalls };
}

describe("auth.login", () => {
  it("should login with valid credentials", async () => {
    // Create a test user
    const testUser = {
      username: "testuser",
      password: "password123",
      name: "Test User",
    };

    // Hash the password
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    // Create user in database
    await db.createUser(testUser.username, hashedPassword, testUser.name, "user", "100");

    const { ctx, setCookieCalls } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: testUser.username,
      password: testUser.password,
    });

    expect(result.success).toBe(true);
    expect(result.user.username).toBe(testUser.username);
    expect(result.user.role).toBe("user");
    expect(setCookieCalls).toHaveLength(1);
    expect(setCookieCalls[0]?.name).toBe(COOKIE_NAME);
  });

  it("should reject login with invalid username", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        username: "nonexistent",
        password: "password123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("Invalid username or password");
    }
  });

  it("should reject login with invalid password", async () => {
    // Create a test user
    const testUser = {
      username: "testuser2",
      password: "password123",
      name: "Test User 2",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.createUser(testUser.username, hashedPassword, testUser.name, "user", "100");

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        username: testUser.username,
        password: "wrongpassword",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("Invalid username or password");
    }
  });

  it("should allow admin login", async () => {
    const { ctx, setCookieCalls } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: "ADMIN",
      password: "ADMIN999",
    });

    expect(result.success).toBe(true);
    expect(result.user.username).toBe("ADMIN");
    expect(result.user.role).toBe("admin");
    expect(setCookieCalls).toHaveLength(1);
  });
});
