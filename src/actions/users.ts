"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManageSystem } from "@/lib/permissions";
import { userSchema, initialPasswordSchema, firstError } from "@/lib/validation";
import { writeAudit, diffFields } from "@/lib/audit";

// ============================================================================
// Server Action สำหรับจัดการบัญชีผู้ใช้ (เฉพาะ ADMIN)
// ============================================================================
// ผู้ใช้สมัครเองไม่ได้ ส่วนกลางเป็นคนสร้างบัญชีให้ 30 ส่วนงาน
//
// ทุกฟังก์ชันตรวจสิทธิ์เองที่บรรทัดแรกเสมอ ไม่พึ่งการซ่อนเมนู
// เพราะ Server Action ถูกเรียกตรงจากภายนอกได้โดยไม่ผ่านหน้าเว็บของเรา
// ============================================================================

export type FormState = { error: string | null; success?: boolean };

/** อ่านค่าจากฟอร์มผู้ใช้แล้วตรวจด้วย Zod */
function parseUserForm(formData: FormData) {
  return userSchema.safeParse({
    email: formData.get("email") ?? "",
    name: formData.get("name") ?? "",
    role: formData.get("role") ?? "DEPT_USER",
    departmentId: formData.get("departmentId") ?? "",
    isActive: formData.get("isActive") ?? "true",
  });
}

/**
 * ตรวจว่าส่วนงานที่เลือกมีอยู่จริง
 * ถ้าไม่ตรวจ ฐานข้อมูลจะโยน error ดิบๆ ที่ผู้ใช้อ่านไม่รู้เรื่อง
 */
async function departmentExists(departmentId: string | null): Promise<boolean> {
  if (departmentId === null) return true;
  const found = await db.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  });
  return Boolean(found);
}

/** จำนวน ADMIN ที่ยังเปิดใช้งานอยู่ ไม่นับคนที่ระบุใน exceptId */
async function countOtherActiveAdmins(exceptId: string): Promise<number> {
  return db.user.count({
    where: { role: "ADMIN", isActive: true, id: { not: exceptId } },
  });
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireUser();
  if (!canManageSystem(actor)) {
    return { error: "คุณไม่มีสิทธิ์สร้างบัญชีผู้ใช้ เฉพาะส่วนกลางเท่านั้นที่ทำได้" };
  }

  const parsed = parseUserForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const parsedPassword = initialPasswordSchema.safeParse(password);
  if (!parsedPassword.success) return { error: firstError(parsedPassword.error) };
  if (password !== confirmPassword) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  if (!(await departmentExists(input.departmentId))) {
    return { error: "ไม่พบส่วนงานที่เลือก" };
  }

  let newId: string;
  try {
    const created = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        // ADMIN และ EXECUTIVE ดูได้ทุกส่วนงานอยู่แล้ว จึงไม่ผูกสังกัด
        departmentId: input.role === "DEPT_USER" ? input.departmentId : null,
        isActive: input.isActive,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    newId = created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `อีเมล "${input.email}" ถูกใช้ไปแล้ว` };
    }
    throw error;
  }

  // ไม่บันทึกรหัสผ่านลงประวัติเด็ดขาด เก็บแค่ว่าใครสร้างบัญชีให้ใคร
  await writeAudit({
    userId: actor.id,
    action: "USER_CREATE",
    entity: "User",
    entityId: newId,
    detail: { email: input.email, name: input.name, role: input.role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function updateUserAction(
  userId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireUser();
  if (!canManageSystem(actor)) {
    return { error: "คุณไม่มีสิทธิ์แก้ไขบัญชีผู้ใช้ เฉพาะส่วนกลางเท่านั้นที่ทำได้" };
  }

  const existing = await db.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "ไม่พบบัญชีผู้ใช้นี้" };

  const parsed = parseUserForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  if (!(await departmentExists(input.departmentId))) {
    return { error: "ไม่พบส่วนงานที่เลือก" };
  }

  // กันไม่ให้ผู้ดูแลระบบล็อกตัวเองออกจากระบบโดยไม่ตั้งใจ
  if (existing.id === actor.id) {
    if (!input.isActive) return { error: "ปิดใช้งานบัญชีของตัวเองไม่ได้" };
    if (input.role !== "ADMIN") return { error: "ลดสิทธิ์ของตัวเองไม่ได้" };
  }

  // กันไม่ให้เหลือระบบที่ไม่มีผู้ดูแลเลย
  const losesAdmin =
    existing.role === "ADMIN" && existing.isActive && (input.role !== "ADMIN" || !input.isActive);
  if (losesAdmin && (await countOtherActiveAdmins(existing.id)) === 0) {
    return { error: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 บัญชีเสมอ" };
  }

  const departmentId = input.role === "DEPT_USER" ? input.departmentId : null;

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        departmentId,
        isActive: input.isActive,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `อีเมล "${input.email}" ถูกใช้ไปแล้ว` };
    }
    throw error;
  }

  const changes = diffFields(
    {
      email: existing.email,
      name: existing.name,
      role: existing.role,
      departmentId: existing.departmentId,
      isActive: existing.isActive,
    },
    {
      email: input.email,
      name: input.name,
      role: input.role,
      departmentId,
      isActive: input.isActive,
    }
  );

  await writeAudit({
    userId: actor.id,
    action: "USER_UPDATE",
    entity: "User",
    entityId: userId,
    detail: changes,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect("/admin/users?updated=1");
}

/**
 * ตั้งรหัสผ่านใหม่ให้ผู้ใช้ (กรณีลืมรหัสผ่าน)
 *
 * ส่วนกลางตั้งรหัสชั่วคราวให้ แล้วแจ้งเจ้าตัวไปเปลี่ยนเองที่หน้า /account
 * ระบบไม่มีทางกู้รหัสผ่านเดิมได้ เพราะเก็บไว้แบบเข้ารหัสทางเดียว
 */
export async function resetUserPasswordAction(
  userId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireUser();
  if (!canManageSystem(actor)) {
    return { error: "คุณไม่มีสิทธิ์ตั้งรหัสผ่านให้ผู้อื่น" };
  }

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!existing) return { error: "ไม่พบบัญชีผู้ใช้นี้" };

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const parsed = initialPasswordSchema.safeParse(password);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (password !== confirmPassword) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  await writeAudit({
    userId: actor.id,
    action: "USER_PASSWORD_RESET",
    entity: "User",
    entityId: userId,
    detail: { email: existing.email },
  });

  return { error: null, success: true };
}
