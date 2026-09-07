import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/permissions";
import {
  getDashboardData,
  parseQuarterFilter,
  quarterFilterLabel,
} from "@/lib/dashboard";
import { QUARTERS, QUARTER_MONTHS } from "@/lib/plan";
import { ScoreBar } from "./score-bar";

export const dynamic = "force-dynamic";
export const metadata = { title: "ภาพรวม | ระบบรายงานผล MOU" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const quarter = parseQuarterFilter(sp.q);

  const data = await getDashboardData(user, quarter);
  const showComparison = data.departments.length > 1;

  const tiles = [
    {
      label: "ตัวชี้วัดที่ดูอยู่",
      value: data.indicatorCount.toLocaleString("th-TH"),
      hint: user.role === "DEPT_USER" ? "ของส่วนงานคุณ" : `${data.departments.length} ส่วนงาน`,
    },
    {
      label: "ส่งผลแล้ว",
      value: `${data.submittedPct}%`,
      hint: `${data.submittedCount.toLocaleString("th-TH")} จาก ${data.indicatorCount.toLocaleString("th-TH")} ตัวชี้วัด`,
    },
    {
      label: "คะแนนเฉลี่ย",
      value: data.averageWeightedScore === null ? "–" : data.averageWeightedScore.toFixed(2),
      hint: "จากคะแนนเต็ม 5",
    },
    {
      label: "ยังไม่ส่งเลย",
      value: data.notStartedDepartments.length.toLocaleString("th-TH"),
      hint:
        data.notStartedDepartments.length === 0
          ? "ทุกส่วนงานเริ่มส่งแล้ว"
          : `ส่วนงาน: ${data.notStartedDepartments.slice(0, 4).join(" · ")}${
              data.notStartedDepartments.length > 4 ? " …" : ""
            }`,
    },
  ];

  const exportHref = `/api/export/summary?q=${quarter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">ภาพรวม</h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.name} · {ROLE_LABEL[user.role]}
            {data.fiscalYear
              ? ` · ปีบัญชี ${data.fiscalYear.year}`
              : " · ยังไม่ได้ตั้งปีบัญชี"}
          </p>
        </div>

        <a
          href={exportHref}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
        >
          ดาวน์โหลดเป็น Excel
        </a>
      </div>

      {/* ตัวกรองไตรมาส วางไว้แถวเดียวเหนือทุกอย่าง เพื่อให้เห็นชัดว่ากรองอะไรอยู่ */}
      <nav className="flex flex-wrap gap-2" aria-label="เลือกไตรมาส">
        <Link
          href="/dashboard"
          aria-current={quarter === "latest" ? "page" : undefined}
          className={
            quarter === "latest"
              ? "inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white"
              : "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
          }
        >
          ล่าสุดที่ส่งแล้ว
        </Link>
        {QUARTERS.map((q) => (
          <Link
            key={q}
            href={`/dashboard?q=${q}`}
            aria-current={quarter === q ? "page" : undefined}
            className={
              quarter === q
                ? "inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white"
                : "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
            }
          >
            ไตรมาส {q}
            <span className="ml-1 text-xs opacity-75">({QUARTER_MONTHS[q]})</span>
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <dt className="text-sm text-slate-600">{t.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{t.value}</dd>
            <p className="mt-1 text-xs text-slate-500">{t.hint}</p>
          </div>
        ))}
      </dl>

      {data.submittedCount > 0 && data.submittedPct < 100 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ยังส่งผลไม่ครบ ({data.submittedPct}%) คะแนนที่เห็นจึงเป็นคะแนนเท่าที่ส่งมาแล้ว
          ไม่ใช่คะแนนสุดท้าย ส่วนงานที่ส่งน้อยกว่าจะดูเหมือนได้คะแนนต่ำกว่าโดยอัตโนมัติ
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="font-semibold">สรุปตามมิติ</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            คะแนนเฉลี่ยของตัวชี้วัดที่ส่งผลแล้วในแต่ละมิติ · {quarterFilterLabel(quarter)}
          </p>
        </div>

        {data.dimensions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-600 sm:px-5">ยังไม่มีข้อมูลตัวชี้วัด</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium sm:px-5">มิติ</th>
                  <th className="px-3 py-2.5 text-right font-medium">ตัวชี้วัด</th>
                  <th className="px-3 py-2.5 text-right font-medium">ส่งแล้ว</th>
                  <th className="px-3 py-2.5 text-right font-medium">สัดส่วนน้ำหนัก</th>
                  <th className="w-56 px-4 py-2.5 font-medium sm:px-5">คะแนนเฉลี่ย (เต็ม 5)</th>
                </tr>
              </thead>
              <tbody>
                {data.dimensions.map((d) => (
                  <tr key={d.dimension} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 sm:px-5">{d.dimension}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.indicatorCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.submittedCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.weightShare}%</td>
                    <td className="px-4 py-2.5 sm:px-5">
                      {d.averageScore === null ? (
                        <span className="text-slate-400">ยังไม่มีผล</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <ScoreBar value={d.averageScore} label={d.dimension} />
                          <span className="w-10 shrink-0 text-right tabular-nums">
                            {d.averageScore.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showComparison && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="font-semibold">เปรียบเทียบส่วนงาน</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              เรียงตามคะแนนถ่วงน้ำหนัก (คะแนน × น้ำหนัก ÷ 100 รวมทุกตัวชี้วัด · เต็ม 5) ·{" "}
              {quarterFilterLabel(quarter)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium sm:px-5">ลำดับ</th>
                  <th className="px-3 py-2.5 font-medium">ส่วนงาน</th>
                  <th className="px-3 py-2.5 text-right font-medium">ส่งผลแล้ว</th>
                  <th className="w-56 px-4 py-2.5 font-medium sm:px-5">คะแนนถ่วงน้ำหนัก</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d, i) => (
                  <tr key={d.departmentId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-slate-500 sm:px-5">
                      {d.submittedCount === 0 ? "–" : i + 1}
                    </td>
                    <td className="px-3 py-2.5" title={d.name}>
                      {d.code}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {d.submittedCount}/{d.indicatorCount}
                      <span className="ml-1 text-xs text-slate-500">({d.submittedPct}%)</span>
                    </td>
                    <td className="px-4 py-2.5 sm:px-5">
                      <div className="flex items-center gap-3">
                        <ScoreBar value={d.weightedScore} label={d.code} />
                        <span className="w-10 shrink-0 text-right tabular-nums">
                          {d.submittedCount === 0 ? "–" : d.weightedScore.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-5">
            ส่วนงานที่ยังส่งผลไม่ครบจะได้คะแนนรวมน้อยกว่าโดยธรรมชาติ
            ให้ดูช่อง &quot;ส่งผลแล้ว&quot; ประกอบทุกครั้งก่อนเปรียบเทียบกัน
          </p>
        </section>
      )}
    </div>
  );
}
