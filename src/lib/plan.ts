import type { PlanStatus } from "@prisma/client";

// ============================================================================
// ข้อความและตัวช่วยเกี่ยวกับแผนการดำเนินงาน (ข้อ 6)
// ============================================================================
// แยกไว้ที่เดียวเพราะทั้งหน้าฝั่งเซิร์ฟเวอร์และฝั่งเบราว์เซอร์ใช้ร่วมกัน
// ถ้าเขียนซ้ำสองที่ เวลาแก้ข้อความจะแก้ไม่ทั่ว
// ============================================================================

export const QUARTERS = [1, 2, 3, 4] as const;

/**
 * ไตรมาสของปีงบประมาณไทย ไม่ตรงกับไตรมาสปฏิทิน
 * ปีงบเริ่ม 1 ต.ค. ไตรมาส 1 จึงเป็น ต.ค.-ธ.ค.
 */
export const QUARTER_MONTHS: Record<number, string> = {
  1: "ต.ค. – ธ.ค.",
  2: "ม.ค. – มี.ค.",
  3: "เม.ย. – มิ.ย.",
  4: "ก.ค. – ก.ย.",
};

export function quarterLabel(quarter: number): string {
  return `ไตรมาส ${quarter}`;
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  PENDING: "ยังไม่เริ่ม",
  IN_PROGRESS: "กำลังดำเนินการ",
  DONE: "ดำเนินการแล้วเสร็จ",
};

/** สีของป้ายสถานะ - ใช้ชุดเดียวกันทุกหน้าเพื่อให้ผู้ใช้จำได้ */
export const PLAN_STATUS_CLASS: Record<PlanStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-50 text-amber-800",
  DONE: "bg-emerald-50 text-emerald-800",
};

export const PLAN_STATUS_OPTIONS = (
  Object.keys(PLAN_STATUS_LABEL) as PlanStatus[]
).map((value) => ({ value, label: PLAN_STATUS_LABEL[value] }));

/**
 * นับความคืบหน้าของแผนเป็น "เสร็จแล้วกี่กิจกรรมจากทั้งหมด"
 *
 * ตัวเลขนี้เป็นความคืบหน้าของ *แผน* ไม่ใช่ % ความก้าวหน้าของตัวชี้วัด
 * ซึ่งคิดจากผลงานจริงเทียบค่าเป้าหมาย (ข้อ 4) คนละเรื่องกัน
 */
export function planProgress(plans: { status: PlanStatus }[]) {
  const total = plans.length;
  const done = plans.filter((p) => p.status === "DONE").length;
  const inProgress = plans.filter((p) => p.status === "IN_PROGRESS").length;
  return {
    total,
    done,
    inProgress,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
