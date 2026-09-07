import { db } from "@/lib/db";
import type { Actor } from "@/lib/permissions";
import { formatThaiDateTime } from "@/lib/datetime";

// ============================================================================
// การตรวจช่วงเวลาเปิด-ปิดรับรายงาน (ข้อ 9)
// ============================================================================
// รวมไว้ที่เดียว เพราะต้องถูกเรียกจากทุกจุดที่เขียนข้อมูลของไตรมาสนั้น
//   - บันทึกร่าง / ส่งผล / ดึงกลับมาแก้
//   - ตอนออกบัตรผ่านอัปโหลดไฟล์ และตอนบันทึกข้อมูลไฟล์ / ลบไฟล์
//
// ถ้าเขียนเงื่อนไขซ้ำกระจายไปแต่ละที่ จะมีสักที่ที่ลืมตรวจ แล้วกลายเป็นช่องโหว่
//
// กฎที่ใช้:
//   - ส่วนกลาง (ADMIN) ทำได้เสมอ เพราะเป็นคนคุมการเปิด-ปิดเอง
//     และต้องแก้ข้อมูลให้ส่วนงานได้แม้เลยกำหนดแล้ว
//   - ผู้รับผิดชอบส่วนงานทำได้เฉพาะช่วงที่เปิด
//   - ผู้บริหารแก้ไขอะไรไม่ได้อยู่แล้วตั้งแต่ชั้นสิทธิ์
//   - ถ้ายังไม่ได้ตั้งช่วงเวลาไว้ ถือว่า "ปิด" ไว้ก่อน (ปลอดภัยกว่าเปิดค้าง)
// ============================================================================

export type WindowState =
  | "OPEN" // อยู่ในช่วงที่เปิดรับ
  | "BEFORE_OPEN" // ยังไม่ถึงเวลาเปิด
  | "AFTER_CLOSE" // เลยเวลาปิดแล้ว
  | "FORCE_CLOSED" // ส่วนกลางสั่งปิดฉุกเฉิน
  | "NO_WINDOW"; // ยังไม่ได้ตั้งช่วงเวลาของไตรมาสนี้

export type WindowStatus = {
  state: WindowState;
  openAt: Date | null;
  /** เวลาปิดที่ใช้จริง (รวมการขยายเวลาเฉพาะส่วนงานแล้ว) */
  closeAt: Date | null;
  /** เวลาปิดเดิมก่อนขยาย - null ถ้าไม่มีการขยาย */
  originalCloseAt: Date | null;
  extensionReason: string | null;
  /** ผู้ใช้คนนี้บันทึกข้อมูลของไตรมาสนี้ได้หรือไม่ */
  canWrite: boolean;
  /** true เมื่อทำได้เพราะเป็นส่วนกลาง ทั้งที่ช่วงเวลาปิดอยู่ */
  isAdminOverride: boolean;
  /** ข้อความอธิบายสำหรับแสดงบนหน้าจอ */
  message: string;
};

function describe(state: WindowState, openAt: Date | null, closeAt: Date | null): string {
  switch (state) {
    case "OPEN":
      return closeAt
        ? `เปิดรับข้อมูลถึง ${formatThaiDateTime(closeAt)}`
        : "เปิดรับข้อมูล";
    case "BEFORE_OPEN":
      return openAt
        ? `ยังไม่ถึงเวลาเปิดรับข้อมูล จะเปิด ${formatThaiDateTime(openAt)}`
        : "ยังไม่ถึงเวลาเปิดรับข้อมูล";
    case "AFTER_CLOSE":
      return closeAt
        ? `ปิดรับข้อมูลแล้วเมื่อ ${formatThaiDateTime(closeAt)}`
        : "ปิดรับข้อมูลแล้ว";
    case "FORCE_CLOSED":
      return "ส่วนกลางปิดรับข้อมูลของไตรมาสนี้ไว้";
    case "NO_WINDOW":
      return "ยังไม่ได้ตั้งช่วงเวลาเปิด-ปิดของไตรมาสนี้ ติดต่อส่วนกลางเพื่อเปิดรับข้อมูล";
  }
}

/**
 * ตรวจว่าตอนนี้ส่วนงานนี้บันทึกข้อมูลของไตรมาสนี้ได้หรือไม่
 *
 * เรียกที่ฝั่งเซิร์ฟเวอร์เท่านั้น และต้องเรียก **ก่อนบันทึกทุกครั้ง**
 * การซ่อนปุ่มบนหน้าจอเป็นแค่ความสวยงาม กันคนที่ยิงข้อมูลตรงไม่ได้
 */
export async function getWindowStatus({
  fiscalYearId,
  quarter,
  departmentId,
  actor,
  now = new Date(),
}: {
  fiscalYearId: number;
  quarter: number;
  departmentId: string;
  actor: Actor;
  now?: Date;
}): Promise<WindowStatus> {
  const window = await db.submissionWindow.findUnique({
    where: { fiscalYearId_quarter: { fiscalYearId, quarter } },
    include: { exceptions: { where: { departmentId } } },
  });

  const isAdmin = actor.role === "ADMIN";

  if (!window) {
    return {
      state: "NO_WINDOW",
      openAt: null,
      closeAt: null,
      originalCloseAt: null,
      extensionReason: null,
      canWrite: isAdmin,
      isAdminOverride: isAdmin,
      message: describe("NO_WINDOW", null, null),
    };
  }

  // การขยายเวลาเฉพาะส่วนงาน ใช้ได้เฉพาะเมื่อทำให้ปิดช้าลงเท่านั้น
  // ไม่ให้ใช้ย่นเวลาปิดให้เร็วขึ้น เพราะจะกลายเป็นการลงโทษเฉพาะหน่วย
  const exception = window.exceptions[0] ?? null;
  const extended =
    exception && exception.closeAt > window.closeAt ? exception.closeAt : null;
  const effectiveClose = extended ?? window.closeAt;

  let state: WindowState;
  if (window.isForceClosed) state = "FORCE_CLOSED";
  else if (now < window.openAt) state = "BEFORE_OPEN";
  else if (now > effectiveClose) state = "AFTER_CLOSE";
  else state = "OPEN";

  const open = state === "OPEN";

  return {
    state,
    openAt: window.openAt,
    closeAt: effectiveClose,
    originalCloseAt: extended ? window.closeAt : null,
    extensionReason: extended ? exception!.reason : null,
    canWrite: open || isAdmin,
    isAdminOverride: !open && isAdmin,
    message: describe(state, window.openAt, effectiveClose),
  };
}

/**
 * ตรวจจาก indicatorId โดยตรง - ใช้ใน Server Action ที่มีแค่ id ของตัวชี้วัด
 * คืน null ถ้าไม่พบตัวชี้วัด
 */
export async function getWindowStatusForIndicator({
  indicatorId,
  quarter,
  actor,
  now,
}: {
  indicatorId: string;
  quarter: number;
  actor: Actor;
  now?: Date;
}): Promise<WindowStatus | null> {
  const indicator = await db.indicator.findUnique({
    where: { id: indicatorId },
    select: { fiscalYearId: true, departmentId: true },
  });
  if (!indicator) return null;

  return getWindowStatus({
    fiscalYearId: indicator.fiscalYearId,
    quarter,
    departmentId: indicator.departmentId,
    actor,
    now,
  });
}
