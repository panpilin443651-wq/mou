"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// แถบค้นหาและกรองของหน้ารายงานผล
// เก็บเงื่อนไขไว้ใน URL เหมือนหน้าอื่น ทำให้ bookmark และกดย้อนกลับได้

type Option = { value: string; label: string };

export function ReportFilters({
  departments,
  showDepartment,
}: {
  departments: Option[];
  showDepartment: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page");
      router.push(`/reports?${next.toString()}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [q, params, router]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/reports?${next.toString()}`);
  }

  const controlClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor="q" className="sr-only">
          ค้นหาตัวชี้วัด
        </label>
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อตัวชี้วัด หรือลำดับ..."
          className={controlClass}
        />
      </div>

      {showDepartment && (
        <select
          aria-label="กรองตามส่วนงาน"
          value={params.get("dept") ?? ""}
          onChange={(e) => setParam("dept", e.target.value)}
          className={controlClass}
        >
          <option value="">ทุกส่วนงาน</option>
          {departments.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="กรองตามสถานะการส่งผล"
        value={params.get("state") ?? ""}
        onChange={(e) => setParam("state", e.target.value)}
        className={controlClass}
      >
        <option value="">ทุกตัวชี้วัด</option>
        <option value="none">ยังไม่ได้กรอกผลเลยสักไตรมาส</option>
        <option value="draft">มีร่างค้างอยู่</option>
        <option value="submitted">ส่งผลแล้วอย่างน้อย 1 ไตรมาส</option>
      </select>
    </div>
  );
}
