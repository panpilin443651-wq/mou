import { requireUser } from "@/lib/session";
import { departmentScope, ROLE_LABEL } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "ภาพรวม | ระบบรายงานผล MOU" };

export default async function DashboardPage() {
  const user = await requireUser();

  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });

  // departmentScope คือหัวใจของการจำกัดการมองเห็น
  // DEPT_USER จะได้ { departmentId: "ของตัวเอง" } ส่วน ADMIN/EXECUTIVE ได้ {} (เห็นทุกหน่วย)
  const scope = departmentScope(user);

  const indicatorWhere = {
    ...(fiscalYear ? { fiscalYearId: fiscalYear.id } : {}),
    ...scope,
  };

  const [indicatorCount, byDimension, departmentCount] = await Promise.all([
    db.indicator.count({ where: indicatorWhere }),
    db.indicator.groupBy({
      by: ["dimension"],
      where: indicatorWhere,
      _count: { _all: true },
      _sum: { weight: true },
    }),
    db.department.count({ where: { isActive: true } }),
  ]);

  const stats = [
    { label: "ตัวชี้วัดที่รับผิดชอบ", value: indicatorCount },
    { label: "มิติ", value: byDimension.length },
    ...(user.role === "DEPT_USER" ? [] : [{ label: "ส่วนงานทั้งหมด", value: departmentCount }]),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">ภาพรวม</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.name} · {ROLE_LABEL[user.role]}
          {fiscalYear ? ` · ปีบัญชี ${fiscalYear.year}` : " · ยังไม่ได้ตั้งปีบัญชี"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-sm text-slate-600">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold sm:px-5">
          จำนวนตัวชี้วัดแยกตามมิติ
        </h2>

        {byDimension.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-600 sm:px-5">
            ยังไม่มีข้อมูลตัวชี้วัด
          </p>
        ) : (
          // ตารางกว้างเกินจอมือถือได้ จึงให้เลื่อนแนวนอนในกรอบตัวเอง
          // ไม่ปล่อยให้ทั้งหน้าเลื่อนซ้ายขวา
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium sm:px-5">มิติ</th>
                  <th className="px-4 py-2.5 text-right font-medium">จำนวน</th>
                  <th className="px-4 py-2.5 text-right font-medium sm:px-5">น้ำหนักรวม (%)</th>
                </tr>
              </thead>
              <tbody>
                {byDimension
                  .sort((a, b) => (b._sum.weight ?? 0) - (a._sum.weight ?? 0))
                  .map((row) => (
                    <tr key={row.dimension ?? "-"} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 sm:px-5">{row.dimension ?? "(ไม่ระบุมิติ)"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row._count._all}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">
                        {row._sum.weight ?? 0}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
