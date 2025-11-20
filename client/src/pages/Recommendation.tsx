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
import { Link } from "wouter";
import { Upload, Download } from "lucide-react";

interface RecommendationResult {
  phone: string;
  location: string;
  mainPlan: string;
  currentPrice: number;
  arpu: number;
  dataGb: number;
  voiceMin: number;
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

  const recommendMutation = trpc.recommend.batch.useMutation({
    onSuccess: (data) => {
      setResults(data.items);
      toast.success(`推荐完成，共${data.count}条记录`);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(error.message || "推荐失败");
      setIsProcessing(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error("请上传Excel文件（.xlsx或.xls）");
        return;
      }
      setFile(selectedFile);
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

        const users = (rows.slice(1) as any[][]).map((row: any[]) => ({
          phone: String(row[0] || ""),
          location: String(row[1] || ""),
          mainPlan: String(row[2] || ""),
          currentPrice: parseInt(row[3]) || 0,
          arpu: parseInt(row[6]) || 0,
          dataGb: parseInt(row[7]) || 0,
          voiceMin: parseInt(row[8]) || 0,
          overage: parseInt(row[9]) || 0,
          overageRatio: parseFloat(row[10]) || 0,
          remarks: String(row[11] || ""),
        }));

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
      "主套餐",
      "当前档位",
      "ARPU",
      "用户流量",
      "用户通话",
      "推荐套餐",
      "推荐资费",
      "推荐流量",
      "推荐通话",
      "宽带速率",
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
      r.arpu,
      r.dataGb,
      r.voiceMin,
      r.recommendedPlanName,
      r.recommendedPrice,
      r.recommendedDataGb,
      r.recommendedVoiceMin,
      r.recommendedBroadband,
      r.recommendedBenefits,
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
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
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
                        <p className="text-sm">点击更换文件</p>
                      </div>
                    ) : (
                      <div>
                        <p>点击选择Excel文件或拖拽文件到此处</p>
                        <p className="text-sm">支持 .xlsx 和 .xls 格式</p>
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
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  导出CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>电话</TableHead>
                      <TableHead>归属地</TableHead>
                      <TableHead>当前套餐</TableHead>
                      <TableHead>ARPU</TableHead>
                      <TableHead>推荐套餐</TableHead>
                      <TableHead>推荐资费</TableHead>
                      <TableHead>推荐理由</TableHead>
                      <TableHead>资源风险</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{result.phone}</TableCell>
                        <TableCell>{result.location}</TableCell>
                        <TableCell>{result.mainPlan}</TableCell>
                        <TableCell>{result.arpu}元</TableCell>
                        <TableCell className="font-medium">{result.recommendedPlanName}</TableCell>
                        <TableCell>{result.recommendedPrice}元/月</TableCell>
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
