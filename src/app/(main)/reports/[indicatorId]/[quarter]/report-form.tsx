"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ScoreDirection } from "@prisma/client";
import type { FormState } from "@/actions/reports";
import { calcProgressPct, calcScoreLevel, scoreClass, scoreLabel } from "@/lib/scoring";

// ฟอร์มกรอกผลการดำเนินงานของไตรมาสหนึ่ง
//
// คำนวณ % และคะแนนให้ดูสดๆ ระหว่างพิมพ์ ด้วยสูตรชุดเดียวกับฝั่งเซิร์ฟเวอร์
// เพื่อให้ผู้กรอกเห็นทันทีว่าตัวเลขที่ใส่ได้คะแนนเท่าไร
// แต่ค่าที่บันทึกจริงคือค่าที่เซิร์ฟเวอร์คำนวณเอง ไม่ใช่ค่าที่ส่งมาจากหน้าจอ

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

type Criteria = { level: number; targetValue: number | null };

function Buttons({ isSubmitted }: { isSubmitted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก..." : isSubmitted ? "บันทึกและส่งใหม่" : "ส่งผลการดำเนินงาน"}
      </button>
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        บันทึกร่างไว้ก่อน
      </button>
    </div>
  );
}

export function ReportForm({
  action,
  unit,
  targetValue,
  direction,
  criteria,
  isSubmitted,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  unit: string;
  targetValue: number;
  direction: ScoreDirection;
  criteria: Criteria[];
  isSubmitted: boolean;
  initial: {
    actualValue: string;
    narrative: string;
    scoreOverride: string;
    scoreNote: string;
  };
}) {
  const [state, formAction] = useActionState(action, { error: null } as FormState);
  const [actual, setActual] = useState(initial.actualValue);
  const [override, setOverride] = useState(initial.scoreOverride);
  const overrideRef = useRef<HTMLSelectElement>(null);

  // React ล้างค่าในฟอร์มให้อัตโนมัติทุกครั้งที่ Server Action ตอบกลับ
  // ช่อง input ถูกเติมค่ากลับให้เอง แต่ช่อง select ไม่ถูกเติมกลับ
  // ผลคือถ้ากดส่งแล้วไม่ผ่าน ค่าคะแนนที่เลือกไว้จะหายจากหน้าจอเงียบๆ
  // แล้วการกดส่งครั้งถัดไปจะส่งค่าว่างไปแทน จึงต้องเติมค่ากลับเองตรงนี้
  useEffect(() => {
    if (overrideRef.current) overrideRef.current.value = override;
  }, [state, override]);

  const actualNum = actual.trim() === "" || Number.isNaN(Number(actual)) ? null : Number(actual);
  const autoScore = calcScoreLevel(actualNum, criteria, direction);
  const pct = calcProgressPct(actualNum, targetValue, direction);
  const finalScore = override === "" ? autoScore : Number(override);

  return (
    <form action={formAction} className="space-y-5">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label htmlFor="actualValue" className="mb-1.5 block text-sm font-medium">
            ผลงานที่ทำได้จริง <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="actualValue"
              name="actualValue"
              type="text"
              inputMode="decimal"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder={`เป้าหมาย ${targetValue}`}
              className={`${inputClass} max-w-xs`}
            />
            <span className="text-sm text-slate-600">{unit}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            ระบบอ่านตัวเลขจากไฟล์แนบเองไม่ได้ จึงต้องกรอกตัวเลขตรงนี้
            แล้วแนบไฟล์เป็นหลักฐานประกอบ
          </p>
        </div>

        {/* ผลคำนวณสดๆ ให้เห็นทันทีว่าตัวเลขที่กรอกได้คะแนนเท่าไร */}
        <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">ความก้าวหน้า</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-800">
              {pct === null ? "–" : `${pct}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">คะแนนที่ระบบคำนวณ</p>
            <p className="mt-0.5">
              <span
                className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${scoreClass(autoScore)}`}
              >
                {scoreLabel(autoScore)}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">คะแนนที่จะบันทึก</p>
            <p className="mt-0.5">
              <span
                className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${scoreClass(finalScore)}`}
              >
                {scoreLabel(finalScore)}
              </span>
              {override !== "" && (
                <span className="ml-2 text-xs text-amber-800">ปรับด้วยมือ</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="narrative" className="mb-1.5 block text-sm font-medium">
            คำอธิบายผลการดำเนินงาน
          </label>
          <textarea
            id="narrative"
            name="narrative"
            rows={4}
            defaultValue={initial.narrative}
            placeholder="อธิบายว่าทำอะไรไปบ้าง เจออุปสรรคอะไร และแก้ไขอย่างไร"
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold">ปรับคะแนนด้วยมือ (ถ้าจำเป็น)</h2>
          <p className="mt-1 text-sm text-slate-600">
            ปกติใช้คะแนนที่ระบบคำนวณให้ ปรับเฉพาะกรณีที่มีเหตุผลรองรับ เช่น
            มีปัจจัยภายนอกที่ควบคุมไม่ได้ การปรับทุกครั้งจะถูกบันทึกไว้ตรวจสอบย้อนหลัง
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scoreOverride" className="mb-1.5 block text-sm font-medium">
              คะแนนที่ปรับ
            </label>
            <select
              id="scoreOverride"
              name="scoreOverride"
              ref={overrideRef}
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">ใช้คะแนนที่ระบบคำนวณ</option>
              <option value="0">0 — ต่ำกว่าเกณฑ์ระดับ 1</option>
              <option value="1">ระดับ 1</option>
              <option value="2">ระดับ 2</option>
              <option value="3">ระดับ 3</option>
              <option value="4">ระดับ 4</option>
              <option value="5">ระดับ 5</option>
            </select>
          </div>

          <div>
            <label htmlFor="scoreNote" className="mb-1.5 block text-sm font-medium">
              เหตุผลที่ปรับ {override !== "" && <span className="text-red-600">*</span>}
            </label>
            <input
              id="scoreNote"
              name="scoreNote"
              type="text"
              defaultValue={initial.scoreNote}
              disabled={override === ""}
              placeholder="เช่น เกิดอุทกภัยในพื้นที่ ทำให้ดำเนินการไม่ได้"
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          บันทึกเรียบร้อยแล้ว
        </p>
      )}

      <Buttons isSubmitted={isSubmitted} />
    </form>
  );
}
