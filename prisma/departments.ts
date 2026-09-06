import { DepartmentType } from "@prisma/client";

// ============================================================================
// รายชื่อส่วนงาน 30 หน่วย ของการยางแห่งประเทศไทย (กยท.)
// ============================================================================
// ชื่อหน่วยงานดึงมาจากหน้าปกของ MOU ฉบับลงนาม ประจำปีบัญชี 2569
// ในโฟลเดอร์ "MOU 69 ฉบับลงนาม" (30 ไฟล์)
//
// การจัดประเภท (ยืนยันแล้ว):
//   INDEPENDENT_UNIT = หน่วยงานที่ไม่สังกัดส่วนงาน (10 หน่วย)
//                      กองจัดการโรงงาน + กองจัดการสวนยาง + นธก. + หกป.
//   DIVISION         = ส่วนงาน (20 หน่วย) - เขต ฝ่าย สำนัก สถาบัน
// ============================================================================

export type DepartmentSeed = {
  /// รหัสย่อตามที่ใช้ในชื่อไฟล์ MOU
  code: string;
  /// ชื่อเต็มตามที่ปรากฏบนหน้าปก MOU
  name: string;
  type: DepartmentType;
};

const DIVISION = DepartmentType.DIVISION;
const INDEPENDENT = DepartmentType.INDEPENDENT_UNIT;

export const departments: DepartmentSeed[] = [
  // ==== หน่วยงานที่ไม่สังกัดส่วนงาน (10 หน่วย) ====

  // ---- กองจัดการโรงงาน (5 หน่วย - ไม่มีโรงงาน 3) ----
  { code: "กจร.1", name: "กองจัดการโรงงาน 1", type: INDEPENDENT },
  { code: "กจร.2", name: "กองจัดการโรงงาน 2", type: INDEPENDENT },
  { code: "กจร.4", name: "กองจัดการโรงงาน 4", type: INDEPENDENT },
  { code: "กจร.5", name: "กองจัดการโรงงาน 5", type: INDEPENDENT },
  { code: "กจร.6", name: "กองจัดการโรงงาน 6", type: INDEPENDENT },

  // ---- กองจัดการสวนยาง (3 หน่วย) ----
  { code: "กจส.1", name: "กองจัดการสวนยาง 1", type: INDEPENDENT },
  { code: "กจส.2", name: "กองจัดการสวนยาง 2", type: INDEPENDENT },
  { code: "กจส.3", name: "กองจัดการสวนยาง 3", type: INDEPENDENT },

  // ---- หน่วยงานอิสระ (2 หน่วย) ----
  { code: "นธก.", name: "หน่วยธุรกิจ", type: INDEPENDENT },
  { code: "หกป.", name: "หน่วยกำกับดูแลการปฏิบัติตามกฎเกณฑ์", type: INDEPENDENT },

  // ==== ส่วนงาน (20 หน่วย) ====

  // ---- การยางแห่งประเทศไทยเขต (7 เขต) ----
  { code: "กยท.ข.น.", name: "เขตภาคเหนือ", type: DIVISION },
  { code: "กยท.ข.กอ.", name: "เขตภาคกลางและภาคตะวันออก", type: DIVISION },
  // ชื่อไฟล์ PDF สะกดเป็น "กบท.ข.อนบ." แต่ไฟล์ Word และเขตอื่นทุกเขตใช้ "กยท.ข." จึงยึดตามนี้
  { code: "กยท.ข.อนบ.", name: "เขตภาคตะวันออกเฉียงเหนือตอนบน", type: DIVISION },
  { code: "กยท.ข.อนล.", name: "เขตภาคตะวันออกเฉียงเหนือตอนล่าง", type: DIVISION },
  { code: "กยท.ข.ตบ.", name: "เขตภาคใต้ตอนบน", type: DIVISION },
  { code: "กยท.ข.ตก.", name: "เขตภาคใต้ตอนกลาง", type: DIVISION },
  { code: "กยท.ข.ตล.", name: "เขตภาคใต้ตอนล่าง", type: DIVISION },

  // ---- ฝ่าย (10 ฝ่าย) ----
  { code: "ฝกค.", name: "ฝ่ายการคลัง", type: DIVISION },
  { code: "ฝกม.", name: "ฝ่ายกฎหมาย", type: DIVISION },
  { code: "ฝทม.", name: "ฝ่ายทรัพยากรมนุษย์", type: DIVISION },
  { code: "ฝทส.", name: "ฝ่ายเทคโนโลยีสารสนเทศ", type: DIVISION },
  { code: "ฝบท.", name: "ฝ่ายบริหารทรัพย์สิน", type: DIVISION },
  { code: "ฝพก.", name: "ฝ่ายพัฒนาเกษตรกรและสถาบันเกษตรกร", type: DIVISION },
  { code: "ฝยศ.", name: "ฝ่ายยุทธศาสตร์องค์กร", type: DIVISION },
  { code: "ฝศย.", name: "ฝ่ายเศรษฐกิจยาง", type: DIVISION },
  { code: "ฝสผ.", name: "ฝ่ายส่งเสริมและพัฒนาการผลิต", type: DIVISION },
  { code: "ฝอย.", name: "ฝ่ายอุตสาหกรรมยาง", type: DIVISION },

  // ---- สำนัก / สถาบัน (3 หน่วย) ----
  { code: "สผว.", name: "สำนักผู้ว่าการ", type: DIVISION },
  { code: "สวย.", name: "สถาบันวิจัยยาง", type: DIVISION },
  { code: "สตส.", name: "สำนักตรวจสอบภายใน", type: DIVISION },
];
