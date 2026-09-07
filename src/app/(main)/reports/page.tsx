import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { departmentScope } from "@/lib/permissions";
import { db } from "@/lib/db";
import { QUARTERS } from "@/lib/plan";
import { scoreClass, weightedScore } from "@/lib/scoring";
import { ReportFilters } from "./filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายงานผล | ระบบรายงานผล MOU" };

const PAGE_SIZE = 50;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; state?: string; page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const canPickDepartment = user.role !== "DEPT_USER";

  const stateFilter: Prisma.IndicatorWhereInput =
    sp.state === "none"
      ? { reports: { none: {} } }
      : sp.state === "draft"
        ? { reports: { some: { status: "DRAFT" } } }
        : sp.state === "submitted"
          ? { reports: { some: { status: "SUBMITTED" } } }
          : {};

  // departmentScope บังคับให้ DEPT_USER เห็นเฉพาะของตัวเองเสมอ
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
        reports: { select: { quarter: true, status: true, scoreLevel: true, progressPct: true } },
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
    return `/reports?${next.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">รายงานผล</h1>
        <p className="mt-1 text-sm text-slate-600">
          {fiscalYear ? `ปีบัญชี ${fiscalYear.year}` : "ยังไม่ได้ตั้งปีบัญชี"} · พบ{" "}
          {total.toLocaleString("th-TH")} ตัวชี้วัด · กดที่ช่องไตรมาสเพื่อกรอกผล
        </p>
      </div>

      <ReportFilters
        showDepartment={canPickDepartment}
        departments={departments.map((d) => ({ value: d.id, label: `${d.code} ${d.name}` }))}
      />

      {indicators.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          ไม่พบตัวชี้วัดตามเงื่อนไขที่เลือก
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium">ส่วนงาน</th>
                  <th className="px-3 py-2.5 font-medium">ข้อ</th>
                  <th className="px-3 py-2.5 font-medium">ชื่อตัวชี้วัด</th>
                  {QUARTERS.map((q) => (
                    <th key={q} className="px-2 py-2.5 text-center font-medium">
                      ไตรมาส {q}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-medium">คะแนนถ่วงน้ำหนัก</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => {
                  // ใช้คะแนนของไตรมาสล่าสุดที่ส่งแล้ว เป็นตัวแทนคะแนนสะสมของตัวชี้วัดนี้
                  const submitted = ind.reports
                    .filter((r) => r.status === "SUBMITTED" && r.scoreLevel !== null)
                    .sort((a, b) => b.quarter - a.quarter);
                  const latest = submitted[0] ?? null;
                  const weighted = weightedScore(latest?.scoreLevel ?? null, ind.weight);

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
                          href={`/reports/${ind.id}/1`}
                          className="-my-2.5 block py-3 text-emerald-800 underline-offset-2 hover:underline"
                        >
                          {ind.name}
                        </Link>
                      </td>

                      {QUARTERS.map((q) => {
                        const r = ind.reports.find((x) => x.quarter === q);
                        return (
                          <td key={q} className="whitespace-nowrap px-2 py-2.5 text-center">
                            <Link
                              href={`/reports/${ind.id}/${q}`}
                              className="-my-2.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded text-xs font-medium transition hover:ring-1 hover:ring-emerald-600"
                              title={`กรอกผลไตรมาส ${q}`}
                            >
                              {r === undefined ? (
                                <span className="text-slate-300">–</span>
                              ) : r.status === "DRAFT" ? (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                  ร่าง
                                </span>
                              ) : (
                                <span
                                  className={`rounded px-1.5 py-0.5 ${scoreClass(r.scoreLevel)}`}
                                >
                                  {r.scoreLevel ?? "-"}
                                </span>
                              )}
                            </Link>
                          </td>
                        );
                      })}

                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                        {weighted === null ? (
                          <span className="text-slate-300">–</span>
                        ) : (
                          weighted.toFixed(2)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            ตัวเลขในช่องไตรมาสคือคะแนน 1–5 ที่ได้ · &quot;ร่าง&quot; คือกรอกไว้แล้วแต่ยังไม่ได้ส่ง ·
            คะแนนถ่วงน้ำหนัก = คะแนนของไตรมาสล่าสุดที่ส่งแล้ว × น้ำหนัก ÷ 100
          </p>

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
