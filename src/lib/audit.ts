import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// ============================================================================
// บันทึกประวัติว่าใครทำอะไรเมื่อไหร่
// ============================================================================
// ใช้ตรวจสอบย้อนหลังได้ว่าตัวชี้วัดถูกแก้โดยใคร เปลี่ยนจากอะไรเป็นอะไร
// การบันทึกประวัติต้องไม่ทำให้งานหลักล้มเหลว จึงดักจับ error ไว้ทั้งหมด
// ============================================================================

type AuditParams = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: Prisma.InputJsonValue;
};

export async function writeAudit({ userId, action, entity, entityId, detail }: AuditParams) {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, detail },
    });
  } catch (error) {
    // ถ้าบันทึกประวัติไม่สำเร็จ ให้แค่เตือนใน log ไม่ต้องล้มทั้งงาน
    console.error("บันทึก AuditLog ไม่สำเร็จ:", error);
  }
}

/** ค่าที่เก็บลงคอลัมน์ Json ได้ */
type Scalar = string | number | boolean | null | undefined;

/**
 * เทียบข้อมูลก่อน-หลัง แล้วคืนเฉพาะช่องที่เปลี่ยนจริง
 * ทำให้ประวัติอ่านง่ายและไม่เก็บข้อมูลซ้ำโดยไม่จำเป็น
 */
export function diffFields<T extends Record<string, Scalar>>(
  before: T,
  after: T
): Prisma.JsonObject {
  const changes: Prisma.JsonObject = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
    }
  }
  return changes;
}
