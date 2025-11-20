import type { UserData } from "./recommendation-engine";

/**
 * Excel解析工具
 * 处理用户清单Excel文件，提取用户数据
 */

function cleanValue(value: any, type: "number" | "percentage" = "number"): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  const str = String(value).trim();

  if (str === "不限" || str === "∞") {
    return 1e9;
  }

  if (type === "percentage" && str.endsWith("%")) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? 0 : num / 100;
  }

  const cleaned = str.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * 从Excel行数据提取用户信息
 * 期望的列顺序：联系电话、归属地、主套餐、档位、流量饱和度、语音饱和度、近三个月ARPU、流量、通话、超套金额、超套比例、备注
 */
export function parseUserRow(row: any[]): UserData | null {
  if (!row || row.length < 8) {
    return null;
  }

  const phone = String(row[0] || "").trim();
  if (!phone) {
    return null;
  }

  return {
    phone,
    location: String(row[1] || "").trim(),
    mainPlan: String(row[2] || "").trim(),
    currentPrice: cleanValue(row[3], "number"),
    arpu: cleanValue(row[6], "number"),
    dataGb: cleanValue(row[7], "number"),
    voiceMin: cleanValue(row[8], "number"),
    overage: cleanValue(row[9], "number"),
    overageRatio: cleanValue(row[10], "percentage"),
    remarks: String(row[11] || "").trim(),
  };
}

/**
 * 解析Excel数据（假设已通过其他库读取为JSON）
 */
export function parseExcelData(rows: any[][]): UserData[] {
  const users: UserData[] = [];

  for (const row of rows) {
    const userData = parseUserRow(row);
    if (userData) {
      users.push(userData);
    }
  }

  return users;
}

export { cleanValue };
