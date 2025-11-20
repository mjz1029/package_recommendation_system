#!/bin/bash

# 存量用户套餐推荐系统 - MacBook M系列开发环境设置脚本
# 使用方法：bash setup-mac.sh

set -e

echo "=========================================="
echo "存量用户套餐推荐系统"
echo "MacBook M系列开发环境设置"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

# 第1步：检查 Mac 芯片架构
echo "第1步：检查 Mac 芯片架构"
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo -e "${GREEN}✓${NC} Mac 芯片架构: $ARCH (M系列)"
else
    echo -e "${RED}✗${NC} 不是 M 系列芯片，架构: $ARCH"
    exit 1
fi
echo ""

# 第2步：检查 Homebrew
echo "第2步：检查 Homebrew"
if check_command brew; then
    BREW_VERSION=$(brew --version | head -n1)
    echo "  版本: $BREW_VERSION"
else
    echo -e "${YELLOW}⚠${NC} 未安装 Homebrew，正在安装..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo ""

# 第3步：检查和安装 Node.js
echo "第3步：检查 Node.js"
if check_command node; then
    NODE_VERSION=$(node --version)
    NODE_ARCH=$(node -p "process.arch")
    echo "  版本: $NODE_VERSION"
    echo "  架构: $NODE_ARCH"
    
    if [ "$NODE_ARCH" != "arm64" ]; then
        echo -e "${YELLOW}⚠${NC} Node.js 架构不是 arm64，正在重新安装..."
        brew uninstall node
        brew install node
    fi
else
    echo -e "${YELLOW}⚠${NC} 未安装 Node.js，正在安装..."
    brew install node
fi
echo ""

# 第4步：检查和安装 pnpm
echo "第4步：检查 pnpm"
if check_command pnpm; then
    PNPM_VERSION=$(pnpm --version)
    echo "  版本: $PNPM_VERSION"
else
    echo -e "${YELLOW}⚠${NC} 未安装 pnpm，正在安装..."
    npm install -g pnpm
fi
echo ""

# 第5步：检查 Git
echo "第5步：检查 Git"
if check_command git; then
    GIT_VERSION=$(git --version)
    echo "  $GIT_VERSION"
else
    echo -e "${YELLOW}⚠${NC} 未安装 Git，正在安装..."
    brew install git
fi
echo ""

# 第6步：配置 pnpm
echo "第6步：配置 pnpm"
pnpm config set auto-install-peers true
pnpm config set shamefully-hoist true
echo -e "${GREEN}✓${NC} pnpm 已配置"
echo ""

# 第7步：安装项目依赖
echo "第7步：安装项目依赖"
if [ -f "package.json" ]; then
    echo "正在运行 pnpm install..."
    pnpm install
    echo -e "${GREEN}✓${NC} 依赖安装完成"
else
    echo -e "${RED}✗${NC} 未找到 package.json，请确保在项目根目录运行此脚本"
    exit 1
fi
echo ""

# 第8步：验证环境
echo "第8步：验证环境"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "pnpm: $(pnpm --version)"
echo "Git: $(git --version)"
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}✓ 环境设置完成！${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在 JetBrains IDE 中打开项目"
echo "2. 运行: pnpm dev"
echo "3. 访问: http://localhost:3000"
echo ""
echo "更多信息请查看:"
echo "  - QUICK_START_MAC.md (快速入门)"
echo "  - DEPLOYMENT_JETBRAINS_MAC.md (详细指南)"
echo "  - README.md (系统说明)"
