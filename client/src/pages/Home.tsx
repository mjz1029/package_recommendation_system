import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, BarChart3, FileText, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">存量用户套餐推荐系统</h1>
          <p className="text-xl text-muted-foreground mb-8">
            基于用户画像的智能套餐推荐，助力精准营销
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/plans">
              <Button size="lg">管理套餐</Button>
            </Link>
            <Link href="/recommend">
              <Button size="lg" variant="outline">
                开始推荐
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Package className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>套餐管理</CardTitle>
              <CardDescription>维护套餐目录</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                在网页中新增、编辑、删除套餐信息，实时更新套餐目录数据库
              </p>
              <Link href="/plans">
                <Button variant="outline" className="w-full">
                  进入管理
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>推荐计算</CardTitle>
              <CardDescription>智能推荐套餐</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                上传用户清单Excel文件，系统根据ARPU和资源需求自动推荐最优套餐
              </p>
              <Link href="/recommend">
                <Button variant="outline" className="w-full">
                  开始推荐
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle>结果导出</CardTitle>
              <CardDescription>导出推荐结果</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                推荐完成后，可将结果导出为CSV文件，方便后续分析和使用
              </p>
              <Button variant="outline" className="w-full" disabled>
                功能说明
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="w-8 h-8 text-orange-600 mb-2" />
              <CardTitle>精准查询</CardTitle>
              <CardDescription>单用户推荐查询</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                输入手机号快速查询用户的推荐套餐，支持多套餐推荐和AI话术生成
              </p>
              <Link href="/query">
                <Button variant="outline" className="w-full">
                  进入查询
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>系统说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">推荐规则</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• 差值 ≤ 10：推荐相近档位套餐</li>
                <li>• 差值 10-50：推荐高一档套餐</li>
                <li>• 差值 &gt;50：推荐低于ARPU三档套餐</li>
                <li>• 优先匹配流量和通话资源充足的套餐</li>
                <li>• 根据用户宽带需求推荐对应类型套餐（个人版/家庭版/全光版）</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Excel格式要求</h3>
              <p className="text-sm text-muted-foreground">
                首行为表头：联系电话、归属地、主套餐、档位、流量饱和度、语音饱和度、近三个月ARPU、流量、通话、超套金额、超套比例、是否有宽带、宽带速率、备注
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                其中"是否有宽带"填写：是/否，"宽带速率"填写：300/500/1000/2000（单位M）或留空
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">新增功能</h3>
              <p className="text-sm text-muted-foreground">
                支持基于手机号的精准查询、多套餐推荐（1-3个）、匹配度评分、AI推荐话术生成
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
