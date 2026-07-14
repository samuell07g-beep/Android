import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createResellerContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
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

describe("reseller.generateKeys", () => {
  it("should generate keys and deduct credits", async () => {
    // Create a test reseller with enough credits
    const testReseller = {
      username: "reseller1",
      password: "password123",
      name: "Test Reseller",
      credits: "100",
    };

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testReseller.password, 10);
    const user = await db.createUser(
      testReseller.username,
      hashedPassword,
      testReseller.name,
      "user",
      testReseller.credits
    );

    // Add some keys to stock
    await db.addKeysToStock("1day", ["key1", "key2", "key3"]);

    const resellerUser: AuthenticatedUser = {
      id: 1,
      username: testReseller.username,
      name: testReseller.name,
      role: "user",
      credits: testReseller.credits,
      passwordHash: hashedPassword,
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createResellerContext(resellerUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reseller.generateKeys({
      type: "1day",
      quantity: 1,
    });

    expect(result.success).toBe(true);
    expect(result.keys).toHaveLength(1);
    expect(result.costInCredits).toBe(1);
    expect(result.remainingCredits).toBe("99");
  });

  it("should reject generation with insufficient credits", async () => {
    // Create a test reseller with low credits
    const testReseller = {
      username: "reseller2",
      password: "password123",
      name: "Poor Reseller",
      credits: "0",
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

    const resellerUser: AuthenticatedUser = {
      id: 2,
      username: testReseller.username,
      name: testReseller.name,
      role: "user",
      credits: testReseller.credits,
      passwordHash: hashedPassword,
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createResellerContext(resellerUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.reseller.generateKeys({
        type: "1day",
        quantity: 1,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toContain("Insufficient credits");
    }
  });

  it("should reject generation with insufficient stock", async () => {
    // Create a test reseller with enough credits but no keys in stock
    const testReseller = {
      username: "reseller3",
      password: "password123",
      name: "Reseller No Stock",
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

    const resellerUser: AuthenticatedUser = {
      id: 3,
      username: testReseller.username,
      name: testReseller.name,
      role: "user",
      credits: testReseller.credits,
      passwordHash: hashedPassword,
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx = createResellerContext(resellerUser);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.reseller.generateKeys({
        type: "7days",
        quantity: 100,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toContain("Not enough keys available");
    }
  });
});
