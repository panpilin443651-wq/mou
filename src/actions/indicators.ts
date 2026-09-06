"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManageIndicators } from "@/lib/permissions";
import { indicatorSchema, firstError } from "@/lib/validation";
import { writeAudit, diffFields } from "@/lib/audit";

// ============================================================================
// Server Action สำหรับจัดการตัวชี้วัด
// ============================================================================
// ทุกฟังก์ชันในไฟล์นี้ตรวจสิทธิ์เองที่บรรทัดแรกเสมอ
// ไม่พึ่งการซ่อนปุ่มบนหน้าจอ เพราะ Server Action ถูกเรียกตรงได้
// ============================================================================

export type FormState = { error: string | null; fieldErrors?: Record<string, string> };

/** อ่านค่าจากฟอร์มแล้วตรวจด้วย Zod */
function parseForm(formData: FormData) {
  return indicatorSchema.safeParse({
    departmentId: formData.get("departmentId") ?? "",
    fiscalYearId: formData.get("fiscalYearId") ?? "",
    code: formData.get("code") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    dimension: formData.get("dimension") ?? "",
    groupName: formData.get("groupName") ?? "",
    unit: formData.get("unit") ?? "",
    baselineValue: formData.get("baselineValue") ?? "",
    adjustmentNote: formData.get("adjustmentNote") ?? "",
    weight: formData.get("weight") ?? "",
    direction: formData.get("direction") ?? "HIGHER_IS_BETTER",
    status: formData.get("status") ?? "ACTIVE",
    level1: formData.get("level1") ?? "",
    level2: formData.get("level2") ?? "",
    level3: formData.get("level3") ?? "",
    level4: formData.get("level4") ?? "",
    level5: formData.get("level5") ?? "",
  });
}

export async function createIndicator(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  if (!canManageIndicators(user)) {
    return { error: "คุณไม่มีสิทธิ์เพิ่มตัวชี้วัด เฉพาะส่วนกลางเท่านั้นที่ทำได้" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const levels = [input.level1, input.level2, input.level3, input.level4, input.level5];

  let newId: string;
  try {
    const created = await db.indicator.create({
      data: {
        fiscalYearId: input.fiscalYearId,
        departmentId: input.departmentId,
        code: input.code,
        name: input.name,
        description: input.description,
        dimension: input.dimension,
        groupName: input.groupName,
        unit: input.unit,
        // ค่าเป้าหมายหลักคือค่าเกณฑ์ระดับ 3 ตามรูปแบบ MOU ของ กยท.
        targetValue: input.level3,
        baselineValue: input.baselineValue,
        weight: input.weight,
        direction: input.direction,
        adjustmentNote: input.adjustmentNote,
        status: input.status,
        criteria: {
          create: levels.map((value, i) => ({
            level: i + 1,
            targetValue: value,
            description: `ระดับ ${i + 1} = ${value} ${input.unit}`,
          })),
        },
      },
    });
    newId = created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `ลำดับตัวชี้วัด "${input.code}" มีอยู่แล้วในส่วนงานนี้ของปีบัญชีนี้` };
    }
    throw error;
  }

  await writeAudit({
    userId: user.id,
    action: "INDICATOR_CREATE",
    entity: "Indicator",
    entityId: newId,
    detail: { code: input.code, name: input.name, weight: input.weight },
  });

  revalidatePath("/indicators");
  revalidatePath("/dashboard");
  redirect(`/indicators/${newId}`);
}

export async function updateIndicator(
  indicatorId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  if (!canManageIndicators(user)) {
    return { error: "คุณไม่มีสิทธิ์แก้ไขตัวชี้วัด เฉพาะส่วนกลางเท่านั้นที่ทำได้" };
  }

  const existing = await db.indicator.findUnique({
    where: { id: indicatorId },
    include: { criteria: { orderBy: { level: "asc" } } },
  });
  if (!existing) return { error: "ไม่พบตัวชี้วัดนี้" };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const levels = [input.level1, input.level2, input.level3, input.level4, input.level5];

  try {
    // ใช้ transaction เพื่อให้ตัวชี้วัดกับเกณฑ์คะแนนเปลี่ยนพร้อมกันทั้งชุด
    // ถ้าส่วนใดส่วนหนึ่งพัง จะไม่มีการบันทึกเลย ข้อมูลจึงไม่ค้างครึ่งๆ กลางๆ
    await db.$transaction(async (tx) => {
      await tx.indicator.update({
        where: { id: indicatorId },
        data: {
          departmentId: input.departmentId,
          fiscalYearId: input.fiscalYearId,
          code: input.code,
          name: input.name,
          description: input.description,
          dimension: input.dimension,
          groupName: input.groupName,
          unit: input.unit,
          targetValue: input.level3,
          baselineValue: input.baselineValue,
          weight: input.weight,
          direction: input.direction,
          adjustmentNote: input.adjustmentNote,
          status: input.status,
        },
      });

      for (const [i, value] of levels.entries()) {
        const level = i + 1;
        await tx.scoreCriteria.upsert({
          where: { indicatorId_level: { indicatorId, level } },
          update: { targetValue: value },
          create: {
            indicatorId,
            level,
            targetValue: value,
            description: `ระดับ ${level} = ${value} ${input.unit}`,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `ลำดับตัวชี้วัด "${input.code}" มีอยู่แล้วในส่วนงานนี้ของปีบัญชีนี้` };
    }
    throw error;
  }

  const changes = diffFields(
    {
      code: existing.code,
      name: existing.name,
      unit: existing.unit,
      weight: existing.weight,
      direction: existing.direction,
      status: existing.status,
      dimension: existing.dimension,
    },
    {
      code: input.code,
      name: input.name,
      unit: input.unit,
      weight: input.weight,
      direction: input.direction,
      status: input.status,
      dimension: input.dimension,
    }
  );

  await writeAudit({
    userId: user.id,
    action: "INDICATOR_UPDATE",
    entity: "Indicator",
    entityId: indicatorId,
    detail: changes,
  });

  revalidatePath("/indicators");
  revalidatePath(`/indicators/${indicatorId}`);
  revalidatePath("/dashboard");
  redirect(`/indicators/${indicatorId}`);
}

/**
 * เก็บตัวชี้วัดเข้าคลัง (ไม่ลบทิ้ง)
 *
 * ไม่ใช้การลบจริงเพราะตัวชี้วัดอาจมีรายงานผลและไฟล์แนบผูกอยู่
 * การลบจะทำให้ประวัติการดำเนินงานหายไปด้วย
 */
export async function archiveIndicator(indicatorId: string): Promise<FormState> {
  const user = await requireUser();
  if (!canManageIndicators(user)) {
    return { error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };
  }

  const existing = await db.indicator.findUnique({ where: { id: indicatorId } });
  if (!existing) return { error: "ไม่พบตัวชี้วัดนี้" };

  await db.indicator.update({
    where: { id: indicatorId },
    data: { status: "ARCHIVED" },
  });

  await writeAudit({
    userId: user.id,
    action: "INDICATOR_ARCHIVE",
    entity: "Indicator",
    entityId: indicatorId,
    detail: { code: existing.code, name: existing.name },
  });

  revalidatePath("/indicators");
  revalidatePath(`/indicators/${indicatorId}`);
  redirect("/indicators");
}

