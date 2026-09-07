import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { departmentScope } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PLAN_SECTIONS, PLAN_SECTION_ITEM_LABEL, formatPct, summarizeSection, toMonths } from "@/lib/plan";
import { PlanFilters } from "./filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "แผนการดำเนินงาน | ระบบรายงานผล MOU" };

const PAGE_SIZE = 50;

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; state?: string; page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const canPickDepartment = user.role !== "DEPT_USER";

  // กรองตามความคืบหน้าของการวางแผน
  //   none = ยังไม่ได้กรอกแผนเลย  ·  has = เริ่มกรอกแล้วอย่างน้อย 1 บรรทัด
  //   target = มีตาราง "เป้าหมายตัวชี้วัด" แล้ว (ส่วนที่ขาดบ่อยที่สุด)
  const stateFilter: Prisma.IndicatorWhereInput =
    sp.state === "none"
      ? { plans: { none: {} } }
      : sp.state === "has"
        ? { plans: { some: {} } }
        : sp.state === "target"
          ? { plans: { some: { section: "TARGET" } } }
          : {};

  // departmentScope บังคับให้ DEPT_USER เห็นเฉพาะของตัวเองเสมอ
  // ถ้าส่ง dept ของส่วนงานอื่นมาใน URL ค่านั้นจะถูกทับด้วย scope
  const where: Prisma.IndicatorWhereInput = {
    ...(fiscalYear ? { fiscalYearId: fiscalYear.id } : {}),
    status: { not: "ARCHIVED" },
    ...(canPickDepartment && sp.dept ? { departmentId: sp.dept } : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { code: { startsWith: sp.q } },
          ],
        }
      : {}),
    ...stateFilter,
    ...departmentScope(user),
  };

  const [total, indicators, departments] = await Promise.all([
    db.indicator.count({ where }),
    db.indicator.findMany({
      where,
      include: {
        department: { select: { code: true, name: true } },
        plans: { select: { section: true, planMonths: true, actualMonths: true } },
      },
      orderBy: [{ department: { sortOrder: "asc" } }, { code: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    canPickDepartment
      ? db.department.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageLink(target: number) {
    const next = new URLSearchParams();
    if (sp.q) next.set("q", sp.q);
    if (sp.dept) next.set("dept", sp.dept);
    if (sp.state) next.set("state", sp.state);
    next.set("page", String(target));
    return `/plans?${next.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">แผนการดำเนินงาน</h1>
        <p className="mt-1 text-sm text-slate-600">
          {fiscalYear ? `ปีบัญชี ${fiscalYear.year}` : "ยังไม่ได้ตั้งปีบัญชี"} · พบ{" "}
          {total.toLocaleString("th-TH")} ตัวชี้วัด · เลือกตัวชี้วัดเพื่อกรอกแผนรายเดือนตามแบบฟอร์มเอกสารแนบ 4
        </p>
      </div>

      <PlanFilters
        showDepartment={canPickDepartment}
        departments={departments.map((d) => ({ value: d.id, label: `${d.code} ${d.name}` }))}
      />

      {indicators.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          ไม่พบตัวชี้วัดตามเงื่อนไขที่เลือก
        </p>
      ) : (
        <>
          {/* ตารางกว้างเกินจอมือถือ จึงให้เลื่อนแนวนอนในกรอบตัวเอง
              ไม่ปล่อยให้ทั้งหน้าเลื่อนซ้ายขวา */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium">ส่วนงาน</th>
                  <th className="px-3 py-2.5 font-medium">ข้อ</th>
                  <th className="px-3 py-2.5 font-medium">ชื่อตัวชี้วัด</th>
                  {PLAN_SECTIONS.map((section) => (
                    <th key={section} className="px-2 py-2.5 text-center font-medium">
                      {PLAN_SECTION_ITEM_LABEL[section]}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-medium">ผลเทียบแผนทั้งปี</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => {
                  // ใช้สูตรเดียวกับหน้าแผนและไฟล์ Excel เทียบผลทั้งปีกับแผนทั้งปี
                  const summary = summarizeSection(
                    ind.plans.map((p) => ({
                      planMonths: toMonths(p.planMonths),
                      actualMonths: toMonths(p.actualMonths),
                    })),
                    12
                  );
                  return (
                    <tr
                      key={ind.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5" title={ind.department.name}>
                        {ind.department.code}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{ind.code}</td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/plans/${ind.id}`}
                          className="-my-2.5 block py-3 text-brand-800 underline-offset-2 hover:underline"
                        >
                          {ind.name}
                        </Link>
                      </td>

                      {PLAN_SECTIONS.map((section) => {
                        const count = ind.plans.filter((p) => p.section === section).length;
                        return (
                          <td
                            key={section}
                            className="whitespace-nowrap px-2 py-2.5 text-center tabular-nums"
                          >
                            {count === 0 ? <span className="text-slate-300">–</span> : count}
                          </td>
                        );
                      })}

                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                        {summary.count === 0 ? (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            ยังไม่วางแผน
                          </span>
                        ) : (
                          formatPct(summary.avgYearPct)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">
                หน้า {page} จาก {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageLink(page - 1)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 transition hover:bg-slate-50"
                  >
                    ก่อนหน้า
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageLink(page + 1)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 transition hover:bg-slate-50"
                  >
                    ถัดไป
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
