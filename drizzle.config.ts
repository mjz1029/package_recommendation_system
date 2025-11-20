import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 加载根目录的.env文件（关键：读取DATABASE_URL）
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts", // 保持你的原路径
  out: "./drizzle", // 保持你的原输出目录
  dialect: "mysql", // 保留你的旧版配置（不改为driver）
  dbCredentials: {
    url: connectionString, // 沿用你的连接逻辑
  },
});