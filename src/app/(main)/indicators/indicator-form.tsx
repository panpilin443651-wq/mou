"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/actions/indicators";

// ฟอร์มเดียวใช้ได้ทั้งหน้าเพิ่มและหน้าแก้ไข
// ต่างกันแค่ action ที่ส่งเข้ามา และค่าเริ่มต้นที่เติมไว้ในช่อง

export type IndicatorFormValues = {
  departmentId: string;
  fiscalYearId: number;
  code: string;
  name: string;
  description: string;
  dimension: string;
  groupName: string;
  unit: string;
  baselineValue: string;
  adjustmentNote: string;
  weight: string;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  levels: [string, string, string, string, string];
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: IndicatorFormValues;
  departments: { id: string; code: string; name: string }[];
  fiscalYears: { id: number; year: number }[];
  dimensions: string[];
  submitLabel: string;
  cancelHref: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : label}
    </button>
  );
}

export function IndicatorForm({
  action,
  initial,
  departments,
  fiscalYears,
  dimensions,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction] = useActionState(action, { error: null } as FormState);
  const [levels, setLevels] = useState(initial.levels);
  const [unit, setUnit] = useState(initial.unit);

  // ทิศทางคำนวณจากค่าเกณฑ์ให้อัตโนมัติ แต่ผู้ใช้แก้ทับได้
  // ถ้าค่าระดับ 5 น้อยกว่าระดับ 1 แปลว่าตัวชี้วัดนี้ค่าน้อยยิ่งดี
  const [direction, setDirection] = useState(initial.direction);
  const first = Number(levels[0]);
  const last = Number(levels[4]);
  const suggested =
    !Number.isNaN(first) && !Number.isNaN(last) && first !== last
      ? last < first
        ? "LOWER_IS_BETTER"
        : "HIGHER_IS_BETTER"
      : null;
  const directionMismatch = suggested !== null && suggested !== direction;

  function setLevel(index: number, value: string) {
    const next = [...levels] as typeof levels;
    next[index] = value;
    setLevels(next);
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* ---------- ข้อมูลหลัก ---------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 font-semibold">ข้อมูลหลัก</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ส่วนงาน" htmlFor="departmentId" required>
            <select
              id="departmentId"
              name="departmentId"
              defaultValue={initial.departmentId}
              required
              className={inputClass}
            >
              <option value="">— เลือกส่วนงาน —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ปีบัญชี" htmlFor="fiscalYearId" required>
            <select
              id="fiscalYearId"
              name="fiscalYearId"
              defaultValue={String(initial.fiscalYearId)}
              required
              className={inputClass}
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.year}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="ลำดับตัวชี้วัด"
            htmlFor="code"
            required
            hint='ตามที่ระบุใน MOU เช่น 1 หรือ 4.1 สำหรับตัวชี้วัดย่อย'
          >
            <input
              id="code"
              name="code"
              defaultValue={initial.code}
              required
              inputMode="decimal"
              className={inputClass}
            />
          </Field>

          <Field label="มิติ" htmlFor="dimension" hint="เว้นว่างได้ถ้าไม่ได้จัดกลุ่ม">
            <input
              id="dimension"
              name="dimension"
              defaultValue={initial.dimension}
              list="dimension-options"
              className={inputClass}
            />
            <datalist id="dimension-options">
              {dimensions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <div className="sm:col-span-2">
            <Field label="ชื่อตัวชี้วัด" htmlFor="name" required>
              <input
                id="name"
                name="name"
                defaultValue={initial.name}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="หัวข้อกลุ่ม"
              htmlFor="groupName"
              hint="ใส่เมื่อเป็นตัวชี้วัดย่อย เช่น 4.1 และ 4.2 อยู่ใต้หัวข้อเดียวกัน"
            >
              <input
                id="groupName"
                name="groupName"
                defaultValue={initial.groupName}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="คำจำกัดความ / สูตรการคำนวณ"
              htmlFor="description"
              hint="คัดลอกจากตารางคำจำกัดความใน MOU ได้"
            >
              <textarea
                id="description"
                name="description"
                defaultValue={initial.description}
                rows={4}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ---------- การวัดผล ---------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 font-semibold">การวัดผล</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="หน่วยวัด" htmlFor="unit" required hint="เช่น ระดับ, ร้อยละ, บาท/ไร่">
            <input
              id="unit"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              list="unit-options"
              className={inputClass}
            />
            <datalist id="unit-options">
              <option value="ระดับ" />
              <option value="ร้อยละ" />
              <option value="บาท/ไร่" />
              <option value="ล้านบาท" />
            </datalist>
          </Field>

          <Field label="น้ำหนัก (%)" htmlFor="weight" required>
            <input
              id="weight"
              name="weight"
              defaultValue={initial.weight}
              required
              inputMode="decimal"
              className={inputClass}
            />
          </Field>

          <Field label="Base line ปีก่อน" htmlFor="baselineValue" hint="เว้นว่างได้ถ้า MOU ระบุ -">
            <input
              id="baselineValue"
              name="baselineValue"
              defaultValue={initial.baselineValue}
              inputMode="decimal"
              className={inputClass}
            />
          </Field>

          <Field label="การปรับค่าเกณฑ์วัด" htmlFor="adjustmentNote" hint='เช่น -/+ 1.00'>
            <input
              id="adjustmentNote"
              name="adjustmentNote"
              defaultValue={initial.adjustmentNote}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* ---------- เกณฑ์คะแนน ---------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold">ค่าเกณฑ์วัด 5 ระดับ</h2>
        <p className="mt-1 text-sm text-slate-600">
          ค่าเป้าหมายหลักของตัวชี้วัดจะใช้ค่าระดับ 3 ตามรูปแบบ MOU
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {levels.map((value, i) => (
            <Field key={i} label={`ระดับ ${i + 1}`} htmlFor={`level${i + 1}`} required>
              <input
                id={`level${i + 1}`}
                name={`level${i + 1}`}
                value={value}
                onChange={(e) => setLevel(i, e.target.value)}
                required
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="ทิศทาง"
            htmlFor="direction"
            hint="ค่ามากยิ่งดี หรือค่าน้อยยิ่งดี — มีผลต่อการให้คะแนน"
          >
            <select
              id="direction"
              name="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as typeof direction)}
              className={inputClass}
            >
              <option value="HIGHER_IS_BETTER">ค่ามากยิ่งดี</option>
              <option value="LOWER_IS_BETTER">ค่าน้อยยิ่งดี</option>
            </select>
          </Field>

          <Field label="สถานะ" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={initial.status}
              className={inputClass}
            >
              <option value="ACTIVE">ใช้งาน (ส่วนงานเห็นและกรอกผลได้)</option>
              <option value="DRAFT">ร่าง (ส่วนงานยังไม่เห็น)</option>
              <option value="ARCHIVED">เก็บเข้าคลัง</option>
            </select>
          </Field>
        </div>

        {directionMismatch && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ค่าเกณฑ์ที่กรอกไล่จาก {levels[0]} ไป {levels[4]} ซึ่งดูเหมือนตัวชี้วัดแบบ
            {suggested === "LOWER_IS_BETTER" ? "ค่าน้อยยิ่งดี" : "ค่ามากยิ่งดี"} แต่คุณเลือกทิศทางเป็น
            {direction === "LOWER_IS_BETTER" ? "ค่าน้อยยิ่งดี" : "ค่ามากยิ่งดี"} — กรุณาตรวจสอบอีกครั้ง
          </p>
        )}
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium transition hover:bg-slate-50"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
