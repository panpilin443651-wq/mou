import raw from "../../prisma/department-scores.json";

// ============================================================================
// คะแนนภาพรวมของแต่ละส่วนงาน (จากไฟล์ Excel ของส่วนกลาง)
// ============================================================================
// ที่มา: คะแนน MOU/ส่งให้ HR คะแนน MOU 69 และน้ำหนัก.xlsx
//
// ทำไมเก็บเป็นไฟล์ ไม่เก็บในฐานข้อมูล?
//   เป็นตัวเลขสรุปที่ส่วนกลางจัดทำปีละครั้ง ไม่ได้แก้ระหว่างปี
//   และต้นทางก็เป็นไฟล์ Excel อยู่แล้ว เก็บเป็นไฟล์จึงตรงกับความเป็นจริง
//   ถ้าภายหลังต้องการแก้ตัวเลขในระบบได้เอง ค่อยย้ายไปเก็บในฐานข้อมูล
//
// วิธีอัปเดตเมื่อได้ไฟล์ปีใหม่:
//   วางไฟล์ทับที่เดิม แล้วรันสคริปต์ที่สร้าง prisma/department-scores.json ใหม่
// ============================================================================

export type DepartmentScoreRow = {
  rank: number;
  /** รหัสส่วนงานที่ใช้ในระบบ */
  code: string;
  /** ชื่อตามที่เขียนในไฟล์ Excel (บางแห่งใช้ชื่อเต็ม) */
  sourceName: string;
  /** คะแนนถ่วงน้ำหนักของส่วนงาน (MOU) เต็ม 5 */
  mouScore: number;
  /** คะแนนถ่วงน้ำหนักของส่วนงานที่รับผิดชอบตัวชี้วัดองค์กร (PA) */
  paScore: number | null;
  /** false = มีในไฟล์แต่ไม่มีส่วนงานนี้ในระบบแล้ว */
  inSystem: boolean;
};

export type DepartmentScoreData = {
  source: string;
  fiscalYear: number;
  columns: { mouScore: string; paScore: string };
  departments: DepartmentScoreRow[];
};

export const departmentScores = raw as DepartmentScoreData;

/** คะแนนของส่วนงานเดียว ใช้ตอน DEPT_USER เข้าดูภาพรวมของตัวเอง */
export function scoreOfDepartment(code: string): DepartmentScoreRow | null {
  return departmentScores.departments.find((d) => d.code === code) ?? null;
}

/** คะแนนเต็มของ MOU คือ 5 ใช้เป็นฐานของแถบเปรียบเทียบ */
export const MOU_SCORE_MAX = 5;
