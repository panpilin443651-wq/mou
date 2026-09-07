import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canManagePlan, canViewDepartment } from "@/lib/permissions";
import { db } from "@/lib/db";
import { createPlanAction, updatePlanAction, deletePlanAction } from "@/actions/plans";
import { QUARTERS, QUARTER_MONTHS, planProgress } from "@/lib/plan";
import { AddPlanForm } from "./add-plan-form";
import { PlanRow } from "./plan-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "แผนการดำเนินงาน | ระบบรายงานผล MOU" };

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
      plans: { orderBy: [{ quarter: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!indicator) notFound();

  // ตรวจสิทธิ์การมองเห็นที่เซิร์ฟเวอร์
  // ถ้า DEPT_USER เดา URL ของตัวชี้วัดส่วนงานอื่น จะเจอหน้า 404 แทน
  if (!canViewDepartment(user, indicator.departmentId)) notFound();

  // สิทธิ์แก้ไขแยกจากสิทธิ์มองเห็น ผู้บริหารเปิดดูได้แต่แก้ไม่ได้
  const canEdit = canManagePlan(user, indicator.departmentId);
  const progress = planProgress(indicator.plans);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/plans" className="text-sm text-emerald-800 hover:underline">
          ← กลับไปรายการแผนการดำเนินงาน
        </Link>

        <h1 className="mt-2 text-xl font-bold sm:text-2xl">
          <span className="text-slate-500">ข้อ {indicator.code}</span> {indicator.name}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          {indicator.department.code} {indicator.department.name} · ปีบัญชี{" "}
          {indicator.fiscalYear.year} ·{" "}
          <Link
            href={`/indicators/${indicator.id}`}
            className="text-emerald-800 hover:underline"
          >
            ดูรายละเอียดตัวชี้วัด
          </Link>
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">ความคืบหน้าของแผน</h2>
            <p className="mt-1 text-sm text-slate-600">
              {progress.total === 0
                ? "ยังไม่ได้วางแผนกิจกรรมใดๆ"
                : `เสร็จแล้ว ${progress.done} จาก ${progress.total} กิจกรรม` +
                  (progress.inProgress > 0
                    ? ` · กำลังดำเนินการ ${progress.inProgress} กิจกรรม`
                    : "")}
            </p>
          </div>
          <span className="text-2xl font-bold tabular-nums text-emerald-800">
            {progress.pct}%
          </span>
        </div>

        {progress.total > 0 && (
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="ความคืบหน้าของแผน"
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          ตัวเลขนี้คือความคืบหน้าของ &quot;แผน&quot; ว่าทำกิจกรรมไปแล้วกี่อย่าง
          ไม่ใช่ % ความก้าวหน้าของตัวชี้วัดซึ่งคิดจากผลงานจริงเทียบค่าเป้าหมาย
        </p>
      </section>

      {!canEdit && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          คุณเปิดดูแผนนี้ได้อย่างเดียว การเพิ่มหรือแก้ไขกิจกรรมทำได้โดยผู้รับผิดชอบส่วนงาน
          {indicator.department.code} และส่วนกลาง
        </p>
      )}

      {QUARTERS.map((q) => {
        const plans = indicator.plans.filter((p) => p.quarter === q);
        return (
          <section key={q} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <h2 className="font-semibold">
                ไตรมาส {q}{" "}
                <span className="ml-1 text-sm font-normal text-slate-500">
                  ({QUARTER_MONTHS[q]})
                </span>
              </h2>
              <span className="text-sm text-slate-600">{plans.length} กิจกรรม</span>
            </div>

            {plans.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">
                ยังไม่มีกิจกรรมในไตรมาสนี้
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {plans.map((p) => (
                  <PlanRow
                    key={p.id}
                    canEdit={canEdit}
                    plan={{
                      id: p.id,
                      quarter: p.quarter,
                      activity: p.activity,
                      expectedOutput: p.expectedOutput,
                      status: p.status,
                    }}
                    // ผูก id ไว้ตั้งแต่ฝั่งเซิร์ฟเวอร์ ฟอร์มในเบราว์เซอร์จึงแก้ id ไม่ได้
                    updateAction={updatePlanAction.bind(null, p.id)}
                    deleteAction={deletePlanAction.bind(null, p.id)}
                  />
                ))}
              </ul>
            )}

            {canEdit && (
              <div className="border-t border-slate-200 p-4 sm:p-5">
                <AddPlanForm action={createPlanAction.bind(null, indicator.id)} quarter={q} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
