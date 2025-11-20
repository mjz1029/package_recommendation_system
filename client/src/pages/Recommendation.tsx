import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Upload, Download, Search } from "lucide-react";

interface RecommendationResult {
  phone: string;
  location: string;
  mainPlan: string;
  currentPrice: number;
  arpu: number;
  dataGb: number;
  voiceMin: number;
  hasBroadband?: number;
  recommendedPlanName: string;
  recommendedPrice: number;
  recommendedDataGb: number;
  recommendedVoiceMin: number;
  recommendedBroadband: string;
  recommendedBenefits: string;
  diff: number;
  reason: string;
  resourceRisk: boolean;
}

export default function Recommendation() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const recommendMutation = trpc.recommend.batch.useMutation({
    onSuccess: (data) => {
      setResults(data.items);
      // 保存 sessionId 到 localStorage
      localStorage.setItem("currentSessionId", data.sessionId);
      toast.success(`推荐完成，共${data.count}条记录。会话ID: ${data.sessionId.slice(0, 8)}...`);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(error.message || "推荐失败");
      setIsProcessing(false);
    },
  });

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast.error("请上传Excel文件（.xlsx或.xls）");
      return false;
    }
    setFile(selectedFile);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("请选择文件");
      return;
    }

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (!data) {
          toast.error("文件读取失败");
          setIsProcessing(false);
          return;
        }

        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          toast.error("Excel文件数据不足");
          setIsProcessing(false);
          return;
        }

        const users = (rows.slice(1) as any[][]).map((row: any[]) => {
          const mainPlan = String(row[2] || "");
          const hasBroadbandText = String(row[11] || "").trim();
          // 支持从Excel读取"是否有宽带"字段（是/否），如果没有则根据套餐名判断
          let hasBroadband = 0;
          if (hasBroadbandText === "是" || hasBroadbandText === "1") {
            hasBroadband = 1;
          } else if (hasBroadbandText === "否" || hasBroadbandText === "0") {
            hasBroadband = 0;
          } else if (!hasBroadbandText) {
            // 如果该字段为空，则根据套餐名称判断（向后兼容旧的Excel格式）
            hasBroadband = mainPlan.includes("家庭") || mainPlan.includes("全光") || mainPlan.includes("宽带") ? 1 : 0;
          }

          return {
            phone: String(row[0] || ""),
            location: String(row[1] || ""),
            mainPlan,
            currentPrice: parseInt(row[3]) || 0,
            arpu: parseInt(row[6]) || 0,
            dataGb: parseInt(row[7]) || 0,
            voiceMin: parseInt(row[8]) || 0,
            hasBroadband,
            broadbandSpeed: String(row[12] || ""), // 新增：宽带速率
            overage: parseInt(row[9]) || 0,
            overageRatio: parseFloat(row[10]) || 0,
            remarks: String(row[13] || ""), // 备注列移到第13列
          };
        });

        recommendMutation.mutate({ users });
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error("文件处理失败");
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    const headers = [
      "联系电话",
      "归属地",
      "当前套餐",
      "当前档位",
      "当前流量(GB)",
      "当前语音(分钟)",
      "当前宽带",
      "ARPU",
      "推荐套餐",
      "推荐资费",
      "推荐流量(GB)",
      "推荐语音(分钟)",
      "推荐宽带",
      "附加权益",
      "差值",
      "推荐理由",
      "资源风险",
    ];

    const rows = results.map(r => [
      r.phone,
      r.location,
      r.mainPlan,
      r.currentPrice,
      r.dataGb,
      r.voiceMin,
      r.hasBroadband ? "有" : "无",
      r.arpu,
      r.recommendedPlanName,
      r.recommendedPrice,
      r.recommendedDataGb,
      r.recommendedVoiceMin,
      r.recommendedBroadband || "无",
      r.recommendedBenefits || "无",
      r.diff,
      r.reason,
      r.resourceRisk ? "是" : "否",
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `推荐结果_${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("导出成功");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">推荐计算</h1>
            <p className="text-muted-foreground mt-2">
              上传用户清单Excel文件，系统自动计算推荐套餐
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">返回首页</Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传用户清单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-muted-foreground">
                    {file ? (
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm">点击更换文件或拖拽新文件到此处</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>点击选择Excel文件或拖拽文件到此处</p>
                        <p className="text-sm mt-2">支持 .xlsx 和 .xls 格式</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || isProcessing}
                className="w-full"
              >
                {isProcessing ? "处理中..." : "开始推荐"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>推荐结果（共{results.length}条）</CardTitle>
                <div className="flex gap-2">
                  <Link href="/query">
                    <Button variant="default">
                      <Search className="w-4 h-4 mr-2" />
                      精准查询
                    </Button>
                  </Link>
                  <Button onClick={handleExportCSV} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    导出CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>电话</TableHead>
                      <TableHead>归属地</TableHead>
                      <TableHead className="bg-slate-100">当前套餐</TableHead>
                      <TableHead className="bg-slate-100">档位</TableHead>
                      <TableHead className="bg-slate-100">流量(GB)</TableHead>
                      <TableHead className="bg-slate-100">语音(分钟)</TableHead>
                      <TableHead className="bg-slate-100">宽带</TableHead>
                      <TableHead>ARPU</TableHead>
                      <TableHead className="bg-green-50">推荐套餐</TableHead>
                      <TableHead className="bg-green-50">资费</TableHead>
                      <TableHead className="bg-green-50">流量(GB)</TableHead>
                      <TableHead className="bg-green-50">语音(分钟)</TableHead>
                      <TableHead className="bg-green-50">宽带</TableHead>
                      <TableHead className="bg-green-50">附加权益</TableHead>
                      <TableHead>推荐理由</TableHead>
                      <TableHead>资源风险</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{result.phone}</TableCell>
                        <TableCell>{result.location}</TableCell>
                        <TableCell className="bg-slate-50">{result.mainPlan}</TableCell>
                        <TableCell className="bg-slate-50">{result.currentPrice}元/月</TableCell>
                        <TableCell className="bg-slate-50">{result.dataGb}</TableCell>
                        <TableCell className="bg-slate-50">{result.voiceMin}</TableCell>
                        <TableCell className="bg-slate-50">{result.hasBroadband ? "有" : "无"}</TableCell>
                        <TableCell>{result.arpu}元</TableCell>
                        <TableCell className="font-medium bg-green-50">{result.recommendedPlanName}</TableCell>
                        <TableCell className="bg-green-50">{result.recommendedPrice}元/月</TableCell>
                        <TableCell className="bg-green-50">{result.recommendedDataGb}</TableCell>
                        <TableCell className="bg-green-50">{result.recommendedVoiceMin}</TableCell>
                        <TableCell className="bg-green-50">{result.recommendedBroadband || "无"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate bg-green-50" title={result.recommendedBenefits}>
                          {result.recommendedBenefits || "无"}
                        </TableCell>
                        <TableCell className="text-sm">{result.reason}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              result.resourceRisk
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {result.resourceRisk ? "是" : "否"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length === 0 && !isProcessing && (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              上传文件后，推荐结果将显示在此
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
