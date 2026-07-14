import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await db.getUserByUsername(input.username);
          if (!user) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid username or password",
            });
          }

          // Verify password
          const bcrypt = await import("bcrypt");
          const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
          if (!isPasswordValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid username or password",
            });
          }

          // Create JWT token
          const { sdk } = await import("./_core/sdk");
          const token = await sdk.createToken(user.id, user.username);

          // Update last signed in
          await db.updateUserLastSignedIn(user.id);

          // Set cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

          return {
            success: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              credits: user.credits,
            },
          };
        } catch (error) {
          console.error("Login failed:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Login failed",
          });
        }
      }),
    register: adminProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
        credits: z.string().default("0"),
      }))
      .mutation(async ({ input }) => {
        try {
          const existingUser = await db.getUserByUsername(input.username);
          if (existingUser) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username already exists",
            });
          }

          const bcrypt = await import("bcrypt");
          const hashedPassword = await bcrypt.hash(input.password, 10);

          await db.createUser(
            input.username,
            hashedPassword,
            input.name || input.username,
            "user",
            input.credits
          );

          return { success: true, message: "Reseller created successfully" };
        } catch (error) {
          console.error("Failed to create reseller:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create reseller",
          });
        }
      }),
  }),

  // ============ ADMIN PROCEDURES ============
  admin: router({
    /**
     * Adicionar ou remover créditos de um revendedor
     */
    updateResellerCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        creditAmount: z.string(),
        operation: z.enum(["add", "remove", "set"]),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await db.getUserById(input.userId);
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found",
            });
          }

          const currentCredits = parseFloat(user.credits);
          let newCredits = currentCredits;

          if (input.operation === "add") {
            newCredits = currentCredits + parseFloat(input.creditAmount);
          } else if (input.operation === "remove") {
            newCredits = currentCredits - parseFloat(input.creditAmount);
            if (newCredits < 0) newCredits = 0;
          } else if (input.operation === "set") {
            newCredits = parseFloat(input.creditAmount);
          }

          await db.updateUserCredits(input.userId, newCredits.toString());

          // Record transaction
          const description = `Credits ${input.operation}ed by admin: ${input.creditAmount}`;
          await db.createTransaction(
            input.userId,
            input.operation === "add" ? "credit_add" : "credit_remove",
            description,
            input.creditAmount
          );

          return { success: true, newCredits: newCredits.toString() };
        } catch (error) {
          console.error("Failed to update credits:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update credits",
          });
        }
      }),

    /**
     * Adicionar keys ao estoque
     */
    addKeysToStock: adminProcedure
      .input(z.object({
        type: z.enum(["1day", "7days", "30days"]),
        keys: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          await db.addKeysToStock(input.type, input.keys);

          // Record transaction for admin
          await db.createTransaction(
            ctx.user.id,
            "key_generation",
            `Added ${input.keys.length} keys to ${input.type} stock`,
            undefined,
            input.type,
            input.keys.length
          );

          return { success: true, count: input.keys.length };
        } catch (error) {
          console.error("Failed to add keys:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add keys to stock",
          });
        }
      }),

    /**
     * Listar todos os revendedores
     */
    listResellers: adminProcedure.query(async () => {
      try {
        const users = await db.getAllUsers();
        return users.filter(u => u.role === "user").map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          credits: u.credits,
          createdAt: u.createdAt,
          lastSignedIn: u.lastSignedIn,
        }));
      } catch (error) {
        console.error("Failed to list resellers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list resellers",
        });
      }
    }),

    /**
     * Listar histórico de transações (admin)
     */
    listTransactions: adminProcedure
      .input(z.object({
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getAllTransactions(input.limit);
        } catch (error) {
          console.error("Failed to list transactions:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list transactions",
          });
        }
      }),
  }),

  // ============ REVENDEDOR PROCEDURES ============
  reseller: router({
    /**
     * Obter informações do revendedor
     */
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        username: ctx.user.username,
        name: ctx.user.name,
        credits: ctx.user.credits,
        role: ctx.user.role,
      };
    }),

    /**
     * Obter estoque disponível de keys
     */
    getKeyStock: protectedProcedure.query(async () => {
      try {
        const stock = await db.getAllKeyStock();
        return stock.map(s => ({
          type: s.type,
          costInCredits: s.costInCredits,
          availableCount: s.availableCount,
        }));
      } catch (error) {
        console.error("Failed to get key stock:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get key stock",
        });
      }
    }),

    /**
     * Gerar keys (desconta créditos)
     */
    generateKeys: protectedProcedure
      .input(z.object({
        type: z.enum(["1day", "7days", "30days"]),
        quantity: z.number().min(1).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const stock = await db.getKeyStockByType(input.type);
          if (!stock) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Key type not found",
            });
          }

          // Check if enough keys available
          if (stock.availableCount < input.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough keys available. Available: ${stock.availableCount}, Requested: ${input.quantity}`,
            });
          }

          // Calculate cost
          const totalCost = stock.costInCredits * input.quantity;
          const userCredits = parseFloat(ctx.user.credits);

          if (userCredits < totalCost) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient credits. Available: ${userCredits}, Required: ${totalCost}`,
            });
          }

          // Get keys from stock
          const availableKeys = await db.getAvailableKeysForType(input.type, input.quantity);
          if (availableKeys.length < input.quantity) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to retrieve keys from stock",
            });
          }

          // Mark keys as used
          const keyIds = availableKeys.map(k => k.id);
          await db.markKeysAsUsed(keyIds, ctx.user.id);

          // Deduct credits
          const newCredits = (userCredits - totalCost).toString();
          await db.updateUserCredits(ctx.user.id, newCredits);

          // Decrement stock
          await db.decrementKeyStock(input.type, input.quantity);

          // Record transaction
          await db.createTransaction(
            ctx.user.id,
            "key_generation",
            `Generated ${input.quantity} ${input.type} keys`,
            totalCost.toString(),
            input.type,
            input.quantity
          );

          // Return keys to user
          const keyValues = availableKeys.map(k => k.keyValue);
          return {
            success: true,
            keys: keyValues,
            costInCredits: totalCost,
            remainingCredits: newCredits,
          };
        } catch (error) {
          console.error("Failed to generate keys:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate keys",
          });
        }
      }),

    /**
     * Listar histórico de transações do revendedor
     */
    listMyTransactions: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
      }))
      .query(async ({ input, ctx }) => {
        try {
          return await db.getUserTransactions(ctx.user.id, input.limit);
        } catch (error) {
          console.error("Failed to list transactions:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list transactions",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
