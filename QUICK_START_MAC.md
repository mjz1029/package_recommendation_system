# MacBook M系列 + JetBrains IDE 快速入门（5分钟）

如果您只想快速上手，按照以下步骤操作即可。详细说明请参考 `DEPLOYMENT_JETBRAINS_MAC.md`。

## 前置条件检查

```bash
# 打开终端，逐个运行以下命令验证环境

# 1. 检查 Mac 芯片（应输出 arm64）
uname -m

# 2. 检查 Node.js（应输出 v18.0.0 或更高）
node --version

# 3. 检查 npm
npm --version

# 4. 检查 pnpm（如未安装，运行：npm install -g pnpm）
pnpm --version
```

## 快速启动（5步）

### 步骤 1：获取项目文件

```bash
# 方案 A：从 Git 克隆
git clone <your-repo-url> ~/projects/package_recommendation_system

# 方案 B：手动下载后解压到 ~/projects/package_recommendation_system
```

### 步骤 2：打开 IDE

1. 启动 WebStorm 或 IntelliJ IDEA
2. 选择 **File → Open**
3. 选择项目文件夹：`~/projects/package_recommendation_system`
4. 点击 **Open**
5. 选择 **Trust Project**

### 步骤 3：安装依赖

在 IDE 的底部终端中运行：

```bash
cd ~/projects/package_recommendation_system
pnpm install
```

或右键点击 `package.json` → **Run 'pnpm install'**

### 步骤 4：启动开发服务器

在 IDE 终端中运行：

```bash
pnpm dev
```

您会看到类似的输出：
```
Server running on http://localhost:3000/
```

### 步骤 5：打开浏览器

在浏览器中访问：
```
http://localhost:3000
```

完成！🎉 系统已启动，您可以开始使用。

---

## 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 找不到 `pnpm` 命令 | 运行 `npm install -g pnpm` |
| 依赖安装失败 | 运行 `rm -rf node_modules && pnpm install` |
| 端口 3000 被占用 | 运行 `PORT=3001 pnpm dev` |
| 无法连接数据库 | 系统使用云端数据库，无需本地配置 |
| IDE 无法识别 TypeScript | 重启 IDE：**File → Invalidate Caches and Restart** |

---

## 下一步

- 📖 查看 `README.md` 了解系统功能
- 🔧 查看 `DEPLOYMENT_JETBRAINS_MAC.md` 了解详细配置
- 🧪 运行测试：`pnpm test`
- 📝 查看源代码：`client/src/pages/` 和 `server/`

---

## 需要帮助？

- 详细部署指南：`DEPLOYMENT_JETBRAINS_MAC.md`
- 系统功能说明：`README.md`
- 项目结构：`DEPLOYMENT_JETBRAINS_MAC.md` 中的"项目结构"部分
