import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const adminUser: AuthenticatedUser = {
    id: 1,
    username: "ADMIN",
    name: "Administrator",
    role: "admin",
    credits: "999999.00",
    passwordHash: "$2b$10$placeholder",
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("admin.updateResellerCredits", () => {
  it("should add credits to a reseller", async () => {
    // Create a test reseller
    const testReseller = {
      username: "reseller_add",
      password: "password123",
      name: "Test Reseller",
      credits: "50",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testReseller.password, 10);
    await db.createUser(
      testReseller.username,
      hashedPassword,
      testReseller.name,
      "user",
      testReseller.credits
    );

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateResellerCredits({
      userId: 2, // Assuming the reseller gets ID 2
      creditAmount: "50",
      operation: "add",
    });

    expect(result.success).toBe(true);
    expect(result.newCredits).toBe("100");
  });

  it("should remove credits from a reseller", async () => {
    // Create a test reseller
    const testReseller = {
      username: "reseller_remove",
      password: "password123",
      name: "Test Reseller Remove",
      credits: "100",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testReseller.password, 10);
    await db.createUser(
      testReseller.username,
      hashedPassword,
      testReseller.name,
      "user",
      testReseller.credits
    );

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateResellerCredits({
      userId: 3, // Assuming the reseller gets ID 3
      creditAmount: "30",
      operation: "remove",
    });

    expect(result.success).toBe(true);
    expect(result.newCredits).toBe("70");
  });

  it("should set credits to a specific value", async () => {
    // Create a test reseller
    const testReseller = {
      username: "reseller_set",
      password: "password123",
      name: "Test Reseller Set",
      credits: "50",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testReseller.password, 10);
    await db.createUser(
      testReseller.username,
      hashedPassword,
      testReseller.name,
      "user",
      testReseller.credits
    );

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateResellerCredits({
      userId: 4, // Assuming the reseller gets ID 4
      creditAmount: "200",
      operation: "set",
    });

    expect(result.success).toBe(true);
    expect(result.newCredits).toBe("200");
  });

  it("should not allow negative credits when removing", async () => {
    // Create a test reseller with low credits
    const testReseller = {
      username: "reseller_negative",
      password: "password123",
      name: "Test Reseller Negative",
      credits: "10",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testReseller.password, 10);
    await db.createUser(
      testReseller.username,
      hashedPassword,
      testReseller.name,
      "user",
      testReseller.credits
    );

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.updateResellerCredits({
      userId: 5, // Assuming the reseller gets ID 5
      creditAmount: "50",
      operation: "remove",
    });

    expect(result.success).toBe(true);
    expect(result.newCredits).toBe("0"); // Should be clamped to 0
  });

  it("should reject updates for non-existent users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.updateResellerCredits({
        userId: 99999,
        creditAmount: "50",
        operation: "add",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toContain("User not found");
    }
  });
});
