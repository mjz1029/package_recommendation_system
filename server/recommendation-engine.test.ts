import { describe, it, expect } from "vitest";
import {
  generatePriceTiers,
  recommend,
  recommendBatch,
  type UserData,
  type RecommendationResult,
} from "./recommendation-engine";
import type { Plan } from "../drizzle/schema";

const mockPlans: Plan[] = [
  {
    id: 1,
    name: "基础套餐",
    price: 39,
    dataGb: 5,
    voiceMin: 100,
    broadband: "10M",
    benefits: null,
    onShelf: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "标准套餐",
    price: 79,
    dataGb: 15,
    voiceMin: 300,
    broadband: "100M",
    benefits: "视频会员",
    onShelf: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "高级套餐",
    price: 129,
    dataGb: 30,
    voiceMin: 500,
    broadband: "300M",
    benefits: "视频会员+音乐会员",
    onShelf: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    name: "尊享套餐",
    price: 199,
    dataGb: 100,
    voiceMin: 1000,
    broadband: "500M",
    benefits: "全套会员",
    onShelf: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("Recommendation Engine", () => {
  describe("generatePriceTiers", () => {
    it("should generate correct price tiers from plans", () => {
      const tiers = generatePriceTiers(mockPlans);
      expect(tiers).toEqual([39, 79, 129, 199]);
    });

    it("should handle empty plans", () => {
      const tiers = generatePriceTiers([]);
      expect(tiers).toEqual([]);
    });

    it("should deduplicate prices", () => {
      const plansWithDuplicates = [
        ...mockPlans,
        { ...mockPlans[0], id: 5, onShelf: 1 },
      ];
      const tiers = generatePriceTiers(plansWithDuplicates);
      expect(tiers).toEqual([39, 79, 129, 199]);
    });
  });

  describe("recommend", () => {
    it("should recommend same price tier when diff <= 10", () => {
      const userData: UserData = {
        phone: "13800000001",
        location: "北京",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 85,
        dataGb: 10,
        voiceMin: 200,
      };

      const result = recommend(userData, mockPlans);

      expect(result.targetPrice).toBe(79);
      expect(result.reason).toContain("相近档位");
      expect(result.diff).toBe(6);
    });

    it("should recommend higher tier when 10 < diff <= 50", () => {
      const userData: UserData = {
        phone: "13800000002",
        location: "上海",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 120,
        dataGb: 20,
        voiceMin: 400,
      };

      const result = recommend(userData, mockPlans);

      expect(result.targetPrice).toBe(129);
      expect(result.reason).toContain("高一档");
      expect(result.diff).toBe(41);
    });

    it("should recommend lower tier when diff > 50", () => {
      const userData: UserData = {
        phone: "13800000003",
        location: "广州",
        mainPlan: "基础套餐",
        currentPrice: 39,
        arpu: 128,
        dataGb: 20,
        voiceMin: 400,
      };

      const result = recommend(userData, mockPlans);

      expect(result.diff).toBe(89);
      expect(result.reason).toContain("低于ARPU三档");
    });

    it("should mark resource risk when resources insufficient", () => {
      const userData: UserData = {
        phone: "13800000004",
        location: "深圳",
        mainPlan: "基础套餐",
        currentPrice: 39,
        arpu: 45,
        dataGb: 50,
        voiceMin: 1000,
      };

      const result = recommend(userData, mockPlans);

      expect(result.resourceRisk).toBe(true);
      expect(result.reason).toContain("资源可能不足");
    });

    it("should not mark resource risk when resources sufficient", () => {
      const userData: UserData = {
        phone: "13800000005",
        location: "杭州",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 85,
        dataGb: 10,
        voiceMin: 200,
      };

      const result = recommend(userData, mockPlans);

      expect(result.resourceRisk).toBe(false);
      expect(result.reason).toContain("资源匹配");
    });

    it("should throw error when no on-shelf plans available", () => {
      const offShelfPlans = mockPlans.map(p => ({ ...p, onShelf: 0 }));
      const userData: UserData = {
        phone: "13800000006",
        location: "西安",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 85,
        dataGb: 10,
        voiceMin: 200,
      };

      expect(() => recommend(userData, offShelfPlans)).toThrow();
    });
  });

  describe("recommendBatch", () => {
    it("should process multiple users", () => {
      const users: UserData[] = [
        {
          phone: "13800000001",
          location: "北京",
          mainPlan: "标准套餐",
          currentPrice: 79,
          arpu: 85,
          dataGb: 10,
          voiceMin: 200,
        },
        {
          phone: "13800000002",
          location: "上海",
          mainPlan: "标准套餐",
          currentPrice: 79,
          arpu: 120,
          dataGb: 20,
          voiceMin: 400,
        },
      ];

      const results = recommendBatch(users, mockPlans);

      expect(results).toHaveLength(2);
      expect(results[0].phone).toBe("13800000001");
      expect(results[1].phone).toBe("13800000002");
    });

    it("should handle errors gracefully", () => {
      const users: UserData[] = [
        {
          phone: "13800000001",
          location: "北京",
          mainPlan: "标准套餐",
          currentPrice: 79,
          arpu: 85,
          dataGb: 10,
          voiceMin: 200,
        },
      ];

      const results = recommendBatch(users, []);

      expect(results).toHaveLength(1);
      expect(results[0].recommendedPlanName).toBe("无可推荐");
      expect(results[0].reason).toBe("推荐失败");
    });
  });

  describe("Edge cases", () => {
    it("should handle diff exactly at boundaries", () => {
      // diff = 10
      const userData1: UserData = {
        phone: "13800000001",
        location: "北京",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 89,
        dataGb: 10,
        voiceMin: 200,
      };

      const result1 = recommend(userData1, mockPlans);
      expect(result1.diff).toBe(10);
      expect(result1.reason).toContain("相近档位");

      // diff = 50
      const userData2: UserData = {
        phone: "13800000002",
        location: "上海",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 129,
        dataGb: 20,
        voiceMin: 400,
      };

      const result2 = recommend(userData2, mockPlans);
      expect(result2.diff).toBe(50);
      expect(result2.reason).toContain("高一档");
    });

    it("should select plan with best resource match", () => {
      const plansWithMultipleOptions: Plan[] = [
        {
          id: 1,
          name: "套餐A",
          price: 79,
          dataGb: 15,
          voiceMin: 300,
          broadband: "100M",
          benefits: null,
          onShelf: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "套餐B",
          price: 79,
          dataGb: 20,
          voiceMin: 400,
          broadband: "100M",
          benefits: null,
          onShelf: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const userData: UserData = {
        phone: "13800000001",
        location: "北京",
        mainPlan: "标准套餐",
        currentPrice: 79,
        arpu: 85,
        dataGb: 12,
        voiceMin: 250,
      };

      const result = recommend(userData, plansWithMultipleOptions);

      // Should select 套餐A as it has less surplus resources
      expect(result.recommendedPlanName).toBe("套餐A");
    });
  });
});
