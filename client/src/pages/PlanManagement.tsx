import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Trash2, Plus } from "lucide-react";

export default function PlanManagement() {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    dataGb: "",
    voiceMin: "",
    broadband: "",
    benefits: "",
    onShelf: 1,
  });

  const plansQuery = trpc.plans.list.useQuery();
  const createMutation = trpc.plans.create.useMutation({
    onSuccess: () => {
      plansQuery.refetch();
      setFormData({
        name: "",
        price: "",
        dataGb: "",
        voiceMin: "",
        broadband: "",
        benefits: "",
        onShelf: 1,
      });
      toast.success("套餐添加成功");
    },
    onError: () => {
      toast.error("套餐添加失败");
    },
  });

  const deleteMutation = trpc.plans.delete.useMutation({
    onSuccess: () => {
      plansQuery.refetch();
      toast.success("套餐删除成功");
    },
    onError: () => {
      toast.error("套餐删除失败");
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "onShelf" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.dataGb || !formData.voiceMin) {
      toast.error("请填写必填项");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      price: parseInt(formData.price),
      dataGb: parseInt(formData.dataGb),
      voiceMin: parseInt(formData.voiceMin),
      broadband: formData.broadband || undefined,
      benefits: formData.benefits || undefined,
      onShelf: formData.onShelf,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确认删除此套餐？")) {
      deleteMutation.mutate({ id });
    }
  };

  const plans = plansQuery.data || [];
  const onShelfCount = plans.filter(p => p.onShelf === 1).length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">套餐管理</h1>
            <p className="text-muted-foreground mt-2">
              在售套餐数：<span className="font-semibold">{onShelfCount}</span>
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">返回首页</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新增套餐
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">套餐名 *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="如：5G畅享套餐"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">资费（元/月） *</label>
                  <Input
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="如：99"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">流量（GB） *</label>
                  <Input
                    name="dataGb"
                    type="number"
                    value={formData.dataGb}
                    onChange={handleInputChange}
                    placeholder="如：30"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">通话（分钟） *</label>
                  <Input
                    name="voiceMin"
                    type="number"
                    value={formData.voiceMin}
                    onChange={handleInputChange}
                    placeholder="如：500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">宽带速率</label>
                  <Input
                    name="broadband"
                    value={formData.broadband}
                    onChange={handleInputChange}
                    placeholder="如：300M"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">附加权益</label>
                  <Input
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    placeholder="如：视频会员"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">是否在售</label>
                  <select
                    name="onShelf"
                    value={formData.onShelf}
                    onChange={e => setFormData(prev => ({ ...prev, onShelf: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value={1}>在售</option>
                    <option value={0}>下架</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "添加中..." : "添加套餐"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>套餐列表</CardTitle>
              </CardHeader>
              <CardContent>
                {plansQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无套餐，请先添加
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>套餐名</TableHead>
                          <TableHead>资费</TableHead>
                          <TableHead>流量</TableHead>
                          <TableHead>通话</TableHead>
                          <TableHead>宽带</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map(plan => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>{plan.price}元/月</TableCell>
                            <TableCell>{plan.dataGb}GB</TableCell>
                            <TableCell>{plan.voiceMin}分钟</TableCell>
                            <TableCell>{plan.broadband || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-sm ${
                                  plan.onShelf === 1
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {plan.onShelf === 1 ? "在售" : "下架"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(plan.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
