/**
 * AI推荐话术生成服务
 * 支持硅基流动和V-API中转
 */

export interface SpeechGenerationRequest {
  phone: string;
  currentPlan: string;
  recommendedPlan: string;
  recommendedPrice: number;
  recommendedDataGb: number;
  recommendedVoiceMin: number;
  reason: string;
  apiProvider: "siliconflow" | "vapi";
  apiKey: string;
  apiEndpoint?: string; // 用户自定义端点
}

export interface SpeechGenerationResponse {
  success: boolean;
  speech: string;
  provider: string;
  error?: string;
}

/**
 * 生成推荐话术的提示词
 */
function generatePrompt(request: SpeechGenerationRequest): string {
  return `你是一位专业的电信营销顾问。现在需要为一位客户生成一段推荐话术。

客户信息：
- 手机号：${request.phone}
- 当前套餐：${request.currentPlan}
- 推荐套餐：${request.recommendedPlan}（${request.recommendedPrice}元/月）
- 推荐理由：${request.reason}

推荐套餐详情：
- 流量：${request.recommendedDataGb}GB
- 通话：${request.recommendedVoiceMin}分钟

要求：
1. 语气自信、专业、友好，直接切入主题
2. 突出推荐套餐相比当前套餐的优势（更便宜、资源更充足等）
3. 采用主动引导的方式，引导客户同意入户办理或到营业厅办理
4. 不要询问客户"您觉得怎么样"或"您同意吗"，而是直接说明行动步骤
5. 不给客户拒绝的机会，语气要坚定有力
6. 长度约300字左右
7. 只用中文，语言自然流畅
8. 可以提到：更省钱、资源更充足、升级不加价等卖点

请直接生成话术，不需要额外说明。`;
}

/**
 * 调用硅基流动API生成话术
 */
async function generateWithSiliconFlow(
  request: SpeechGenerationRequest
): Promise<SpeechGenerationResponse> {
  try {
    const endpoint = request.apiEndpoint || "https://api.siliconflow.cn/v1/chat/completions";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct", // 默认模型
        messages: [
          {
            role: "system",
            content: "你是一位专业的电信营销顾问，擅长快速成交。",
          },
          {
            role: "user",
            content: generatePrompt(request),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API错误: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const speech = data.choices?.[0]?.message?.content || "";

    if (!speech) {
      throw new Error("API返回内容为空");
    }

    return {
      success: true,
      speech: speech.trim(),
      provider: "siliconflow",
    };
  } catch (error) {
    return {
      success: false,
      speech: "",
      provider: "siliconflow",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 调用V-API中转生成话术
 */
async function generateWithVAPI(
  request: SpeechGenerationRequest
): Promise<SpeechGenerationResponse> {
  try {
    const endpoint = request.apiEndpoint || "https://api.v-api.cn/v1/chat/completions";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // 默认模型
        messages: [
          {
            role: "system",
            content: "你是一位专业的电信营销顾问，擅长快速成交。",
          },
          {
            role: "user",
            content: generatePrompt(request),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API错误: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const speech = data.choices?.[0]?.message?.content || "";

    if (!speech) {
      throw new Error("API返回内容为空");
    }

    return {
      success: true,
      speech: speech.trim(),
      provider: "vapi",
    };
  } catch (error) {
    return {
      success: false,
      speech: "",
      provider: "vapi",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 生成推荐话术（主函数）
 */
export async function generateSpeech(
  request: SpeechGenerationRequest
): Promise<SpeechGenerationResponse> {
  // 验证必要参数
  if (!request.apiKey) {
    return {
      success: false,
      speech: "",
      provider: request.apiProvider,
      error: "API密钥不能为空",
    };
  }

  if (!request.currentPlan || !request.recommendedPlan) {
    return {
      success: false,
      speech: "",
      provider: request.apiProvider,
      error: "套餐信息不完整",
    };
  }

  // 根据提供商调用相应API
  if (request.apiProvider === "siliconflow") {
    return generateWithSiliconFlow(request);
  } else if (request.apiProvider === "vapi") {
    return generateWithVAPI(request);
  } else {
    return {
      success: false,
      speech: "",
      provider: request.apiProvider,
      error: "不支持的API提供商",
    };
  }
}

/**
 * 生成本地模拟话术（用于测试或API不可用时）
 */
export function generateLocalSpeech(request: SpeechGenerationRequest): string {
  const templates = [
    `您好${request.phone}，我是${request.phone.slice(0, 3)}营业厅的营销顾问。根据您的使用情况，我们为您精心推荐了${request.recommendedPlan}套餐。这个套餐相比您现在的${request.currentPlan}，每月只需${request.recommendedPrice}元，但流量和通话时长都大幅提升到${request.recommendedDataGb}GB和${request.recommendedVoiceMin}分钟，完全满足您的使用需求，还能帮您节省不少费用。我们已经为您预留了这个套餐的名额，今天就可以帮您办理。您是方便我们上门为您办理，还是明天到营业厅直接办理呢？`,

    `您好，我是电信营销顾问。根据您最近三个月的使用数据分析，${request.recommendedPlan}套餐非常适合您。这个套餐${request.recommendedPrice}元/月，包含${request.recommendedDataGb}GB流量和${request.recommendedVoiceMin}分钟通话，${request.reason}。比您现在的套餐更划算，资源也更充足。我们现在就可以为您办理，不需要您跑腿。请告诉我您什么时间方便，我们立即上门为您办理。`,

    `您好${request.phone}，感谢您一直以来对电信的支持。根据您的消费数据，我们特别为您推荐了${request.recommendedPlan}套餐。这个套餐只需${request.recommendedPrice}元，却能提供${request.recommendedDataGb}GB流量和${request.recommendedVoiceMin}分钟通话，${request.reason}，是您目前最优的选择。我们现在就可以为您激活，您只需告诉我最近哪天方便，我们的工作人员会上门为您办理，全程免费。`,
  ];

  // 随机选择一个模板
  return templates[Math.floor(Math.random() * templates.length)];
}
