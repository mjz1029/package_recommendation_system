import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Phone, MapPin, Zap, MessageSquare, Copy, Check, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";

interface QueryRecommendationPageProps {
  sessionId?: string;
}

export default function QueryRecommendation({ sessionId = "" }: QueryRecommendationPageProps) {
  const [location] = useLocation();
  const [phone, setPhone] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isFromRecommendPage, setIsFromRecommendPage] = useState(false);

  // 从 localStorage 读取 sessionId 和从 URL 读取手机号
  useEffect(() => {
    const savedSessionId = localStorage.getItem("currentSessionId");
    if (savedSessionId && !sessionId) {
      setCurrentSessionId(savedSessionId);
    }

    // 从 URL 参数读取手机号
    const urlParams = new URLSearchParams(window.location.search);
    const phoneFromUrl = urlParams.get("phone");
    if (phoneFromUrl) {
      setPhone(phoneFromUrl);
      setIsFromRecommendPage(true); // 标记为从推荐页面跳转过来
      // 自动触发查询
      if (savedSessionId) {
        setIsLoading(true);
        setTimeout(() => {
          queryMutation.refetch().finally(() => setIsLoading(false));
        }, 100);
      }
    }
  }, [sessionId, location]);

  const queryMutation = trpc.recommend.queryByPhone.useQuery(
    { sessionId: currentSessionId, phone },
    {
      enabled: false,
      retry: false,
    }
  );

  const speechMutation = trpc.speechGeneration.generate.useMutation();

  const handleQuery = async () => {
    if (!phone.match(/^\d{11}$/)) {
      alert("请输入正确的11位手机号");
      return;
    }

    if (!currentSessionId) {
      alert("请先上传用户信息");
      return;
    }

    setIsLoading(true);
    try {
      const result = await queryMutation.refetch();
      if (result.error) {
        alert(result.error.message || "查询失败");
      }
    } catch (error: any) {
      alert(error.message || "查询失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuery();
    }
  };

  const handleGenerateSpeech = async (index: number, rec: any) => {
    try {
      const result = await speechMutation.mutateAsync({
        phone,
        currentPlan: queryMutation.data?.userInfo.currentPlan || "",
        recommendedPlan: rec.recommendedPlanName,
        recommendedPrice: rec.recommendedPrice,
        recommendedDataGb: rec.recommendedDataGb,
        recommendedVoiceMin: rec.recommendedVoiceMin,
        reason: rec.reason,
        apiProvider: "local",
      });

      if (result.success) {
        // 显示话术生成结果
        const message = `【${rec.recommendedPlanName}推荐话术】\n\n${result.speech}\n\n[来源: ${result.provider}]`;
        alert(message);
      }
    } catch (error: any) {
      alert("话术生成失败：" + (error.message || "未知错误"));
    }
  };

  const handleCopySpeech = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getPlanTypeLabel = (planType: string) => {
    const labels: Record<string, string> = {
      personal: "个人版",
      family: "家庭版",
      fttr: "全光版",
    };
    return labels[planType] || planType;
  };

  const getPlanTypeColor = (planType: string) => {
    const colors: Record<string, string> = {
      personal: "bg-blue-100 text-blue-800",
      family: "bg-green-100 text-green-800",
      fttr: "bg-purple-100 text-purple-800",
    };
    return colors[planType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">用户精准套餐推荐查询</h1>
              <p className="text-slate-600">输入手机号快速查询推荐套餐，支持多套餐推荐和AI话术生成</p>
            </div>
            <div className="flex gap-2">
              {isFromRecommendPage ? (
                <Link href="/recommend">
                  <Button variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回推荐结果
                  </Button>
                </Link>
              ) : (
                <Link href="/">
                  <Button variant="outline" size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回首页
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 查询区域 */}
        <Card className="mb-8 p-6 shadow-lg">
          <div className="space-y-4">
            {!currentSessionId && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  请先在"推荐计算"页面上传用户信息，获取会话ID
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="请输入11位手机号（如13800138000）"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                onKeyPress={handleKeyPress}
                className="flex-1 text-lg"
                maxLength={11}
              />
              <Button
                onClick={handleQuery}
                disabled={isLoading || !currentSessionId}
                className="px-8"
                size="lg"
              >
                {isLoading ? "查询中..." : "查询"}
              </Button>
            </div>

            {currentSessionId && (
              <p className="text-sm text-slate-500">
                当前会话ID: <code className="bg-slate-100 px-2 py-1 rounded">{currentSessionId.slice(0, 8)}...</code>
              </p>
            )}
          </div>
        </Card>

        {/* 查询结果 */}
        {queryMutation.data && (
          <div className="space-y-6">
            {/* 用户信息卡片 */}
            <Card className="p-6 shadow-lg border-l-4 border-l-blue-500">
              <h2 className="text-xl font-bold text-slate-900 mb-4">用户基础信息</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">手机号</p>
                    <p className="font-semibold">{queryMutation.data.userInfo.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">归属地</p>
                    <p className="font-semibold">{queryMutation.data.userInfo.location || "未知"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">当前套餐</p>
                  <p className="font-semibold">{queryMutation.data.userInfo.currentPlan}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">当前档位</p>
                  <p className="font-semibold text-blue-600">{queryMutation.data.userInfo.currentPrice}元/月</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">当前流量</p>
                  <p className="font-semibold">{queryMutation.data.userInfo.dataGb}GB</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">当前语音</p>
                  <p className="font-semibold">{queryMutation.data.userInfo.voiceMin}分钟</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">近三月ARPU</p>
                  <p className="font-semibold text-green-600">{queryMutation.data.userInfo.arpu}元</p>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-slate-500">宽带</p>
                    <p className="font-semibold">
                      {queryMutation.data.userInfo.hasBroadband ? "有" : "无"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 推荐套餐列表 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">推荐套餐（按匹配度排序）</h2>
              <div className="space-y-4">
                {queryMutation.data.recommendations.map((rec, index) => (
                  <Card key={index} className="p-6 shadow-md hover:shadow-lg transition-shadow">
                    {/* 套餐头部 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{rec.recommendedPlanName}</h3>
                          <Badge className={getPlanTypeColor(rec.recommendedPrice > 100 ? "fttr" : rec.recommendedPrice > 60 ? "family" : "personal")}>
                            {getPlanTypeLabel(rec.recommendedPrice > 100 ? "fttr" : rec.recommendedPrice > 60 ? "family" : "personal")}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{rec.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{rec.recommendedPrice}元</p>
                        <p className="text-xs text-slate-500">/月</p>
                      </div>
                    </div>

                    {/* 套餐详情 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500">流量</p>
                        <p className="font-semibold">{rec.recommendedDataGb}GB</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">通话</p>
                        <p className="font-semibold">{rec.recommendedVoiceMin}分钟</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">宽带</p>
                        <p className="font-semibold">{rec.recommendedBroadband || "无"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">匹配度</p>
                        <p className="font-semibold text-blue-600">{rec.matchScore}分</p>
                      </div>
                    </div>

                    {/* 附加权益 */}
                    {rec.recommendedBenefits && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-700 font-medium mb-1">附加权益</p>
                        <p className="text-sm text-amber-900">{rec.recommendedBenefits}</p>
                      </div>
                    )}

                    {/* 风险提示 */}
                    {rec.resourceRisk && (
                      <Alert className="mb-4 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          ⚠️ 资源可能不足：该套餐的流量或通话可能无法完全满足用户需求
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSpeech(index, rec)}
                        disabled={speechMutation.isPending}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {speechMutation.isPending ? "生成中..." : "生成推荐话术"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 统计信息 */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                ℹ️ 为该用户推荐了 <strong>{queryMutation.data.recommendations.length}</strong> 个套餐，
                最高匹配度为 <strong>{Math.max(...queryMutation.data.recommendations.map((r: any) => r.matchScore))}分</strong>
              </p>
            </Card>
          </div>
        )}

        {/* 空状态 */}
        {!queryMutation.isLoading && !queryMutation.data && queryMutation.isError && (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">查询失败</h3>
            <p className="text-slate-600">
              {queryMutation.error?.message || "未找到该用户的推荐数据，请检查手机号是否正确"}
            </p>
          </Card>
        )}

        {queryMutation.isLoading && (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600">正在查询用户信息...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
