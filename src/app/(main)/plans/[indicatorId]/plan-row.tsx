"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanStatus } from "@prisma/client";
import type { FormState } from "@/actions/plans";
import { PLAN_STATUS_CLASS, PLAN_STATUS_LABEL, PLAN_STATUS_OPTIONS } from "@/lib/plan";

// กิจกรรมหนึ่งรายการในแผน
// ปกติแสดงเป็นข้อความอ่านอย่างเดียว กดปุ่มแก้ไขแล้วค่อยกลายเป็นฟอร์มในที่เดิม
// ทำแบบนี้เพื่อไม่ต้องเด้งไปอีกหน้าแล้วกลับมา ซึ่งเสียเวลาเมื่อมีหลายกิจกรรม

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

export type PlanRowData = {
  id: string;
  quarter: number;
  activity: string;
  expectedOutput: string | null;
  status: PlanStatus;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "บันทึก"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      // ถามยืนยันก่อน เพราะกิจกรรมถูกลบจริง เรียกคืนไม่ได้
      onClick={(e) => {
        if (!confirm("ลบกิจกรรมนี้ออกจากแผนหรือไม่ การลบเรียกคืนไม่ได้")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "กำลังลบ..." : "ลบ"}
    </button>
  );
}

export function PlanRow({
  plan,
  canEdit,
  updateAction,
  deleteAction,
}: {
  plan: PlanRowData;
  canEdit: boolean;
  updateAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useActionState(updateAction, {
    error: null,
  } as FormState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, {
    error: null,
  } as FormState);

  if (canEdit && editing) {
    return (
      <li className="px-4 py-4 sm:px-5">
        <form action={updateFormAction} className="space-y-3">
          <input type="hidden" name="quarter" value={plan.quarter} />

          <div>
            <label htmlFor={`act-${plan.id}`} className="mb-1.5 block text-sm font-medium">
              กิจกรรม <span className="text-red-600">*</span>
            </label>
            <textarea
              id={`act-${plan.id}`}
              name="activity"
              required
              minLength={4}
              rows={2}
              defaultValue={plan.activity}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`out-${plan.id}`} className="mb-1.5 block text-sm font-medium">
                ผลผลิตที่คาดหวัง
              </label>
              <input
                id={`out-${plan.id}`}
                name="expectedOutput"
                type="text"
                defaultValue={plan.expectedOutput ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`st-${plan.id}`} className="mb-1.5 block text-sm font-medium">
                สถานะ
              </label>
              <select
                id={`st-${plan.id}`}
                name="status"
                defaultValue={plan.status}
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

          {updateState.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {updateState.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <SaveButton />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    // จอเล็กให้ข้อความกิจกรรมได้เต็มความกว้าง แล้วดันป้ายสถานะกับปุ่มลงบรรทัดใหม่
    // ถ้าวางเรียงบรรทัดเดียวบนมือถือ ข้อความจะถูกบีบจนอ่านยาก
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm">{plan.activity}</p>
        {plan.expectedOutput && (
          <p className="mt-1 text-xs text-slate-600">
            ผลผลิตที่คาดหวัง: {plan.expectedOutput}
          </p>
        )}
        {deleteState.error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {deleteState.error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_CLASS[plan.status]}`}
        >
          {PLAN_STATUS_LABEL[plan.status]}
        </span>

        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
            >
              แก้ไข
            </button>
            <form action={deleteFormAction}>
              <DeleteButton />
            </form>
          </>
        )}
      </div>
    </li>
  );
}
