import type { Plan } from "../drizzle/schema";

/**
 * 推荐引擎核心业务逻辑
 * 实现基于价格档位和资源匹配的套餐推荐
 */

export interface UserData {
  phone: string;
  location: string;
  mainPlan: string;
  currentPrice: number;
  arpu: number;
  dataGb: number;
  voiceMin: number;
  overage?: number;
  overageRatio?: number;
  remarks?: string;
}

export interface RecommendationResult extends UserData {
  recommendedPlanId: number;
  recommendedPlanName: string;
  recommendedPrice: number;
  recommendedDataGb: number;
  recommendedVoiceMin: number;
  recommendedBroadband: string;
  recommendedBenefits: string;
  targetPrice: number;
  diff: number;
  reason: string;
  resourceRisk: boolean;
}

/**
 * 数据清洗：处理特殊值
 */
function cleanValue(value: any, type: 'number' | 'percentage' = 'number'): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  const str = String(value).trim();

  if (str === '不限' || str === '∞') {
    return 1e9;
  }

  if (type === 'percentage' && str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? 0 : num / 100;
  }

  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * 从在售套餐列表生成价阶数组
 */
export function generatePriceTiers(plans: Plan[]): number[] {
  const onShelfPlans = plans.filter(p => p.onShelf === 1);
  const prices = new Set(onShelfPlans.map(p => p.price));
  return Array.from(prices).sort((a, b) => a - b);
}

/**
 * 根据diff值选择目标价位
 */
function selectTargetPrice(
  diff: number,
  currentPrice: number,
  arpu: number,
  priceTiers: number[]
): number {
  if (priceTiers.length === 0) {
    throw new Error('No price tiers available');
  }

  if (diff <= 10) {
    if (priceTiers.includes(currentPrice)) {
      return currentPrice;
    }
    return findClosestPrice(currentPrice, priceTiers);
  }

  if (diff <= 50) {
    const currentIdx = priceTiers.findIndex(p => p >= currentPrice);
    if (currentIdx === -1 || currentIdx === priceTiers.length - 1) {
      return priceTiers[priceTiers.length - 1];
    }
    return priceTiers[currentIdx + 1];
  }

  const maxPriceIdx = priceTiers.findIndex(p => p > arpu) - 1;
  const targetIdx = Math.max(0, maxPriceIdx - 3);
  return priceTiers[targetIdx];
}

/**
 * 找到最接近的价位
 */
function findClosestPrice(price: number, priceTiers: number[]): number {
  let closest = priceTiers[0];
  let minDiff = Math.abs(price - closest);

  for (const tier of priceTiers) {
    const diff = Math.abs(price - tier);
    if (diff < minDiff) {
      minDiff = diff;
      closest = tier;
    }
  }

  return closest;
}

/**
 * 计算资源剩余分数
 */
function calculateSurplusScore(plan: Plan, userData: UserData): number {
  const dataSurplus = Math.max(0, plan.dataGb - userData.dataGb);
  const voiceSurplus = Math.max(0, plan.voiceMin - userData.voiceMin);
  return dataSurplus + voiceSurplus / 100;
}

/**
 * 计算拟合分数
 */
function calculateFitScore(plan: Plan, userData: UserData): number {
  const dataGap = Math.max(0, userData.dataGb - plan.dataGb);
  const voiceGap = Math.max(0, userData.voiceMin - plan.voiceMin);
  const dataSurplus = Math.max(0, plan.dataGb - userData.dataGb);
  const voiceSurplus = Math.max(0, plan.voiceMin - userData.voiceMin);

  return dataGap * 1000 + voiceGap * 10 + dataSurplus + voiceSurplus / 100;
}

/**
 * 从候选套餐中选择最佳推荐
 */
function selectBestPlan(
  candidates: Plan[],
  userData: UserData
): { plan: Plan; resourceRisk: boolean } {
  if (candidates.length === 0) {
    throw new Error('No candidate plans available');
  }

  const resourceSatisfied = candidates.filter(
    p => p.dataGb >= userData.dataGb && p.voiceMin >= userData.voiceMin
  );

  if (resourceSatisfied.length > 0) {
    const best = resourceSatisfied.reduce((prev, curr) => {
      const prevScore = calculateSurplusScore(prev, userData);
      const currScore = calculateSurplusScore(curr, userData);
      return currScore < prevScore ? curr : prev;
    });
    return { plan: best, resourceRisk: false };
  }

  const best = candidates.reduce((prev, curr) => {
    const prevScore = calculateFitScore(prev, userData);
    const currScore = calculateFitScore(curr, userData);
    return currScore < prevScore ? curr : prev;
  });

  return { plan: best, resourceRisk: true };
}

/**
 * 生成推荐理由
 */
function generateReason(
  diff: number,
  targetPrice: number,
  resourceRisk: boolean,
  currentPrice: number
): string {
  let reason = '';

  if (diff <= 10) {
    reason = '相近档位';
  } else if (diff <= 50) {
    reason = '高一档';
  } else {
    reason = `低于ARPU三档（目标价位${targetPrice}元）`;
  }

  if (resourceRisk) {
    reason += ' + 资源可能不足';
  } else {
    reason += ' + 资源匹配';
  }

  return reason;
}

/**
 * 核心推荐函数
 */
export function recommend(
  userData: UserData,
  allPlans: Plan[]
): RecommendationResult {
  const priceTiers = generatePriceTiers(allPlans);

  if (priceTiers.length === 0) {
    throw new Error('No on-shelf plans available');
  }

  const diff = userData.arpu - userData.currentPrice;

  const targetPrice = selectTargetPrice(
    diff,
    userData.currentPrice,
    userData.arpu,
    priceTiers
  );

  let candidates = allPlans.filter(
    p => p.onShelf === 1 && p.price === targetPrice
  );

  if (candidates.length === 0) {
    const closestPrice = findClosestPrice(targetPrice, priceTiers);
    candidates = allPlans.filter(
      p => p.onShelf === 1 && p.price === closestPrice
    );
  }

  const { plan: selectedPlan, resourceRisk } = selectBestPlan(candidates, userData);

  const reason = generateReason(diff, targetPrice, resourceRisk, userData.currentPrice);

  return {
    ...userData,
    recommendedPlanId: selectedPlan.id,
    recommendedPlanName: selectedPlan.name,
    recommendedPrice: selectedPlan.price,
    recommendedDataGb: selectedPlan.dataGb,
    recommendedVoiceMin: selectedPlan.voiceMin,
    recommendedBroadband: selectedPlan.broadband || '',
    recommendedBenefits: selectedPlan.benefits || '',
    targetPrice,
    diff,
    reason,
    resourceRisk,
  };
}

/**
 * 批量推荐
 */
export function recommendBatch(
  userDataList: UserData[],
  allPlans: Plan[]
): RecommendationResult[] {
  return userDataList.map(userData => {
    try {
      return recommend(userData, allPlans);
    } catch (error) {
      console.error('Recommendation error for user:', userData.phone, error);
      return {
        ...userData,
        recommendedPlanId: 0,
        recommendedPlanName: '无可推荐',
        recommendedPrice: 0,
        recommendedDataGb: 0,
        recommendedVoiceMin: 0,
        recommendedBroadband: '',
        recommendedBenefits: '',
        targetPrice: 0,
        diff: 0,
        reason: '推荐失败',
        resourceRisk: false,
      };
    }
  });
}

export { cleanValue };
