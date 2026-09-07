// ============================================================================
// นำเข้าข้อความ "ค่าเกณฑ์วัด 5 ระดับ" จาก MOU เข้าฐานข้อมูล
// ============================================================================
// ข้อมูลต้นทางคือ prisma/criteria.json ซึ่งดึงมาจากไฟล์ MOU ฉบับลงนาม (Word)
//
// วิธีรัน:
//   npx tsx prisma/import-criteria.ts            ดูผลอย่างเดียว ยังไม่บันทึก
//   npx tsx prisma/import-criteria.ts --apply    บันทึกจริง
//
// การตรวจสอบความถูกต้อง:
//   ตัวชี้วัดที่เป็นตัวเลข (เช่น "111.00 บาทต่อไร่") จะถูกเทียบกับค่าเกณฑ์
//   ที่มีอยู่ในฐานข้อมูลอยู่แล้ว ถ้าตัวเลขในข้อความตรงกับค่าที่เก็บไว้
//   แปลว่าจับคู่ตัวชี้วัดถูกตัวแน่นอน ไม่ได้เดา
// ============================================================================

import { db } from "../src/lib/db";
import criteriaData from "./criteria.json";

type LevelMap = Record<string, string>;
type Rubric = { text: string; points: string };
type Entry = { levels: LevelMap; definition?: string; rubric?: Rubric[] };
type Data = Record<string, Record<string, Entry>>;

const data = criteriaData as unknown as Data;
const apply = process.argv.includes("--apply");

/** ดึงตัวเลขทุกตัวในข้อความ เพื่อเทียบกับค่าเกณฑ์ที่เก็บไว้ */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/-?\d+(?:,\d{3})*(?:\.\d+)?/g)]
    .map((m) => Number(m[0].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
}

async function main() {
  const fiscalYear = await db.fiscalYear.findFirst({ where: { isActive: true } });
  if (!fiscalYear) throw new Error("ไม่พบปีบัญชีที่ใช้งานอยู่");

  let updated = 0;
  let verified = 0;
  let conflicted = 0;
  let notFound = 0;
  let definitionsFilled = 0;
  let rubricsFilled = 0;
  const conflicts: string[] = [];
  const missing: string[] = [];

  for (const [deptCode, byIndicator] of Object.entries(data)) {
    const department = await db.department.findUnique({
      where: { code: deptCode },
      select: { id: true },
    });
    if (!department) {
      missing.push(`ไม่พบส่วนงาน ${deptCode}`);
      continue;
    }

    for (const [indicatorCode, entry] of Object.entries(byIndicator)) {
      const indicator = await db.indicator.findUnique({
        where: {
          fiscalYearId_departmentId_code: {
            fiscalYearId: fiscalYear.id,
            departmentId: department.id,
            code: indicatorCode,
          },
        },
        include: { criteria: { orderBy: { level: "asc" } } },
      });

      if (!indicator) {
        notFound++;
        missing.push(`${deptCode} ข้อ ${indicatorCode}`);
        continue;
      }

      // คำจำกัดความและตารางให้คะแนนย่อย เก็บที่ตัวชี้วัด ไม่ใช่ที่เกณฑ์รายระดับ
      const indicatorPatch: { description?: string; criteriaNote?: string } = {};
      if (entry.definition && !indicator.description) {
        indicatorPatch.description = entry.definition;
        definitionsFilled++;
      }
      if (entry.rubric?.length) {
        indicatorPatch.criteriaNote = entry.rubric
          .map((r) => `${r.text} — ${r.points}`)
          .join("\n");
        rubricsFilled++;
      }
      if (apply && Object.keys(indicatorPatch).length) {
        await db.indicator.update({ where: { id: indicator.id }, data: indicatorPatch });
      }

      for (const [levelStr, text] of Object.entries(entry.levels)) {
        const level = Number(levelStr);
        const existing = indicator.criteria.find((c) => c.level === level);
        if (!existing) continue;

        // เทียบกับตัวเลขที่เก็บไว้ ถ้าตรงแปลว่าจับคู่ถูกตัวแน่นอน
        //
        // ตรวจได้เฉพาะตัวชี้วัดที่ค่าเกณฑ์เป็น "ค่าที่วัดได้จริง" เช่น บาท/ไร่ หรือ ร้อยละ
        // ตัวชี้วัดหน่วย "ระดับ" เก็บค่าเกณฑ์เป็นเลขระดับ 1-5 เฉยๆ (ระดับ 3 = 3)
        // ซึ่งไม่มีทางตรงกับตัวเลขในข้อความอยู่แล้ว จึงข้ามไป ไม่นับว่าขัดแย้ง
        const isOrdinal =
          indicator.unit.trim() === "ระดับ" || existing.targetValue === level;

        if (existing.targetValue !== null && !isOrdinal) {
          const nums = numbersIn(text);
          if (nums.length > 0) {
            if (nums.some((n) => Math.abs(n - existing.targetValue!) < 0.005)) {
              verified++;
            } else {
              conflicted++;
              if (conflicts.length < 15) {
                conflicts.push(
                  `${deptCode} ข้อ ${indicatorCode} ระดับ ${level}: ฐานข้อมูลเก็บ ${existing.targetValue} · ข้อความว่า "${text.slice(0, 60)}"`
                );
              }
            }
          }
        }

        if (apply) {
          await db.scoreCriteria.update({ where: { id: existing.id }, data: { description: text } });
        }
        updated++;
      }
    }
  }

  console.log(apply ? "=== บันทึกลงฐานข้อมูลแล้ว ===" : "=== ทดลองรัน ยังไม่บันทึก ===");
  console.log(`เกณฑ์ที่จะอัปเดต            ${updated} รายการ`);
  console.log(`ยืนยันถูกต้องด้วยตัวเลข     ${verified} รายการ`);
  console.log(`ตัวเลขไม่ตรง (ต้องตรวจมือ)  ${conflicted} รายการ`);
  console.log(`หาตัวชี้วัดในระบบไม่เจอ      ${notFound} รายการ`);
  console.log(`เติมคำจำกัดความให้ตัวชี้วัด  ${definitionsFilled} รายการ`);
  console.log(`เติมตารางคะแนนย่อย          ${rubricsFilled} รายการ`);

  if (conflicts.length) {
    console.log("\nรายการที่ตัวเลขไม่ตรง (แสดง 15 รายการแรก):");
    for (const c of conflicts) console.log("  " + c);
  }
  if (missing.length) {
    console.log(`\nจับคู่กับตัวชี้วัดในระบบไม่ได้ ${missing.length} รายการ:`);
    for (const m of missing.slice(0, 10)) console.log("  " + m);
  }

  if (!apply) console.log("\nถ้าผลถูกต้องแล้ว รันซ้ำด้วย --apply เพื่อบันทึกจริง");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("ผิดพลาด:", e);
  await db.$disconnect();
  process.exit(1);
});
