"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

// แถบค้นหาและกรอง - เปลี่ยนค่าแล้วอัปเดต URL
// การเก็บเงื่อนไขไว้ใน URL ทำให้ผู้ใช้ bookmark หรือส่งลิงก์ให้คนอื่นได้
// และกดปุ่มย้อนกลับของเบราว์เซอร์แล้วได้ผลลัพธ์เดิม

type Option = { value: string; label: string };

export function Filters({
  departments,
  dimensions,
  showDepartment,
}: {
  departments: Option[];
  dimensions: Option[];
  showDepartment: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  // หน่วงเวลาก่อนค้นหา เพื่อไม่ให้ยิงคำขอทุกครั้งที่พิมพ์ทีละตัวอักษร
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page");
      router.push(`/indicators?${next.toString()}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [q, params, router]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/indicators?${next.toString()}`);
  }

  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className={showDepartment ? "sm:col-span-2 lg:col-span-2" : "sm:col-span-2"}>
        <label htmlFor="q" className="sr-only">
          ค้นหาตัวชี้วัด
        </label>
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อตัวชี้วัด หรือลำดับ..."
          className={selectClass}
        />
      </div>

      {showDepartment && (
        <select
          aria-label="กรองตามส่วนงาน"
          value={params.get("dept") ?? ""}
          onChange={(e) => setParam("dept", e.target.value)}
          className={selectClass}
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
        aria-label="กรองตามมิติ"
        value={params.get("dim") ?? ""}
        onChange={(e) => setParam("dim", e.target.value)}
        className={selectClass}
      >
        <option value="">ทุกมิติ</option>
        {dimensions.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}
