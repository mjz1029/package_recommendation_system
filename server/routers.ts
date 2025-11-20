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
  createUserSession,
  getUserSessionByPhone,
  getRecommendationsBySessionAndPhone,
  createRecommendation,
  getUserSessionsBySessionId,
  getUserSessionBySessionAndPhone,
} from "./db";
import { recommendBatch, recommendMultiple, recommend } from "./recommendation-engine";
import { generateSpeech, generateLocalSpeech } from "./speech-generation";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";

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
          planType: z.enum(["personal", "family", "fttr"]).default("personal"),
          hasBroadband: z.number().int().min(0).max(1).default(0),
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
          planType: z.enum(["personal", "family", "fttr"]).optional(),
          hasBroadband: z.number().int().min(0).max(1).optional(),
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
              hasBroadband: z.number().optional(),
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

          // 生成会话ID
          const sessionId = uuidv4();

          // 保存用户会话数据
          for (const user of input.users) {
            await createUserSession({
              sessionId,
              phone: user.phone,
              location: user.location,
              currentPlan: user.mainPlan,
              currentPrice: user.currentPrice,
              arpu: user.arpu,
              userDataGb: user.dataGb,
              userVoiceMin: user.voiceMin,
              hasBroadband: user.hasBroadband || 0,
            });
          }

          const results = recommendBatch(input.users, allPlans);

          // 保存推荐结果
          for (const result of results) {
            await createRecommendation({
              sessionId,
              phone: result.phone,
              location: result.location,
              currentPlan: result.mainPlan,
              currentPrice: result.currentPrice,
              arpu: result.arpu,
              userDataGb: result.dataGb,
              userVoiceMin: result.voiceMin,
              userHasBroadband: result.hasBroadband || 0,
              recommendedPlanId: result.recommendedPlanId,
              recommendedPlanName: result.recommendedPlanName,
              recommendedPrice: result.recommendedPrice,
              recommendedDataGb: result.recommendedDataGb,
              recommendedVoiceMin: result.recommendedVoiceMin,
              recommendedBroadband: result.recommendedBroadband,
              targetPrice: result.targetPrice,
              matchScore: result.matchScore,
              reason: result.reason,
              resourceRisk: result.resourceRisk ? 1 : 0,
            });
          }

          return {
            sessionId,
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

    // 单用户多套餐推荐
    queryByPhone: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          phone: z.string().regex(/^\d{11}$/, "请输入正确的11位手机号"),
        })
      )
      .query(async ({ input }) => {
        try {
          const allPlans = await getAllPlans();
          const onShelfPlans = allPlans.filter(p => p.onShelf === 1);

          if (onShelfPlans.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "请先添加并上架套餐",
            });
          }

          // 从用户会话表中查询该用户的信息
          const userSession = await getUserSessionBySessionAndPhone(input.sessionId, input.phone);

          if (!userSession) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "未找到该用户的推荐数据，请先上传用户信息",
            });
          }

          // 构建用户数据
          const userData = {
            phone: userSession.phone,
            location: userSession.location || "",
            mainPlan: userSession.currentPlan || "",
            currentPrice: userSession.currentPrice || 0,
            arpu: userSession.arpu || 0,
            dataGb: userSession.userDataGb || 0,
            voiceMin: userSession.userVoiceMin || 0,
            hasBroadband: userSession.hasBroadband || 0,
          };

          // 获取多个推荐套餐（1-3个）
          const multiRecs = recommendMultiple(userData, allPlans, 3);

          return {
            userInfo: {
              phone: userData.phone,
              location: userData.location,
              currentPlan: userData.mainPlan,
              currentPrice: userData.currentPrice,
              arpu: userData.arpu,
              dataGb: userData.dataGb,
              voiceMin: userData.voiceMin,
              hasBroadband: userData.hasBroadband === 1,
            },
            recommendations: multiRecs,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error("Query by phone error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "查询失败，请稍后重试",
          });
        }
      }),
  }),

  // AI推荐话术生成
  speechGeneration: router({
    generate: publicProcedure
      .input(
        z.object({
          phone: z.string(),
          currentPlan: z.string(),
          recommendedPlan: z.string(),
          recommendedPrice: z.number(),
          recommendedDataGb: z.number(),
          recommendedVoiceMin: z.number(),
          reason: z.string(),
          apiProvider: z.enum(["siliconflow", "vapi", "local"]).default("local"),
          apiKey: z.string().optional(),
          apiEndpoint: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // 如果选择本地模式或没有提供API密钥，使用本地模板
          if (input.apiProvider === "local" || !input.apiKey) {
            const speech = generateLocalSpeech({
              phone: input.phone,
              currentPlan: input.currentPlan,
              recommendedPlan: input.recommendedPlan,
              recommendedPrice: input.recommendedPrice,
              recommendedDataGb: input.recommendedDataGb,
              recommendedVoiceMin: input.recommendedVoiceMin,
              reason: input.reason,
              apiProvider: input.apiProvider as "siliconflow" | "vapi",
              apiKey: input.apiKey || "",
              apiEndpoint: input.apiEndpoint,
            });

            return {
              success: true,
              speech,
              provider: "local",
            };
          }

          // 调用真实API
          const result = await generateSpeech({
            phone: input.phone,
            currentPlan: input.currentPlan,
            recommendedPlan: input.recommendedPlan,
            recommendedPrice: input.recommendedPrice,
            recommendedDataGb: input.recommendedDataGb,
            recommendedVoiceMin: input.recommendedVoiceMin,
            reason: input.reason,
            apiProvider: input.apiProvider as "siliconflow" | "vapi",
            apiKey: input.apiKey,
            apiEndpoint: input.apiEndpoint,
          });

          if (!result.success) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: result.error || "话术生成失败",
            });
          }

          return {
            success: true,
            speech: result.speech,
            provider: result.provider,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "话术生成失败",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
