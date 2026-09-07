"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/actions/plans";
import { PLAN_STATUS_OPTIONS } from "@/lib/plan";

// ฟอร์มเพิ่มกิจกรรมเข้าไปในไตรมาสหนึ่ง
// ซ่อนไว้ก่อนแล้วกดปุ่มเปิด เพื่อไม่ให้หน้าจอรกด้วยฟอร์มเปล่า 4 ชุด

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "เพิ่มกิจกรรม"}
    </button>
  );
}

export function AddPlanForm({
  action,
  quarter,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  quarter: number;
}) {
  const [state, formAction] = useActionState(action, { error: null } as FormState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // บันทึกสำเร็จแล้วล้างช่องให้พร้อมกรอกกิจกรรมถัดไปทันที
  // ไม่ปิดฟอร์ม เพราะคนมักเพิ่มหลายกิจกรรมติดกัน
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:border-emerald-600 hover:bg-emerald-50"
      >
        + เพิ่มกิจกรรมในไตรมาส {quarter}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4"
    >
      <input type="hidden" name="quarter" value={quarter} />

      <div>
        <label
          htmlFor={`activity-${quarter}`}
          className="mb-1.5 block text-sm font-medium"
        >
          กิจกรรมที่จะทำ <span className="text-red-600">*</span>
        </label>
        <textarea
          id={`activity-${quarter}`}
          name="activity"
          required
          minLength={4}
          rows={2}
          placeholder="เช่น จัดอบรมเกษตรกรชาวสวนยาง รุ่นที่ 1"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`output-${quarter}`}
            className="mb-1.5 block text-sm font-medium"
          >
            ผลผลิตที่คาดหวัง
          </label>
          <input
            id={`output-${quarter}`}
            name="expectedOutput"
            type="text"
            placeholder="เช่น เกษตรกรผ่านการอบรม 50 ราย"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor={`status-${quarter}`}
            className="mb-1.5 block text-sm font-medium"
          >
            สถานะ
          </label>
          <select
            id={`status-${quarter}`}
            name="status"
            defaultValue="PENDING"
            className={`${inputClass} bg-white`}
          >
            {PLAN_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
        >
          ปิดฟอร์ม
        </button>
      </div>
    </form>
  );
}
