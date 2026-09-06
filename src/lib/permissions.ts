import type { Role } from "@prisma/client";

// ============================================================================
// กฎเรื่องสิทธิ์ทั้งหมดของระบบ - รวมไว้ที่ไฟล์เดียว
// ============================================================================
// ทำไมต้องรวมไว้ที่เดียว?
// เพราะกฎเหล่านี้ถูกเรียกใช้จากหลายหน้า ถ้าเขียนกระจายไปตามแต่ละหน้า
// เวลาแก้กฎจะแก้ไม่ทั่ว แล้วจะเกิดช่องโหว่ที่บางหน้าลืมตรวจ
//
// กฎที่ยืนยันแล้ว:
//   ADMIN      = ส่วนกลาง ทำได้ทุกอย่าง สร้าง/แก้ตัวชี้วัดให้ทุกส่วนงาน
//   DEPT_USER  = เห็นเฉพาะส่วนงานตัวเอง แก้ตัวชี้วัดไม่ได้ แต่กรอกผลได้
//   EXECUTIVE  = ดูได้ทุกส่วนงาน แต่แก้ไขอะไรไม่ได้เลย
// ============================================================================

/** ข้อมูลผู้ใช้เท่าที่จำเป็นต่อการตัดสินสิทธิ์ */
export type Actor = {
  role: Role;
  departmentId: string | null;
};

// ---------------------------------------------------------------------------
// สิทธิ์ต่อตัวชี้วัด
// ---------------------------------------------------------------------------

/** สร้าง แก้ไข หรือลบตัวชี้วัดได้หรือไม่ - เฉพาะส่วนกลางเท่านั้น */
export function canManageIndicators(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

// ---------------------------------------------------------------------------
// สิทธิ์ต่อการรายงานผล
// ---------------------------------------------------------------------------

/** กรอกผลและแนบไฟล์ของส่วนงานนี้ได้หรือไม่ */
export function canSubmitReport(actor: Actor, departmentId: string): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "DEPT_USER") return actor.departmentId === departmentId;
  return false; // EXECUTIVE ดูได้อย่างเดียว
}

// ---------------------------------------------------------------------------
// สิทธิ์ต่อการตั้งค่าระบบ (ปีบัญชี, ช่วงเวลาเปิด-ปิด, ผู้ใช้, ส่วนงาน)
// ---------------------------------------------------------------------------

export function canManageSystem(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

// ---------------------------------------------------------------------------
// การมองเห็นข้อมูล - ส่วนที่สำคัญที่สุด
// ---------------------------------------------------------------------------

/** ดูข้อมูลของส่วนงานนี้ได้หรือไม่ */
export function canViewDepartment(actor: Actor, departmentId: string): boolean {
  if (actor.role === "ADMIN" || actor.role === "EXECUTIVE") return true;
  return actor.departmentId === departmentId;
}

/**
 * เงื่อนไขกรองส่วนงานสำหรับใส่ใน Prisma query
 *
 * ใช้แบบนี้:
 *   const indicators = await db.indicator.findMany({
 *     where: { fiscalYearId, ...departmentScope(actor) },
 *   });
 *
 * ADMIN / EXECUTIVE  -> {}                    (ไม่กรอง เห็นทุกส่วนงาน)
 * DEPT_USER          -> { departmentId: "..." } (เห็นเฉพาะของตัวเอง)
 *
 * กรณี DEPT_USER ที่ไม่มีสังกัด จะคืนเงื่อนไขที่ไม่ match อะไรเลย
 * เพื่อไม่ให้หลุดเห็นข้อมูลทั้งหมดโดยไม่ตั้งใจ
 */
export function departmentScope(actor: Actor): { departmentId?: string } {
  if (actor.role === "ADMIN" || actor.role === "EXECUTIVE") return {};
  return { departmentId: actor.departmentId ?? "__ไม่มีสังกัด__" };
}

// ---------------------------------------------------------------------------
// ตัวช่วยสำหรับหน้าเว็บ
// ---------------------------------------------------------------------------

/** ชื่อ role ภาษาไทย ใช้แสดงบนหน้าจอ */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ (ส่วนกลาง)",
  DEPT_USER: "ผู้รับผิดชอบส่วนงาน",
  EXECUTIVE: "ผู้บริหาร",
};

/** เมนูที่ role นี้เห็น - ใช้ซ่อนเมนูให้หน้าจอสะอาด ไม่ใช่มาตรการความปลอดภัย */
export function visibleMenus(actor: Actor) {
  const isAdmin = actor.role === "ADMIN";
  return {
    dashboard: true,
    indicators: true,
    reports: actor.role !== "EXECUTIVE",
    plans: true,
    admin: isAdmin,
  };
}
