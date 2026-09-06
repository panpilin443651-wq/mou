"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { passwordSchema, firstError } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export type PasswordState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { error: firstError(parsed.error), success: false };

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: "ไม่พบบัญชีผู้ใช้", success: false };

  // ต้องยืนยันรหัสผ่านเดิมก่อนเสมอ
  // กันกรณีมีคนมาใช้เครื่องที่เปิดค้างไว้แล้วเปลี่ยนรหัสผ่านของเจ้าของ
  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง", success: false };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });

  await writeAudit({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    entity: "User",
    entityId: user.id,
  });

  return { error: null, success: true };
}
