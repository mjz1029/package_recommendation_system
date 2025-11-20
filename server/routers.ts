import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllPlans,
  getOnShelfPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanById,
} from "./db";
import { recommendBatch } from "./recommendation-engine";
import { TRPCError } from "@trpc/server";

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
  }),

  plans: router({
    list: publicProcedure.query(async () => {
      return getAllPlans();
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          price: z.number().int().positive(),
          dataGb: z.number().int().nonnegative(),
          voiceMin: z.number().int().nonnegative(),
          broadband: z.string().optional(),
          benefits: z.string().optional(),
          onShelf: z.number().int().min(0).max(1).default(1),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await createPlan(input);
          const plans = await getAllPlans();
          const newPlan = plans[plans.length - 1];
          return newPlan;
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create plan",
          });
        }
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(1).optional(),
          price: z.number().int().positive().optional(),
          dataGb: z.number().int().nonnegative().optional(),
          voiceMin: z.number().int().nonnegative().optional(),
          broadband: z.string().optional(),
          benefits: z.string().optional(),
          onShelf: z.number().int().min(0).max(1).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        try {
          await updatePlan(id, data);
          return getPlanById(id);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update plan",
          });
        }
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          await deletePlan(input.id);
          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete plan",
          });
        }
      }),
  }),

  recommend: router({
    batch: publicProcedure
      .input(
        z.object({
          users: z.array(
            z.object({
              phone: z.string(),
              location: z.string(),
              mainPlan: z.string(),
              currentPrice: z.number(),
              arpu: z.number(),
              dataGb: z.number(),
              voiceMin: z.number(),
              overage: z.number().optional(),
              overageRatio: z.number().optional(),
              remarks: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const allPlans = await getAllPlans();
          const onShelfPlans = allPlans.filter(p => p.onShelf === 1);

          if (onShelfPlans.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "请先添加并上架套餐",
            });
          }

          const results = recommendBatch(input.users, allPlans);
          return {
            count: results.length,
            items: results,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Recommendation failed",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
