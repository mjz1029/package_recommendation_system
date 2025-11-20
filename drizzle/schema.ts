import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 套餐表：存储套餐目录信息
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 套餐名
  price: int("price").notNull(), // 资费（元/月，存储为整数避免浮点精度问题）
  dataGb: int("data_gb").notNull(), // 包含流量（GB）
  voiceMin: int("voice_min").notNull(), // 包含通话（分钟）
  broadband: varchar("broadband", { length: 100 }), // 宽带速率（如300M）
  benefits: text("benefits"), // 附加会员/权益
  onShelf: int("on_shelf").default(1).notNull(), // 是否在售（1=是，0=否）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * 推荐结果表：存储推荐历史（可选，用于后续分析）
 */
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }), // 联系电话
  location: varchar("location", { length: 100 }), // 归属地
  currentPlan: varchar("current_plan", { length: 255 }), // 主套餐
  currentPrice: int("current_price"), // 当前档位（价格）
  arpu: int("arpu"), // 近三个月ARPU
  userDataGb: int("user_data_gb"), // 用户流量需求
  userVoiceMin: int("user_voice_min"), // 用户通话需求
  recommendedPlanId: int("recommended_plan_id"), // 推荐套餐ID
  recommendedPrice: int("recommended_price"), // 推荐资费
  targetPrice: int("target_price"), // 目标价档
  reason: text("reason"), // 推荐理由
  resourceRisk: int("resource_risk").default(0), // 资源风险（1=是，0=否）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;