# MacBook M系列芯片 + JetBrains IDE 部署指南

本文档详细说明如何在 MacBook M1/M2/M3 系列芯片上通过 JetBrains IDE（WebStorm、IntelliJ IDEA 等）部署和运行存量用户套餐推荐系统。

## 目录

1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [项目导入](#项目导入)
4. [数据库配置](#数据库配置)
5. [开发服务器运行](#开发服务器运行)
6. [调试和测试](#调试和测试)
7. [常见问题](#常见问题)
8. [性能优化](#性能优化)

---

## 系统要求

### 硬件要求

| 项目 | 要求 |
|------|------|
| Mac 芯片 | M1、M2、M3 或更新版本 |
| 内存 | 最少 8GB（推荐 16GB 或以上） |
| 磁盘空间 | 最少 20GB 可用空间 |
| 网络 | 稳定的互联网连接 |

### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| macOS | 12.0+ | Big Sur 或更新版本 |
| JetBrains IDE | 2023.1+ | WebStorm、IntelliJ IDEA、PhpStorm 等 |
| Node.js | 18.0+ | 必须是 ARM64 版本（M系列原生支持） |
| pnpm | 8.0+ | 包管理器 |
| Git | 2.30+ | 版本控制 |
| Docker（可选） | 最新版本 | 用于数据库容器化 |

---

## 环境准备

### 第1步：验证 Mac 芯片架构

打开终端，确认您的 Mac 是 M 系列芯片：

```bash
# 查看 CPU 架构
uname -m

# 输出应为：arm64
```

### 第2步：安装 Homebrew（如未安装）

Homebrew 是 Mac 上的包管理器，用于安装开发工具。

```bash
# 安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 验证安装
brew --version
```

### 第3步：安装 Node.js（ARM64 版本）

**重要**：必须安装 ARM64 版本，以获得最佳性能。

**方法 A：使用 Homebrew（推荐）**

```bash
# 安装最新 LTS 版本的 Node.js
brew install node

# 验证安装
node --version
npm --version

# 检查架构（应输出 arm64）
node -p "process.arch"
```

**方法 B：使用 nvm（Node Version Manager）**

如果需要管理多个 Node 版本：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell 配置
source ~/.zshrc  # 或 ~/.bash_profile

# 安装 Node.js 18+
nvm install 18

# 使用指定版本
nvm use 18

# 验证
node --version
```

### 第4步：安装 pnpm

pnpm 是一个高效的包管理器，项目使用它来管理依赖。

```bash
# 使用 npm 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version

# 配置 pnpm（可选但推荐）
pnpm config set auto-install-peers true
pnpm config set shamefully-hoist true
```

### 第5步：安装 Git（如未安装）

```bash
# 使用 Homebrew 安装
brew install git

# 验证安装
git --version

# 配置 Git（首次使用）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 第6步：安装 JetBrains IDE

根据您的需求选择合适的 IDE：

**WebStorm（推荐用于前端开发）**
```bash
brew install --cask webstorm
```

**IntelliJ IDEA Community Edition（推荐用于全栈开发）**
```bash
brew install --cask intellij-idea-ce
```

**IntelliJ IDEA Ultimate（付费版，功能更全）**
```bash
brew install --cask intellij-idea
```

安装完成后，从 Applications 文件夹启动 IDE。

### 第7步：安装 MySQL（可选，用于本地数据库）

如果您想在本地运行数据库而不是使用云端数据库：

**方法 A：使用 Homebrew**

```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 验证安装
mysql --version

# 连接到 MySQL（默认无密码）
mysql -u root
```

**方法 B：使用 Docker**

```bash
# 安装 Docker Desktop for Mac（支持 M 系列）
brew install --cask docker

# 启动 Docker Desktop

# 运行 MySQL 容器
docker run --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=package_recommendation \
  -p 3306:3306 \
  -d mysql:8.0-arm64

# 验证容器运行
docker ps
```

### 第8步：验证环境

创建一个测试脚本来验证所有工具都已正确安装：

```bash
# 创建验证脚本
cat > ~/verify_env.sh << 'EOF'
#!/bin/bash

echo "=== 环境验证 ==="
echo ""

echo "1. 检查 Mac 芯片架构"
echo "   架构: $(uname -m)"
echo ""

echo "2. 检查 Node.js"
echo "   版本: $(node --version)"
echo "   架构: $(node -p 'process.arch')"
echo ""

echo "3. 检查 npm"
echo "   版本: $(npm --version)"
echo ""

echo "4. 检查 pnpm"
echo "   版本: $(pnpm --version)"
echo ""

echo "5. 检查 Git"
echo "   版本: $(git --version)"
echo ""

echo "6. 检查 MySQL（如已安装）"
if command -v mysql &> /dev/null; then
    echo "   版本: $(mysql --version)"
else
    echo "   未安装（可选）"
fi
echo ""

echo "7. 检查 Docker（如已安装）"
if command -v docker &> /dev/null; then
    echo "   版本: $(docker --version)"
else
    echo "   未安装（可选）"
fi
echo ""

echo "✅ 环境验证完成"
EOF

# 运行验证脚本
chmod +x ~/verify_env.sh
~/verify_env.sh
```

---

## 项目导入

### 第1步：获取项目文件

**选项 A：从 Git 克隆（如果项目在 Git 仓库）**

```bash
# 克隆项目到本地
git clone <your-repo-url> ~/projects/package_recommendation_system

# 进入项目目录
cd ~/projects/package_recommendation_system
```

**选项 B：从 Manus 平台下载**

1. 访问 Manus 管理面板
2. 找到 `package_recommendation_system` 项目
3. 点击"Code"面板中的"Download all files"
4. 解压到本地目录，例如 `~/projects/package_recommendation_system`

### 第2步：在 JetBrains IDE 中打开项目

**使用 WebStorm：**

1. 启动 WebStorm
2. 选择 **File → Open**
3. 导航到项目目录 `~/projects/package_recommendation_system`
4. 点击 **Open**
5. 选择 **Trust Project**（信任项目）

**使用 IntelliJ IDEA：**

1. 启动 IntelliJ IDEA
2. 选择 **File → Open**
3. 导航到项目目录
4. 点击 **Open**
5. 选择 **Trust Project**

### 第3步：配置项目 SDK

IDE 会自动检测 Node.js，但您可以手动配置以确保使用正确版本：

**在 WebStorm 中：**

1. 打开 **WebStorm → Preferences**（或 **Cmd + ,**）
2. 导航到 **Languages & Frameworks → Node.js**
3. 确保 **Node interpreter** 指向您安装的 Node.js
   - 应该是 `/usr/local/bin/node`（Homebrew）或 `~/.nvm/versions/node/v18.x.x/bin/node`（nvm）
4. 点击 **Apply** 和 **OK**

**在 IntelliJ IDEA 中：**

1. 打开 **IntelliJ IDEA → Preferences**
2. 导航到 **Languages & Frameworks → Node.js**
3. 设置 Node interpreter 和 Package manager（pnpm）
4. 点击 **Apply** 和 **OK**

### 第4步：安装项目依赖

在 IDE 的终端中运行：

```bash
# 进入项目目录
cd ~/projects/package_recommendation_system

# 安装依赖
pnpm install

# 验证安装
pnpm list
```

或者使用 IDE 的内置包管理工具：

- **WebStorm**：右键点击 `package.json` → **Run 'pnpm install'**
- **IntelliJ IDEA**：右键点击 `package.json` → **Run 'pnpm install'**

---

## 数据库配置

### 方案 A：使用 Manus 云端数据库（推荐用于开发）

项目已配置使用 Manus 平台提供的云端数据库。环境变量已自动注入，无需额外配置。

### 方案 B：本地 MySQL 数据库

如果您想使用本地数据库进行开发：

#### 步骤 1：创建数据库和用户

```bash
# 连接到 MySQL
mysql -u root -p

# 输入密码（如果设置了）
```

在 MySQL 提示符中执行：

```sql
-- 创建数据库
CREATE DATABASE package_recommendation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'dev_user'@'localhost' IDENTIFIED BY 'dev_password';

-- 授予权限
GRANT ALL PRIVILEGES ON package_recommendation.* TO 'dev_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

#### 步骤 2：配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 创建 .env.local
cat > ~/projects/package_recommendation_system/.env.local << 'EOF'
# 数据库连接字符串
DATABASE_URL="mysql://dev_user:dev_password@localhost:3306/package_recommendation"

# JWT 密钥（用于会话管理）
JWT_SECRET="your-secret-key-change-this-in-production"

# OAuth 配置（如果使用 Manus OAuth）
VITE_APP_ID="your-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im"

# 其他配置
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your-open-id"
VITE_APP_TITLE="存量用户套餐推荐系统"
EOF
```

#### 步骤 3：运行数据库迁移

```bash
# 进入项目目录
cd ~/projects/package_recommendation_system

# 生成 Drizzle 迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 或一步到位
pnpm db:push
```

### 方案 C：使用 Docker 运行 MySQL

```bash
# 启动 MySQL 容器
docker run --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=package_recommendation \
  -p 3306:3306 \
  -d mysql:8.0-arm64

# 等待容器启动（约 10 秒）
sleep 10

# 验证容器运行
docker ps

# 配置 .env.local
DATABASE_URL="mysql://root:root@localhost:3306/package_recommendation"

# 运行迁移
pnpm db:push

# 查看容器日志（调试用）
docker logs mysql-dev

# 停止容器
docker stop mysql-dev

# 重新启动容器
docker start mysql-dev

# 删除容器（清理）
docker rm mysql-dev
```

---

## 开发服务器运行

### 方法 1：使用 IDE 的运行配置（推荐）

#### 在 WebStorm 中创建运行配置

1. 点击菜单 **Run → Edit Configurations**
2. 点击 **+** 按钮，选择 **npm**
3. 配置如下：
   - **Name**: `Dev Server`
   - **Command**: `run`
   - **Scripts**: `dev`
   - **Node interpreter**: 选择您的 Node.js
   - **Package manager**: `pnpm`
   - **Working directory**: 项目根目录

4. 点击 **Apply** 和 **OK**
5. 点击 **Run** 按钮或按 **Ctrl + R** 启动服务器

#### 在 IntelliJ IDEA 中创建运行配置

1. 点击菜单 **Run → Edit Configurations**
2. 点击 **+** 按钮，选择 **npm**
3. 配置同上
4. 点击 **Run**

### 方法 2：使用 IDE 的终端

在 IDE 的底部终端中运行：

```bash
# 启动开发服务器
pnpm dev

# 或分别启动前后端
pnpm dev:client  # 启动前端（React）
pnpm dev:server  # 启动后端（Express）
```

### 方法 3：使用系统终端

```bash
# 打开系统终端
cd ~/projects/package_recommendation_system

# 启动开发服务器
pnpm dev
```

### 访问应用

开发服务器启动后，您会看到类似的输出：

```
> package_recommendation_system@1.0.0 dev
> NODE_ENV=development tsx watch server/_core/index.ts

[03:40:26] Server running on http://localhost:3000/
```

在浏览器中打开：

```
http://localhost:3000
```

---

## 调试和测试

### 前端调试

#### 使用 Chrome DevTools

1. 在浏览器中打开应用（`http://localhost:3000`）
2. 按 **Cmd + Option + I** 打开开发者工具
3. 在 **Console** 标签中查看日志
4. 在 **Network** 标签中查看 API 请求
5. 在 **Sources** 标签中设置断点进行调试

#### 使用 IDE 的调试器

**在 WebStorm 中调试前端：**

1. 点击菜单 **Run → Debug**
2. IDE 会自动启动 Chrome 并连接调试器
3. 在代码中点击行号设置断点
4. 刷新浏览器触发断点

### 后端调试

#### 使用 Node.js 调试器

```bash
# 启动调试模式
node --inspect-brk server/_core/index.ts

# 或使用 tsx（项目已配置）
tsx --inspect-brk server/_core/index.ts
```

#### 在 IDE 中调试后端

**在 WebStorm 中：**

1. 在代码中设置断点
2. 点击菜单 **Run → Debug 'Dev Server'**
3. IDE 会连接到 Node.js 调试器
4. 触发相应代码时会在断点处暂停

### 运行单元测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test server/recommendation-engine.test.ts

# 监听模式（自动重新运行）
pnpm test --watch

# 生成覆盖率报告
pnpm test --coverage
```

#### 在 IDE 中运行测试

**在 WebStorm 中：**

1. 右键点击测试文件（`.test.ts`）
2. 选择 **Run 'filename.test.ts'** 或 **Debug 'filename.test.ts'**

**在 IntelliJ IDEA 中：**

1. 右键点击测试类或方法
2. 选择 **Run** 或 **Debug**

### 查看应用日志

#### 前端日志

在浏览器开发者工具的 **Console** 标签中查看。

#### 后端日志

在 IDE 的 **Run** 或 **Debug** 面板中查看。

---

## 常见问题

### Q1：启动时报错 "Cannot find module 'xlsx'"

**原因**：依赖未正确安装

**解决方案**：
```bash
# 清除缓存并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q2：数据库连接失败

**原因**：数据库未启动或连接字符串错误

**解决方案**：
```bash
# 检查 MySQL 是否运行
brew services list | grep mysql

# 如果未运行，启动 MySQL
brew services start mysql

# 或检查 Docker 容器
docker ps | grep mysql
```

### Q3：端口 3000 已被占用

**原因**：另一个应用已使用该端口

**解决方案**：
```bash
# 查看占用端口 3000 的进程
lsof -i :3000

# 杀死进程（替换 PID）
kill -9 <PID>

# 或使用不同的端口
PORT=3001 pnpm dev
```

### Q4：Node.js 架构不匹配（x64 vs arm64）

**原因**：安装了 Intel 版本的 Node.js

**解决方案**：
```bash
# 检查当前架构
node -p "process.arch"

# 如果是 x64，卸载并重新安装 ARM64 版本
brew uninstall node
brew install node

# 验证
node -p "process.arch"  # 应输出 arm64
```

### Q5：IDE 无法识别 TypeScript

**原因**：TypeScript 未正确安装或 IDE 配置错误

**解决方案**：
```bash
# 重新安装依赖
pnpm install

# 在 IDE 中重新加载项目
# WebStorm: File → Invalidate Caches and Restart
# IntelliJ IDEA: File → Invalidate Caches and Restart
```

### Q6：热更新（Hot Reload）不工作

**原因**：Vite 文件监听配置问题

**解决方案**：
```bash
# 增加文件监听限制
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 或重启开发服务器
# 在 IDE 中点击 Stop 然后 Run
```

### Q7：pnpm 命令找不到

**原因**：pnpm 未正确安装或 PATH 未配置

**解决方案**：
```bash
# 重新安装 pnpm
npm install -g pnpm

# 验证
pnpm --version

# 如果仍未找到，检查 PATH
echo $PATH

# 添加 npm 全局目录到 PATH（如需要）
export PATH="$PATH:$(npm config get prefix)/bin"
```

---

## 性能优化

### 1. 启用 IDE 的性能优化

**在 WebStorm 中：**

1. 打开 **Preferences → Appearance & Behavior → System Settings**
2. 启用 **Reuse windows for project files**
3. 启用 **Confirm window to open project in**
4. 在 **Performance** 部分调整内存分配

**在 IntelliJ IDEA 中：**

1. 打开 **Preferences → Appearance & Behavior → System Settings**
2. 增加 **IDE max heap size**（例如 2048MB）
3. 启用 **Power Save Mode**（如需要）

### 2. 优化 Node.js 性能

```bash
# 增加 Node.js 堆内存
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev

# 或在 .env 文件中配置
echo 'NODE_OPTIONS=--max-old-space-size=4096' >> .env.local
```

### 3. 优化 pnpm 性能

```bash
# 启用 pnpm 的严格对等依赖
pnpm config set strict-peer-dependencies false

# 启用自动安装对等依赖
pnpm config set auto-install-peers true
```

### 4. 使用 SSD 存储

确保项目文件存储在 SSD 上（Mac 通常都是），而不是外部 HDD。

### 5. 定期清理缓存

```bash
# 清理 pnpm 缓存
pnpm store prune

# 清理 Node 模块
rm -rf node_modules
pnpm install

# 清理 IDE 缓存
# WebStorm: File → Invalidate Caches and Restart
```

---

## 快速参考

### 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建生产版本
pnpm build

# 数据库迁移
pnpm db:push

# 生成 TypeScript 类型
pnpm type:generate

# 格式化代码
pnpm format

# 代码检查
pnpm lint
```

### IDE 快捷键

| 快捷键 | 功能 |
|--------|------|
| **Cmd + ,** | 打开设置 |
| **Cmd + K** | 打开命令面板 |
| **Cmd + J** | 打开终端 |
| **Cmd + Option + I** | 打开浏览器开发者工具 |
| **Cmd + Shift + D** | 启动调试 |
| **Cmd + Shift + F10** | 运行 |
| **Cmd + B** | 跳转到定义 |
| **Cmd + Option + L** | 格式化代码 |

---

## 总结

您现在已经拥有在 MacBook M 系列芯片上通过 JetBrains IDE 运行套餐推荐系统的完整指南。关键步骤包括：

1. ✅ 安装 ARM64 版本的 Node.js
2. ✅ 安装 pnpm 包管理器
3. ✅ 在 IDE 中打开项目
4. ✅ 配置数据库（云端或本地）
5. ✅ 运行 `pnpm install` 安装依赖
6. ✅ 运行 `pnpm dev` 启动开发服务器
7. ✅ 在浏览器中访问 `http://localhost:3000`

如有任何问题，请参考上方的"常见问题"部分或查阅项目的 README.md 文件。

祝您开发愉快！🚀
