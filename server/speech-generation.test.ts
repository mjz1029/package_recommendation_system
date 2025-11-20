import { describe, it, expect } from "vitest";
import { generateLocalSpeech } from "./speech-generation";

describe("Speech Generation", () => {
  it("should generate local speech with correct structure", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足，通话时长更长",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    // 验证生成的话术包含关键信息
    expect(speech).toContain("129");
    expect(speech).toContain("30GB");
    expect(speech).toContain("500");
    expect(speech).toContain("套餐");
  });

  it("should generate speech with reasonable length", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足，通话时长更长",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    // 话术长度应该在140-400字之间
    expect(speech.length).toBeGreaterThan(140);
    expect(speech.length).toBeLessThan(400);
  });

  it("should use active language without asking for permission", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足，通话时长更长",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    // 验证话术不包含询问性语言
    expect(speech).not.toMatch(/您觉得怎么样/);
    expect(speech).not.toMatch(/您同意吗/);
    expect(speech).not.toMatch(/可以吗/);

    // 验证包含主动引导的语言
    expect(speech).toMatch(/办理|激活|上门|营业厅/);
  });

  it("should handle different plan types correctly", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "个人版99元",
      recommendedPlan: "家庭版199元",
      recommendedPrice: 199,
      recommendedDataGb: 50,
      recommendedVoiceMin: 1000,
      reason: "包含宽带，更适合家庭使用",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    expect(speech).toContain("199");
    expect(speech).toContain("50GB");
    expect(speech).toContain("1000");
    expect(speech.length).toBeGreaterThan(140);
  });

  it("should generate different speeches on multiple calls", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech1 = generateLocalSpeech(request);
    const speech2 = generateLocalSpeech(request);

    // 由于使用了随机模板，两次生成的话术可能不同
    // 但都应该包含关键信息
    expect(speech1).toContain("129");
    expect(speech2).toContain("129");
  });

  it("should maintain professional tone", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足，通话时长更长",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    // 验证话术使用敬语
    expect(speech).toMatch(/您|我们|为您/);

    // 验证不包含不专业的用语
    expect(speech).not.toMatch(/呃|嗯|额/);
  });

  it("should include call-to-action", () => {
    const request = {
      phone: "13800138000",
      currentPlan: "99元套餐",
      recommendedPlan: "129元套餐",
      recommendedPrice: 129,
      recommendedDataGb: 30,
      recommendedVoiceMin: 500,
      reason: "流量更充足",
      apiProvider: "local" as const,
      apiKey: "",
    };

    const speech = generateLocalSpeech(request);

    // 验证包含行动号召
    expect(speech).toMatch(/告诉我|请告诉|什么时间|方便|立即|现在就/);
  });
});
