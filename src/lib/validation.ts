import { z } from "zod";

// ============================================================================
// กฎการตรวจสอบข้อมูลที่ผู้ใช้กรอก
// ============================================================================
// ตรวจที่ฝั่งเซิร์ฟเวอร์เสมอ ไม่ใช่แค่ attribute required ในฟอร์ม
// เพราะข้อมูลอาจถูกส่งมาโดยไม่ผ่านหน้าเว็บของเรา
// ============================================================================

/** แปลงค่าจากฟอร์ม (ได้มาเป็น string เสมอ) ให้เป็นตัวเลข */
const numberFromForm = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `กรุณากรอก${fieldName}`)
    .refine((v) => !Number.isNaN(Number(v)), `${fieldName}ต้องเป็นตัวเลข`)
    .transform(Number);

/** ช่องที่เว้นว่างได้ ถ้าว่างให้เก็บเป็น null ไม่ใช่ "" */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" || v === "-" ? null : Number(v)))
  .refine((v) => v === null || !Number.isNaN(v), "ต้องเป็นตัวเลข")
  .nullable();

export const indicatorSchema = z.object({
  departmentId: z.string().min(1, "กรุณาเลือกส่วนงาน"),
  fiscalYearId: numberFromForm("ปีบัญชี"),

  code: z
    .string()
    .trim()
    .min(1, "กรุณากรอกลำดับตัวชี้วัด")
    .max(20, "ลำดับตัวชี้วัดยาวเกินไป")
    .regex(/^[\d.]+$/, "ลำดับตัวชี้วัดใช้ได้เฉพาะตัวเลขและจุด เช่น 1 หรือ 4.1"),

  name: z.string().trim().min(4, "ชื่อตัวชี้วัดสั้นเกินไป").max(300, "ชื่อตัวชี้วัดยาวเกินไป"),
  description: optionalText,
  dimension: optionalText,
  groupName: optionalText,

  unit: z.string().trim().min(1, "กรุณากรอกหน่วยวัด").max(30, "หน่วยวัดยาวเกินไป"),
  baselineValue: optionalNumber,
  adjustmentNote: optionalText,

  weight: numberFromForm("น้ำหนัก")
    .refine((v) => v >= 0, "น้ำหนักต้องไม่ติดลบ")
    .refine((v) => v <= 100, "น้ำหนักต้องไม่เกิน 100"),

  direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),

  // ค่าเกณฑ์วัดระดับ 1-5 ตามรูปแบบ MOU
  level1: numberFromForm("ค่าเกณฑ์ระดับ 1"),
  level2: numberFromForm("ค่าเกณฑ์ระดับ 2"),
  level3: numberFromForm("ค่าเกณฑ์ระดับ 3"),
  level4: numberFromForm("ค่าเกณฑ์ระดับ 4"),
  level5: numberFromForm("ค่าเกณฑ์ระดับ 5"),
});

export type IndicatorInput = z.infer<typeof indicatorSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: z
      .string()
      .min(8, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร")
      .max(72, "รหัสผ่านยาวเกินไป"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม",
    path: ["newPassword"],
  });

/** รวบรวมข้อความ error จาก Zod ให้เป็นข้อความเดียวสำหรับแสดงบนหน้าจอ */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}
