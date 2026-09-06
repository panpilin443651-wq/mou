import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { canManageIndicators, departmentScope } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Filters } from "./filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตัวชี้วัด | ระบบรายงานผล MOU" };

const PAGE_SIZE = 50;

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; dim?: string; page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const canManage = canManageIndicators(user);
  const canPickDepartment = user.role !== "DEPT_USER";

  // เงื่อนไขกรอง - departmentScope บังคับให้ DEPT_USER เห็นเฉพาะของตัวเองเสมอ
  // ถ้าผู้ใช้ส่ง dept ที่ไม่ใช่ของตัวเองมาใน URL ค่านั้นจะถูกทับด้วย scope
  const where: Prisma.IndicatorWhereInput = {
    ...(fiscalYear ? { fiscalYearId: fiscalYear.id } : {}),
    ...(canPickDepartment && sp.dept ? { departmentId: sp.dept } : {}),
    ...(sp.dim ? { dimension: sp.dim } : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { code: { startsWith: sp.q } },
          ],
        }
      : {}),
    ...departmentScope(user),
  };

  const [total, indicators, departments, dimensionRows] = await Promise.all([
    db.indicator.count({ where }),
    db.indicator.findMany({
      where,
      include: { department: { select: { code: true, name: true } } },
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
    db.indicator.findMany({
      where: fiscalYear ? { fiscalYearId: fiscalYear.id } : {},
      select: { dimension: true },
      distinct: ["dimension"],
      orderBy: { dimension: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageLink(target: number) {
    const next = new URLSearchParams();
    if (sp.q) next.set("q", sp.q);
    if (sp.dept) next.set("dept", sp.dept);
    if (sp.dim) next.set("dim", sp.dim);
    next.set("page", String(target));
    return `/indicators?${next.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">ตัวชี้วัด</h1>
          <p className="mt-1 text-sm text-slate-600">
            {fiscalYear ? `ปีบัญชี ${fiscalYear.year}` : "ยังไม่ได้ตั้งปีบัญชี"} · พบ{" "}
            {total.toLocaleString("th-TH")} รายการ
          </p>
        </div>

        {canManage && (
          <Link
            href="/indicators/new"
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            + เพิ่มตัวชี้วัด
          </Link>
        )}
      </div>

      <Filters
        showDepartment={canPickDepartment}
        departments={departments.map((d) => ({ value: d.id, label: `${d.code} ${d.name}` }))}
        dimensions={dimensionRows
          .map((d) => d.dimension)
          .filter((d): d is string => Boolean(d))
          .map((d) => ({ value: d, label: d }))}
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
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium">ส่วนงาน</th>
                  <th className="px-3 py-2.5 font-medium">ข้อ</th>
                  <th className="px-3 py-2.5 font-medium">ชื่อตัวชี้วัด</th>
                  <th className="px-3 py-2.5 font-medium">มิติ</th>
                  <th className="px-3 py-2.5 font-medium">หน่วย</th>
                  <th className="px-3 py-2.5 text-right font-medium">เป้าหมาย</th>
                  <th className="px-4 py-2.5 text-right font-medium">น้ำหนัก</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => (
                  <tr key={ind.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5" title={ind.department.name}>
                      {ind.department.code}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{ind.code}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/indicators/${ind.id}`}
                        className="text-emerald-800 underline-offset-2 hover:underline"
                      >
                        {ind.name}
                      </Link>
                      {ind.status !== "ACTIVE" && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {ind.status === "DRAFT" ? "ร่าง" : "เก็บเข้าคลัง"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {ind.dimension ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{ind.unit}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {ind.targetValue}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {ind.weight}%
                    </td>
                  </tr>
                ))}
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
                    className="rounded-lg border border-slate-300 px-3 py-2 transition hover:bg-slate-50"
                  >
                    ก่อนหน้า
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageLink(page + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 transition hover:bg-slate-50"
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
