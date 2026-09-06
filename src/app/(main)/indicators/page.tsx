import { requireUser } from "@/lib/session";
import { canManageIndicators, departmentScope } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตัวชี้วัด | ระบบรายงานผล MOU" };

export default async function IndicatorsPage() {
  const user = await requireUser();
  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });

  const indicators = await db.indicator.findMany({
    where: {
      ...(fiscalYear ? { fiscalYearId: fiscalYear.id } : {}),
      ...departmentScope(user),
    },
    include: { department: { select: { code: true } } },
    orderBy: [{ department: { sortOrder: "asc" } }, { code: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">ตัวชี้วัด</h1>
          <p className="mt-1 text-sm text-slate-600">
            {fiscalYear ? `ปีบัญชี ${fiscalYear.year}` : "ยังไม่ได้ตั้งปีบัญชี"} ·{" "}
            {indicators.length} รายการ
          </p>
        </div>

        {/* ปุ่มเพิ่มตัวชี้วัดแสดงเฉพาะส่วนกลาง - ส่วนงานแก้ตัวชี้วัดไม่ได้ */}
        {canManageIndicators(user) && (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
            เพิ่มตัวชี้วัด (Phase 4)
          </span>
        )}
      </div>

      {indicators.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          ยังไม่มีตัวชี้วัด
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[46rem] text-sm">
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
                <tr key={ind.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5">{ind.department.code}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{ind.code}</td>
                  <td className="px-3 py-2.5">{ind.name}</td>
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
      )}
    </div>
  );
}
