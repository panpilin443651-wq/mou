"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManagePlan } from "@/lib/permissions";
import { actionPlanSchema, firstError } from "@/lib/validation";
import { writeAudit, diffFields } from "@/lib/audit";

// ============================================================================
// Server Action สำหรับแผนการดำเนินงาน (ข้อ 6)
// ============================================================================
// แผนงานเป็นของส่วนงานเจ้าของตัวชี้วัด ต่างจากตัวชี้วัดที่ส่วนกลางเป็นคนกำหนด
//
// ทุกฟังก์ชันต้องตรวจ 2 ชั้นเสมอ:
//   1. login แล้วหรือยัง
//   2. กิจกรรมนี้อยู่ในตัวชี้วัดของส่วนงานที่ผู้ใช้มีสิทธิ์แก้หรือไม่
// ไม่พึ่งการซ่อนปุ่ม เพราะ Server Action ถูกเรียกตรงได้โดยไม่ผ่านหน้าเว็บ
// ============================================================================

export type FormState = { error: string | null; success?: boolean };

function parsePlanForm(formData: FormData) {
  return actionPlanSchema.safeParse({
    quarter: formData.get("quarter") ?? "",
    activity: formData.get("activity") ?? "",
    expectedOutput: formData.get("expectedOutput") ?? "",
    status: formData.get("status") ?? "PENDING",
  });
}

export async function createPlanAction(
  indicatorId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const indicator = await db.indicator.findUnique({
    where: { id: indicatorId },
    select: { id: true, departmentId: true, code: true },
  });
  if (!indicator) return { error: "ไม่พบตัวชี้วัดนี้" };

  if (!canManagePlan(user, indicator.departmentId)) {
    return { error: "คุณไม่มีสิทธิ์เพิ่มกิจกรรมในแผนของส่วนงานนี้" };
  }

  const parsed = parsePlanForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  // เรียงกิจกรรมใหม่ต่อท้ายของไตรมาสนั้น ไม่ไปแทรกกลาง
  const last = await db.actionPlan.findFirst({
    where: { indicatorId, quarter: input.quarter },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.actionPlan.create({
    data: {
      indicatorId,
      quarter: input.quarter,
      activity: input.activity,
      expectedOutput: input.expectedOutput,
      status: input.status,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "PLAN_CREATE",
    entity: "ActionPlan",
    entityId: created.id,
    detail: { indicatorCode: indicator.code, quarter: input.quarter, activity: input.activity },
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${indicatorId}`);
  revalidatePath(`/indicators/${indicatorId}`);
  return { error: null, success: true };
}

export async function updatePlanAction(
  planId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const existing = await db.actionPlan.findUnique({
    where: { id: planId },
    include: { indicator: { select: { id: true, departmentId: true, code: true } } },
  });
  if (!existing) return { error: "ไม่พบกิจกรรมนี้" };

  if (!canManagePlan(user, existing.indicator.departmentId)) {
    return { error: "คุณไม่มีสิทธิ์แก้ไขแผนของส่วนงานนี้" };
  }

  const parsed = parsePlanForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  await db.actionPlan.update({
    where: { id: planId },
    data: {
      quarter: input.quarter,
      activity: input.activity,
      expectedOutput: input.expectedOutput,
      status: input.status,
    },
  });

  const changes = diffFields(
    {
      quarter: existing.quarter,
      activity: existing.activity,
      expectedOutput: existing.expectedOutput,
      status: existing.status,
    },
    {
      quarter: input.quarter,
      activity: input.activity,
      expectedOutput: input.expectedOutput,
      status: input.status,
    }
  );

  await writeAudit({
    userId: user.id,
    action: "PLAN_UPDATE",
    entity: "ActionPlan",
    entityId: planId,
    detail: changes,
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${existing.indicator.id}`);
  revalidatePath(`/indicators/${existing.indicator.id}`);
  return { error: null, success: true };
}

/**
 * ลบกิจกรรมออกจากแผน
 *
 * กิจกรรมในแผนลบทิ้งได้จริง ต่างจากตัวชี้วัดที่ใช้การเก็บเข้าคลังแทน
 * เพราะกิจกรรมยังไม่มีผลการดำเนินงานหรือไฟล์แนบผูกอยู่
 * และแผนมักถูกปรับไปมาระหว่างปี การเก็บของที่ยกเลิกไว้จะทำให้แผนรก
 */
export async function deletePlanAction(
  planId: string,
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const existing = await db.actionPlan.findUnique({
    where: { id: planId },
    include: { indicator: { select: { id: true, departmentId: true, code: true } } },
  });
  if (!existing) return { error: "ไม่พบกิจกรรมนี้" };

  if (!canManagePlan(user, existing.indicator.departmentId)) {
    return { error: "คุณไม่มีสิทธิ์ลบกิจกรรมในแผนของส่วนงานนี้" };
  }

  await db.actionPlan.delete({ where: { id: planId } });

  await writeAudit({
    userId: user.id,
    action: "PLAN_DELETE",
    entity: "ActionPlan",
    entityId: planId,
    detail: {
      indicatorCode: existing.indicator.code,
      quarter: existing.quarter,
      activity: existing.activity,
    },
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${existing.indicator.id}`);
  revalidatePath(`/indicators/${existing.indicator.id}`);
  return { error: null, success: true };
}
