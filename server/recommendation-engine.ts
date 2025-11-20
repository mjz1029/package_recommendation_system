
/**
 * 推荐引擎核心业务逻辑
 * 实现基于价格档位和资源匹配的套餐推荐
 * 支持多套餐推荐和套餐分类（个人版/家庭版/全光版）
 */

export type PlanType = "personal" | "family" | "fttr";

export interface Plan {
  id: number;
  name: string;
  price: number;
  dataGb: number;
  voiceMin: number;
  broadband?: string | null;
  benefits?: string | null;
  planType: PlanType;
  hasBroadband: number;
  onShelf: number;
}

export interface UserData {
  phone: string;
  location: string;
  mainPlan: string;
  currentPrice: number;
  arpu: number;
  dataGb: number;
  voiceMin: number;
  hasBroadband?: number; // 用户当前是否有宽带
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
  matchScore: number; // 匹配度评分(0-100)
  reason: string;
  resourceRisk: boolean;
}

export interface MultiRecommendationResult {
  userInfo: UserData;
  recommendations: RecommendationResult[]; // 1-3个推荐套餐
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

  // diff > 50: 推荐低于ARPU三档的价位
  // 找到小于等于ARPU的最大价位索引
  let maxPriceIdx = -1;
  for (let i = priceTiers.length - 1; i >= 0; i--) {
    if (priceTiers[i] <= arpu) {
      maxPriceIdx = i;
      break;
    }
  }

  // 如果所有价位都高于ARPU，选择最低价位
  if (maxPriceIdx === -1) {
    return priceTiers[0];
  }

  // 选择低于ARPU三档的价位（即 maxPriceIdx - 3）
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
 * 计算匹配度评分(0-100)
 * 基于资源满足度和价格合理性
 */
function calculateMatchScore(
  plan: Plan,
  userData: UserData,
  targetPrice: number
): number {
  let score = 100;

  // 资源满足度评分
  const dataMatch = Math.min(1, plan.dataGb / userData.dataGb);
  const voiceMatch = Math.min(1, plan.voiceMin / userData.voiceMin);
  const resourceScore = (dataMatch + voiceMatch) / 2 * 50; // 50分

  // 价格合理性评分
  const priceDiff = Math.abs(plan.price - targetPrice);
  const priceScore = Math.max(0, 50 - priceDiff / 2); // 50分

  score = resourceScore + priceScore;

  return Math.round(score);
}

/**
 * 根据套餐类型和用户需求筛选候选套餐
 */
function filterCandidatesByType(
  candidates: Plan[],
  userData: UserData
): Plan[] {
  // 如果用户当前有宽带，优先推荐有宽带的套餐
  if (userData.hasBroadband === 1) {
    const broadbandPlans = candidates.filter(p => p.hasBroadband === 1);
    return broadbandPlans.length > 0 ? broadbandPlans : candidates;
  }

  // 如果用户没有宽带，可以推荐所有套餐，但优先级：个人版 > 家庭版 > 全光版
  return candidates.sort((a, b) => {
    const typeOrder = { personal: 0, family: 1, fttr: 2 };
    return typeOrder[a.planType] - typeOrder[b.planType];
  });
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
 * 核心推荐函数（单套餐）
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

  console.log(`[推荐引擎] 用户 ${userData.phone}:`, {
    currentPrice: userData.currentPrice,
    arpu: userData.arpu,
    diff,
    dataGb: userData.dataGb,
    voiceMin: userData.voiceMin,
    hasBroadband: userData.hasBroadband,
    priceTiers,
  });

  const targetPrice = selectTargetPrice(
    diff,
    userData.currentPrice,
    userData.arpu,
    priceTiers
  );

  console.log(`[推荐引擎] 目标价位: ${targetPrice}元`);

  let candidates = allPlans.filter(
    p => p.onShelf === 1 && p.price === targetPrice
  );

  if (candidates.length === 0) {
    const closestPrice = findClosestPrice(targetPrice, priceTiers);
    candidates = allPlans.filter(
      p => p.onShelf === 1 && p.price === closestPrice
    );
  }

  // 根据用户宽带需求筛选
  candidates = filterCandidatesByType(candidates, userData);

  console.log(`[推荐引擎] 候选套餐数: ${candidates.length}`, candidates.map(c => `${c.name}(${c.price}元)`));

  const { plan: selectedPlan, resourceRisk } = selectBestPlan(candidates, userData);

  console.log(`[推荐引擎] 最终推荐: ${selectedPlan.name}(${selectedPlan.price}元), 资源风险: ${resourceRisk}`);

  const reason = generateReason(diff, targetPrice, resourceRisk, userData.currentPrice);
  const matchScore = calculateMatchScore(selectedPlan, userData, targetPrice);

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
    matchScore,
    reason,
    resourceRisk,
  };
}

/**
 * 多套餐推荐函数（返回1-3个最优套餐）
 */
export function recommendMultiple(
  userData: UserData,
  allPlans: Plan[],
  count: number = 3
): RecommendationResult[] {
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

  // 获取目标价位的候选套餐
  let candidates = allPlans.filter(
    p => p.onShelf === 1 && p.price === targetPrice
  );

  if (candidates.length === 0) {
    const closestPrice = findClosestPrice(targetPrice, priceTiers);
    candidates = allPlans.filter(
      p => p.onShelf === 1 && p.price === closestPrice
    );
  }

  // 根据用户宽带需求筛选
  candidates = filterCandidatesByType(candidates, userData);

  // 计算每个候选套餐的匹配度评分
  const scored = candidates.map(plan => ({
    plan,
    matchScore: calculateMatchScore(plan, userData, targetPrice),
    resourceRisk: !(plan.dataGb >= userData.dataGb && plan.voiceMin >= userData.voiceMin),
  }));

  // 按匹配度排序（从高到低）
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // 返回前N个推荐
  const recommendations = scored.slice(0, Math.min(count, scored.length)).map(({ plan, matchScore, resourceRisk }) => {
    const reason = generateReason(diff, targetPrice, resourceRisk, userData.currentPrice);

    return {
      ...userData,
      recommendedPlanId: plan.id,
      recommendedPlanName: plan.name,
      recommendedPrice: plan.price,
      recommendedDataGb: plan.dataGb,
      recommendedVoiceMin: plan.voiceMin,
      recommendedBroadband: plan.broadband || '',
      recommendedBenefits: plan.benefits || '',
      targetPrice,
      diff,
      matchScore,
      reason,
      resourceRisk,
    };
  });

  return recommendations;
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
        matchScore: 0,
        reason: '推荐失败',
        resourceRisk: false,
      };
    }
  });
}

export { cleanValue };
