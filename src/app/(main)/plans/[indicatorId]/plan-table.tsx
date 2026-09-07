"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanSection } from "@prisma/client";
import type { FormState } from "@/actions/plans";
import {
  FISCAL_MONTHS,
  MONTH_COUNT,
  PLAN_SECTIONS,
  PLAN_SECTION_CAUSE_LABEL,
  PLAN_SECTION_CUM_LABEL,
  PLAN_SECTION_GUIDE,
  PLAN_SECTION_INDEX_LABEL,
  PLAN_SECTION_ITEM_LABEL,
  PLAN_SECTION_TITLE,
  PLAN_SECTION_YEAR_LABEL,
  formatPct,
  monthQuarter,
  summarizeSection,
} from "@/lib/plan";

// ============================================================================
// ตารางแผนดำเนินงานตามแบบฟอร์มเอกสารแนบ 4
// ============================================================================
// ทั้งหน้าเป็นฟอร์มเดียว คนกรอกไล่พิมพ์ทั้งตารางแล้วกดบันทึกครั้งเดียว
// เหมือนตอนกรอกในไฟล์ Excel ไม่ใช่กดบันทึกทีละบรรทัด
//
// ช่องตัวเลขเก็บใน state ของ React ด้วย เพราะคอลัมน์เปอร์เซ็นต์ต้องคิดใหม่
// ทันทีที่พิมพ์ ให้เห็นผลเหมือนสูตรใน Excel ไม่ต้องรอกดบันทึกก่อน
// ============================================================================

export type PlanRowData = {
  id: string;
  section: PlanSection;
  sortOrder: number;
  title: string;
  targetValue: number | null;
  unit: string | null;
  planMonths: (number | null)[];
  actualMonths: (number | null)[];
  causeNote: string | null;
  correctiveAction: string | null;
  evidence: string | null;
  note: string | null;
};

/** ช่องในตารางเก็บเป็นข้อความ ไม่ใช่ตัวเลข เพื่อให้พิมพ์ "1." ค้างไว้ได้โดยเลขไม่หาย */
type RowState = PlanRowData & { plan: string[]; actual: string[] };

const numText = (v: number | null) => (v === null ? "" : String(v));
const toNum = (v: string) => {
  const cleaned = v.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

function toRowState(rows: PlanRowData[]): RowState[] {
  return rows.map((r) => ({
    ...r,
    plan: r.planMonths.map(numText),
    actual: r.actualMonths.map(numText),
  }));
}

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1.5 text-right text-sm tabular-nums outline-none hover:border-slate-300 focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600";
const textInput =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value="save"
      disabled={pending}
      className="min-h-11 rounded-lg bg-brand-700 px-5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "บันทึกแผน"}
    </button>
  );
}

export function PlanTable({
  action,
  canEdit,
  header,
  rows,
  monthsElapsed,
  fiscalYear,
  indicatorId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  canEdit: boolean;
  header: { owner: string; budget: string };
  rows: PlanRowData[];
  monthsElapsed: number;
  fiscalYear: number;
  indicatorId: string;
}) {
  const [state, formAction] = useActionState(action, { error: null } as FormState);
  const [data, setData] = useState<RowState[]>(() => toRowState(rows));

  // เมื่อเซิร์ฟเวอร์ส่งข้อมูลชุดใหม่มา (บันทึก/เพิ่ม/ลบบรรทัดสำเร็จ)
  // ต้องเอาของจากเซิร์ฟเวอร์เป็นหลัก ไม่งั้นบรรทัดที่เพิ่งเพิ่มจะไม่โผล่
  const signature = useMemo(() => rows.map((r) => r.id).join(","), [rows]);
  useEffect(() => {
    setData(toRowState(rows));
    // ผูกกับ signature อย่างเดียว ถ้าผูกกับ rows ทั้งก้อนจะรีเซ็ตทุกครั้งที่หน้า render
    // ทำให้สิ่งที่กำลังพิมพ์ค้างไว้หายไปกลางคัน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // ผู้ใช้เลือกได้ว่าจะคิดยอดสะสมถึงเดือนไหน ค่าเริ่มต้นคือเดือนปัจจุบัน
  // (แบบฟอร์มต้นฉบับให้ผู้กรอกแก้ช่วงในสูตรเอง ซึ่งพลาดง่ายมาก)
  // บีบให้อยู่ในช่วง 1-12 เสมอ เพราะปีบัญชีที่ยังมาไม่ถึงจะได้ค่า 0
  // ซึ่งไม่ตรงกับตัวเลือกไหนเลย แล้วช่องเลือกจะแสดงไม่ตรงกับที่คิดจริง
  const [upto, setUpto] = useState(Math.min(MONTH_COUNT, Math.max(1, monthsElapsed)));

  const setCell = (
    rowId: string,
    field: "plan" | "actual",
    monthIndex: number,
    value: string
  ) => {
    setData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, [field]: r[field].map((v, i) => (i === monthIndex ? value : v)) }
          : r
      )
    );
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.success && state.message && (
        <p role="status" className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {state.message}
        </p>
      )}

      {/* ---- ส่วนหัวของแบบฟอร์ม ---- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold">ข้อมูลหัวแบบฟอร์ม</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="owner" className="mb-1.5 block text-sm font-medium">
              ผู้รับผิดชอบตัวชี้วัด
            </label>
            <input
              id="owner"
              name="owner"
              defaultValue={header.owner}
              readOnly={!canEdit}
              placeholder="เช่น การยางแห่งประเทศไทยเขตภาคเหนือ/กองแผนและวิชาการ"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none read-only:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            />
          </div>
          <div>
            <label htmlFor="budget" className="mb-1.5 block text-sm font-medium">
              งบประมาณ
            </label>
            <input
              id="budget"
              name="budget"
              defaultValue={header.budget}
              readOnly={!canEdit}
              placeholder="เช่น 71,000 บาท"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none read-only:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            />
          </div>
        </div>
      </section>

      {/* ---- ตัวเลือกเดือนที่ใช้คิดยอดสะสม ---- */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <label htmlFor="upto" className="font-medium">
          คิดยอดสะสมถึงเดือน
        </label>
        <select
          id="upto"
          value={upto}
          onChange={(e) => setUpto(Number(e.target.value))}
          className="min-h-11 rounded-lg border border-slate-300 px-3 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
        >
          {FISCAL_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-slate-500">ปีบัญชี {fiscalYear} · ค่าเริ่มต้นคือเดือนปัจจุบัน</span>

        {/* ปุ่มดาวน์โหลดอยู่ตรงนี้เพราะต้องส่งเดือนที่เลือกไปด้วย
            ไฟล์ที่ได้จะคิดยอดสะสมช่วงเดียวกับที่เห็นบนหน้าจอพอดี */}
        <a
          href={`/api/export/plan/${indicatorId}?upto=${upto}`}
          className="ml-auto inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-50"
        >
          ดาวน์โหลดเป็น Excel
        </a>
      </div>

      {PLAN_SECTIONS.map((section) => (
        <SectionTable
          key={section}
          section={section}
          canEdit={canEdit}
          rows={data.filter((r) => r.section === section)}
          upto={upto}
          onCell={setCell}
        />
      ))}

      {canEdit && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <SaveButton />
          <span className="text-sm text-slate-600">
            ตัวเลขที่พิมพ์จะยังไม่ถูกเก็บจนกว่าจะกดบันทึก
          </span>
        </div>
      )}
    </form>
  );
}

function SectionTable({
  section,
  canEdit,
  rows,
  upto,
  onCell,
}: {
  section: PlanSection;
  canEdit: boolean;
  rows: RowState[];
  upto: number;
  onCell: (rowId: string, field: "plan" | "actual", monthIndex: number, value: string) => void;
}) {
  const summary = summarizeSection(
    rows.map((r) => ({
      planMonths: r.plan.map(toNum),
      actualMonths: r.actual.map(toNum),
    })),
    upto
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="font-semibold">{PLAN_SECTION_TITLE[section]}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">
          ยังไม่มี{PLAN_SECTION_ITEM_LABEL[section]}ในตารางนี้
        </p>
      ) : (
        // ตารางกว้างกว่าจอเสมอเพราะมี 12 เดือน จึงให้เลื่อนแนวนอนในกรอบตัวเอง
        // ไม่ปล่อยให้ทั้งหน้าเลื่อนซ้ายขวา
        <div className="overflow-x-auto">
          {/* table-fixed + colgroup: บังคับความกว้างทุกคอลัมน์ตายตัว
              ถ้าปล่อยให้เบราว์เซอร์จัดเอง คอลัมน์ข้อความยาวจะไปบีบช่องตัวเลข
              จนเลข "100" เหลือ "10" ทั้งที่ตารางเลื่อนแนวนอนได้อยู่แล้ว */}
          <table className="w-[131rem] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-14" />
              <col className="w-72" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-16" />
              {FISCAL_MONTHS.map((m) => (
                <col key={m} className="w-12" />
              ))}
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-48" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-40" />
              {canEdit && <col className="w-16" />}
            </colgroup>

            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <Th>{PLAN_SECTION_INDEX_LABEL[section]}</Th>
                <Th className="text-left">{PLAN_SECTION_ITEM_LABEL[section]}</Th>
                <Th>ค่าเป้าหมาย</Th>
                <Th>หน่วยนับ</Th>
                <Th>แผน/ผล</Th>
                {FISCAL_MONTHS.map((m, i) => (
                  <Th key={m} className={i % 3 === 0 ? "border-l-2 border-l-slate-300" : ""}>
                    {m}
                  </Th>
                ))}
                <Th className="border-l-2 border-l-slate-300">
                  {PLAN_SECTION_CUM_LABEL[section]}
                </Th>
                <Th>{PLAN_SECTION_YEAR_LABEL[section]}</Th>
                <Th className="text-left">{PLAN_SECTION_CAUSE_LABEL[section]}</Th>
                <Th className="text-left">การดำเนินการแก้ไข</Th>
                <Th className="text-left">หลักฐานประกอบผลการดำเนินงาน</Th>
                <Th className="text-left">คำอธิบายเพิ่มเติม</Th>
                {canEdit && <Th>ลบ</Th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const s = summary.rows[index];
                return (
                  <RowPair
                    key={row.id}
                    row={row}
                    index={index}
                    canEdit={canEdit}
                    cumPct={s.cumPct}
                    yearPct={s.yearPct}
                    onCell={onCell}
                  />
                );
              })}

              {/* บรรทัดสรุปท้ายตาราง ตรงกับสูตร AVERAGE ในไฟล์ต้นฉบับ */}
              <tr className="bg-slate-50 font-medium">
                <td colSpan={5 + MONTH_COUNT} className="border border-slate-200 px-3 py-2.5">
                  ค่าเฉลี่ยร้อยละผลการดำเนินงานตามเป้าหมาย
                </td>
                <td className="border border-slate-200 px-2 py-2.5 text-right tabular-nums text-brand-800">
                  {formatPct(summary.avgCumPct)}
                </td>
                <td className="border border-slate-200 px-2 py-2.5 text-right tabular-nums text-brand-800">
                  {formatPct(summary.avgYearPct)}
                </td>
                <td colSpan={canEdit ? 5 : 4} className="border border-slate-200" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">
        {canEdit && (
          <button
            type="submit"
            name="intent"
            value={`add:${section}`}
            className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-brand-800 transition hover:border-brand-600 hover:bg-brand-50"
          >
            + เพิ่ม{PLAN_SECTION_ITEM_LABEL[section]}อีกหนึ่งบรรทัด
          </button>
        )}
        <p className="text-xs leading-relaxed text-slate-500">{PLAN_SECTION_GUIDE[section]}</p>
      </div>
    </section>
  );
}

function RowPair({
  row,
  index,
  canEdit,
  cumPct,
  yearPct,
  onCell,
}: {
  row: RowState;
  index: number;
  canEdit: boolean;
  cumPct: number;
  yearPct: number;
  onCell: (rowId: string, field: "plan" | "actual", monthIndex: number, value: string) => void;
}) {
  // 1 รายการกินสองบรรทัด (แผน/ผล) ช่องที่ใช้ร่วมกันจึงใช้ rowSpan
  // ให้หน้าตาตรงกับแบบฟอร์มกระดาษ
  const shared = "border border-slate-200 px-2 py-1.5 align-top";

  return (
    <>
      <tr className="hover:bg-slate-50/60">
        <td rowSpan={2} className={`${shared} text-center tabular-nums`}>
          {index + 1}
        </td>
        <td rowSpan={2} className={shared}>
          <textarea
            name={`title_${row.id}`}
            defaultValue={row.title}
            readOnly={!canEdit}
            rows={2}
            placeholder="พิมพ์ชื่อรายการ"
            className={`${textInput} resize-y read-only:bg-slate-50`}
          />
        </td>
        <td rowSpan={2} className={shared}>
          <input
            name={`target_${row.id}`}
            defaultValue={row.targetValue === null ? "" : String(row.targetValue)}
            readOnly={!canEdit}
            inputMode="decimal"
            className={`${textInput} text-right tabular-nums read-only:bg-slate-50`}
          />
        </td>
        <td rowSpan={2} className={shared}>
          <input
            name={`unit_${row.id}`}
            defaultValue={row.unit ?? ""}
            readOnly={!canEdit}
            placeholder="ไร่ / ครั้ง"
            className={`${textInput} read-only:bg-slate-50`}
          />
        </td>

        <td className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium">
          แผน
        </td>
        {row.plan.map((value, i) => (
          <MonthCell
            key={i}
            name={`p${i}_${row.id}`}
            value={value}
            readOnly={!canEdit}
            monthIndex={i}
            label={`แผนเดือน${FISCAL_MONTHS[i]}`}
            onChange={(v) => onCell(row.id, "plan", i, v)}
          />
        ))}

        <td
          rowSpan={2}
          className={`${shared} border-l-2 border-l-slate-300 text-right font-medium tabular-nums text-brand-800`}
        >
          {formatPct(cumPct)}
        </td>
        <td rowSpan={2} className={`${shared} text-right font-medium tabular-nums text-brand-800`}>
          {formatPct(yearPct)}
        </td>

        <td rowSpan={2} className={shared}>
          <textarea
            name={`cause_${row.id}`}
            defaultValue={row.causeNote ?? ""}
            readOnly={!canEdit}
            rows={2}
            className={`${textInput} resize-y read-only:bg-slate-50`}
          />
        </td>
        <td rowSpan={2} className={shared}>
          <textarea
            name={`fix_${row.id}`}
            defaultValue={row.correctiveAction ?? ""}
            readOnly={!canEdit}
            rows={2}
            className={`${textInput} resize-y read-only:bg-slate-50`}
          />
        </td>
        <td rowSpan={2} className={shared}>
          <textarea
            name={`evidence_${row.id}`}
            defaultValue={row.evidence ?? ""}
            readOnly={!canEdit}
            rows={2}
            placeholder="เช่น เอกสารแนบ 1"
            className={`${textInput} resize-y read-only:bg-slate-50`}
          />
        </td>
        <td rowSpan={2} className={shared}>
          <textarea
            name={`note_${row.id}`}
            defaultValue={row.note ?? ""}
            readOnly={!canEdit}
            rows={2}
            className={`${textInput} resize-y read-only:bg-slate-50`}
          />
        </td>

        {canEdit && (
          <td rowSpan={2} className={`${shared} text-center`}>
            <button
              type="submit"
              name="intent"
              value={`delete:${row.id}`}
              className="min-h-11 rounded-lg px-2 text-sm text-red-700 transition hover:bg-red-50"
              aria-label={`ลบบรรทัดที่ ${index + 1}`}
            >
              ลบ
            </button>
          </td>
        )}
      </tr>

      <tr className="hover:bg-slate-50/60">
        <td className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-medium">
          ผล
        </td>
        {row.actual.map((value, i) => (
          <MonthCell
            key={i}
            name={`a${i}_${row.id}`}
            value={value}
            readOnly={!canEdit}
            monthIndex={i}
            label={`ผลเดือน${FISCAL_MONTHS[i]}`}
            onChange={(v) => onCell(row.id, "actual", i, v)}
          />
        ))}
      </tr>
    </>
  );
}

function MonthCell({
  name,
  value,
  readOnly,
  monthIndex,
  label,
  onChange,
}: {
  name: string;
  value: string;
  readOnly: boolean;
  monthIndex: number;
  label: string;
  onChange: (value: string) => void;
}) {
  // ตีเส้นหนาทุก 3 เดือน ให้มองออกว่าไตรมาสไหนถึงไหน
  const quarterEdge = monthIndex % 3 === 0 ? "border-l-2 border-l-slate-300" : "";

  return (
    <td className={`border border-slate-200 p-0 ${quarterEdge}`}>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        inputMode="decimal"
        aria-label={`${label} (ไตรมาส ${monthQuarter(monthIndex)})`}
        className={cellInput}
      />
    </td>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-slate-200 px-2 py-2 text-center font-medium ${className}`}>
      {children}
    </th>
  );
}
