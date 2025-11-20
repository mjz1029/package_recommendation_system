#!/bin/bash

# 存量用户套餐推荐系统 - MacBook M系列故障排查脚本
# 使用方法：bash troubleshoot-mac.sh

echo "=========================================="
echo "故障排查工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 菜单
show_menu() {
    echo -e "${BLUE}请选择操作：${NC}"
    echo "1. 检查环境"
    echo "2. 检查端口占用"
    echo "3. 清理缓存并重新安装"
    echo "4. 检查数据库连接"
    echo "5. 生成诊断报告"
    echo "0. 退出"
    echo ""
    read -p "请输入选项 (0-5): " choice
}

# 1. 检查环境
check_environment() {
    echo -e "${BLUE}=== 环境检查 ===${NC}"
    echo ""
    
    echo "1. Mac 芯片架构"
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        echo -e "${GREEN}✓${NC} $ARCH (M系列)"
    else
        echo -e "${RED}✗${NC} $ARCH (非 M 系列)"
    fi
    echo ""
    
    echo "2. Node.js"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NODE_ARCH=$(node -p "process.arch")
        echo -e "${GREEN}✓${NC} 版本: $NODE_VERSION, 架构: $NODE_ARCH"
        if [ "$NODE_ARCH" != "arm64" ]; then
            echo -e "${YELLOW}⚠ 警告：Node.js 架构不是 arm64${NC}"
        fi
    else
        echo -e "${RED}✗${NC} 未安装"
    fi
    echo ""
    
    echo "3. npm"
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✓${NC} $(npm --version)"
    else
        echo -e "${RED}✗${NC} 未安装"
    fi
    echo ""
    
    echo "4. pnpm"
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✓${NC} $(pnpm --version)"
    else
        echo -e "${RED}✗${NC} 未安装"
    fi
    echo ""
    
    echo "5. Git"
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✓${NC} $(git --version)"
    else
        echo -e "${RED}✗${NC} 未安装"
    fi
    echo ""
}

# 2. 检查端口占用
check_ports() {
    echo -e "${BLUE}=== 端口检查 ===${NC}"
    echo ""
    
    PORTS=(3000 3001 5173 5174)
    for PORT in "${PORTS[@]}"; do
        echo "检查端口 $PORT..."
        if lsof -i :$PORT &> /dev/null; then
            echo -e "${YELLOW}⚠ 端口 $PORT 已被占用${NC}"
            lsof -i :$PORT | grep LISTEN
        else
            echo -e "${GREEN}✓ 端口 $PORT 未被占用${NC}"
        fi
        echo ""
    done
}

# 3. 清理缓存并重新安装
clean_install() {
    echo -e "${BLUE}=== 清理缓存并重新安装 ===${NC}"
    echo ""
    
    read -p "确认要清理缓存吗? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "已取消"
        return
    fi
    
    echo "1. 删除 node_modules..."
    rm -rf node_modules
    echo -e "${GREEN}✓ 完成${NC}"
    
    echo "2. 删除 pnpm-lock.yaml..."
    rm -f pnpm-lock.yaml
    echo -e "${GREEN}✓ 完成${NC}"
    
    echo "3. 清理 pnpm 缓存..."
    pnpm store prune
    echo -e "${GREEN}✓ 完成${NC}"
    
    echo "4. 重新安装依赖..."
    pnpm install
    echo -e "${GREEN}✓ 完成${NC}"
    echo ""
}

# 4. 检查数据库连接
check_database() {
    echo -e "${BLUE}=== 数据库检查 ===${NC}"
    echo ""
    
    if command -v mysql &> /dev/null; then
        echo "检查 MySQL 连接..."
        if mysql -u root -e "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✓ MySQL 连接成功${NC}"
        else
            echo -e "${RED}✗ MySQL 连接失败${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ MySQL 未安装（使用云端数据库）${NC}"
    fi
    echo ""
}

# 5. 生成诊断报告
generate_report() {
    echo -e "${BLUE}=== 生成诊断报告 ===${NC}"
    echo ""
    
    REPORT_FILE="diagnostic_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=========================================="
        echo "诊断报告"
        echo "生成时间: $(date)"
        echo "=========================================="
        echo ""
        
        echo "系统信息"
        echo "--------"
        echo "Mac 芯片: $(uname -m)"
        echo "macOS 版本: $(sw_vers -productVersion)"
        echo ""
        
        echo "开发工具"
        echo "--------"
        echo "Node.js: $(node --version 2>/dev/null || echo '未安装')"
        echo "npm: $(npm --version 2>/dev/null || echo '未安装')"
        echo "pnpm: $(pnpm --version 2>/dev/null || echo '未安装')"
        echo "Git: $(git --version 2>/dev/null || echo '未安装')"
        echo ""
        
        echo "项目状态"
        echo "--------"
        echo "项目路径: $(pwd)"
        echo "Node 模块: $([ -d node_modules ] && echo '已安装' || echo '未安装')"
        echo ""
        
        echo "端口状态"
        echo "--------"
        for PORT in 3000 3001 5173 5174; do
            if lsof -i :$PORT &> /dev/null; then
                echo "端口 $PORT: 已被占用"
            else
                echo "端口 $PORT: 未被占用"
            fi
        done
        echo ""
        
    } > "$REPORT_FILE"
    
    echo -e "${GREEN}✓ 诊断报告已生成${NC}"
    echo "文件: $REPORT_FILE"
    echo ""
    cat "$REPORT_FILE"
    echo ""
}

# 主循环
while true; do
    show_menu
    
    case $choice in
        1)
            check_environment
            ;;
        2)
            check_ports
            ;;
        3)
            clean_install
            ;;
        4)
            check_database
            ;;
        5)
            generate_report
            ;;
        0)
            echo "退出"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选项${NC}"
            ;;
    esac
    
    read -p "按 Enter 继续..."
done
