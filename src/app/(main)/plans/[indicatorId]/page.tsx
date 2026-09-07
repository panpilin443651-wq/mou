import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canManagePlan, canViewDepartment } from "@/lib/permissions";
import { db } from "@/lib/db";
import { savePlanAction } from "@/actions/plans";
import { currentFiscalMonthIndex, toMonths } from "@/lib/plan";
import { PlanTable, type PlanRowData } from "./plan-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "แผนดำเนินงาน | ระบบรายงานผล MOU" };

export default async function IndicatorPlanPage({
  params,
}: {
  params: Promise<{ indicatorId: string }>;
}) {
  const user = await requireUser();
  const { indicatorId } = await params;

  const indicator = await db.indicator.findUnique({
    where: { id: indicatorId },
    include: {
      department: { select: { code: true, name: true } },
      fiscalYear: { select: { year: true } },
      planHeader: true,
      plans: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!indicator) notFound();

  // ตรวจสิทธิ์การมองเห็นที่เซิร์ฟเวอร์
  // ถ้า DEPT_USER เดา URL ของตัวชี้วัดส่วนงานอื่น จะเจอหน้า 404 แทน
  if (!canViewDepartment(user, indicator.departmentId)) notFound();

  // สิทธิ์แก้ไขแยกจากสิทธิ์มองเห็น ผู้บริหารเปิดดูได้แต่แก้ไม่ได้
  const canEdit = canManagePlan(user, indicator.departmentId);

  // แปลง Json รายเดือนให้เป็นอาร์เรย์ยาว 12 ตั้งแต่ฝั่งเซิร์ฟเวอร์
  // ฝั่งเบราว์เซอร์จะได้ไม่ต้องเดารูปร่างข้อมูลอีก
  const rows: PlanRowData[] = indicator.plans.map((p) => ({
    id: p.id,
    section: p.section,
    sortOrder: p.sortOrder,
    title: p.title,
    targetValue: p.targetValue,
    unit: p.unit,
    planMonths: toMonths(p.planMonths),
    actualMonths: toMonths(p.actualMonths),
    causeNote: p.causeNote,
    correctiveAction: p.correctiveAction,
    evidence: p.evidence,
    note: p.note,
  }));

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/plans"
          className="inline-flex min-h-11 items-center text-sm text-brand-800 hover:underline"
        >
          ← กลับไปรายการแผนดำเนินงาน
        </Link>

        <h1 className="mt-2 text-xl font-bold sm:text-2xl">
          รายงานผลการดำเนินงานตามตัวชี้วัดที่ {indicator.code} {indicator.name}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          {indicator.department.code} {indicator.department.name} · ประจำปีบัญชี{" "}
          {indicator.fiscalYear.year}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={`/indicators/${indicator.id}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-50"
          >
            ดูรายละเอียดตัวชี้วัด
          </Link>
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          คุณเปิดดูแผนนี้ได้อย่างเดียว การแก้ไขทำได้โดยผู้รับผิดชอบส่วนงาน{" "}
          {indicator.department.code} และส่วนกลาง
        </p>
      )}

      <PlanTable
        // ผูก id ไว้ตั้งแต่ฝั่งเซิร์ฟเวอร์ ฟอร์มในเบราว์เซอร์จึงเปลี่ยนตัวชี้วัดไม่ได้
        action={savePlanAction.bind(null, indicator.id)}
        canEdit={canEdit}
        header={{
          owner: indicator.planHeader?.owner ?? "",
          budget: indicator.planHeader?.budget ?? "",
        }}
        rows={rows}
        monthsElapsed={currentFiscalMonthIndex(indicator.fiscalYear.year)}
        fiscalYear={indicator.fiscalYear.year}
        indicatorId={indicator.id}
      />
    </div>
  );
}
