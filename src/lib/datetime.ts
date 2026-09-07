// ============================================================================
// การจัดการวันเวลา - จุดที่พลาดง่ายที่สุดของทั้งระบบ
// ============================================================================
// เซิร์ฟเวอร์ (โดยเฉพาะบน Vercel) ทำงานด้วยเวลา UTC เสมอ
// แต่ผู้ใช้ทุกคนคิดเป็นเวลาไทย (UTC+7)
//
// กฎของโครงการนี้:
//   1. ฐานข้อมูลเก็บเป็น UTC เท่านั้น
//   2. แปลงเป็นเวลาไทยเฉพาะตอนแสดงผลบนหน้าจอ
//   3. รับค่าจากฟอร์มเป็นเวลาไทย แล้วแปลงเป็น UTC ก่อนบันทึก
//
// ถ้าไม่ทำตามนี้ ระบบจะเปิด-ปิดคลาดเคลื่อนไป 7 ชั่วโมง
// ============================================================================

const BANGKOK_OFFSET_HOURS = 7;
export const BANGKOK_TIMEZONE = "Asia/Bangkok";

/**
 * แปลงวันที่จากช่อง input type="date" (ได้มาเป็น "2568-10-01" ตามปฏิทินไทย
 * ที่ผู้ใช้เห็น แต่ค่าจริงเป็น ค.ศ.) ให้เป็นเวลา UTC สำหรับเก็บลงฐานข้อมูล
 *
 * @param dateString รูปแบบ YYYY-MM-DD (ค.ศ.)
 * @param endOfDay   true = สิ้นสุดวัน 23:59:59 ตามเวลาไทย
 */
export function bangkokDateToUtc(dateString: string, endOfDay = false): Date | null {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;

  return new Date(
    Date.UTC(Number(y), Number(m) - 1, Number(d), hour - BANGKOK_OFFSET_HOURS, minute, second)
  );
}

/**
 * แปลงค่าจากช่อง input type="datetime-local" (รูปแบบ "2026-01-31T23:59")
 * ให้เป็นเวลา UTC สำหรับเก็บลงฐานข้อมูล
 *
 * ถือว่าเวลาที่กรอกเป็น "เวลาไทย" เสมอ ไม่ใช่เวลาของเครื่องผู้ใช้
 * เพราะถ้าผู้ดูแลระบบเปิดหน้านี้จากเครื่องที่ตั้งโซนเวลาอื่น
 * เวลาปิดระบบจะเพี้ยนไปทั้งองค์กร
 */
export function bangkokDateTimeToUtc(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, y, m, d, hh, mm, ss] = match;
  return new Date(
    Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh) - BANGKOK_OFFSET_HOURS,
      Number(mm),
      ss ? Number(ss) : 0
    )
  );
}

/** แปลงเวลาจากฐานข้อมูล (UTC) กลับเป็นรูปแบบของช่อง datetime-local ตามเวลาไทย */
export function utcToBangkokDateTimeInput(date: Date): string {
  const shifted = new Date(date.getTime() + BANGKOK_OFFSET_HOURS * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** แปลงวันที่จากฐานข้อมูล (UTC) กลับเป็น YYYY-MM-DD ตามเวลาไทย สำหรับเติมในฟอร์ม */
export function utcToBangkokDateInput(date: Date): string {
  const shifted = new Date(date.getTime() + BANGKOK_OFFSET_HOURS * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** แสดงวันที่แบบไทย เช่น "1 ต.ค. 2568" (พ.ศ.) */
export function formatThaiDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** แสดงวันที่พร้อมเวลาแบบไทย เช่น "1 ต.ค. 2568 08:30 น." */
export function formatThaiDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${formatted} น.`;
}

/**
 * ปีบัญชีของ กยท. เริ่ม 1 ต.ค. ของปีก่อนหน้า และจบ 30 ก.ย. ของปีนั้น
 * เช่น ปีบัญชี 2569 = 1 ต.ค. 2568 ถึง 30 ก.ย. 2569
 *
 * @param buddhistYear ปี พ.ศ. เช่น 2570
 */
export function defaultFiscalYearRange(buddhistYear: number) {
  const gregorianEnd = buddhistYear - 543;
  return {
    startDate: new Date(Date.UTC(gregorianEnd - 1, 9, 1, -BANGKOK_OFFSET_HOURS)),
    endDate: new Date(Date.UTC(gregorianEnd, 8, 30, 23 - BANGKOK_OFFSET_HOURS, 59, 59)),
  };
}

/**
 * ช่วงเวลาเปิด-ปิดรับรายงานเริ่มต้นของแต่ละไตรมาส
 * หลักการ: เปิดให้กรอกหลังจบไตรมาส แล้วให้เวลา 1 เดือน
 * ADMIN ปรับให้ตรงปฏิทินจริงได้ภายหลัง
 */
export function defaultSubmissionWindows(buddhistYear: number) {
  const g = buddhistYear - 543; // ปี ค.ศ. ที่ปีบัญชีสิ้นสุด
  const utc = (year: number, month: number, day: number, endOfDay = false) =>
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        (endOfDay ? 23 : 0) - BANGKOK_OFFSET_HOURS,
        endOfDay ? 59 : 0
      )
    );

  return [
    { quarter: 1, openAt: utc(g, 1, 1), closeAt: utc(g, 1, 31, true) },
    { quarter: 2, openAt: utc(g, 4, 1), closeAt: utc(g, 4, 30, true) },
    { quarter: 3, openAt: utc(g, 7, 1), closeAt: utc(g, 7, 31, true) },
    { quarter: 4, openAt: utc(g, 10, 1), closeAt: utc(g, 10, 31, true) },
  ];
}
