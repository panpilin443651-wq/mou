import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { formatThaiDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่าระบบ | ระบบรายงานผล MOU" };

// requireAdmin ตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์
// ผู้ใช้ที่ไม่ใช่ ADMIN ต่อให้พิมพ์ URL เข้ามาตรงๆ ก็จะถูกส่งกลับหน้าภาพรวม
export default async function AdminPage() {
  await requireAdmin();

  const [activeYear, yearCount, userCount, activeUserCount, departmentCount, coveredDepts] =
    await Promise.all([
      db.fiscalYear.findFirst({ where: { isActive: true } }),
      db.fiscalYear.count(),
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.department.count({ where: { isActive: true } }),
      db.user.findMany({
        where: { isActive: true, departmentId: { not: null } },
        select: { departmentId: true },
        distinct: ["departmentId"],
      }),
    ]);

  const indicatorCount = activeYear
    ? await db.indicator.count({ where: { fiscalYearId: activeYear.id } })
    : 0;

  const uncoveredCount = departmentCount - coveredDepts.length;

  const cards = [
    {
      href: "/admin/users",
      title: "จัดการผู้ใช้",
      description:
        "สร้างบัญชีให้ผู้รับผิดชอบแต่ละส่วนงาน กำหนดสิทธิ์และสังกัด ตั้งรหัสผ่านใหม่ให้คนที่ลืมรหัส",
      stat: `${activeUserCount.toLocaleString("th-TH")} บัญชีที่ใช้งาน จากทั้งหมด ${userCount.toLocaleString("th-TH")} บัญชี`,
      warning:
        uncoveredCount > 0
          ? `ยังไม่มีผู้รับผิดชอบ ${uncoveredCount} ส่วนงาน — ส่วนงานเหล่านี้จะกรอกผลไม่ได้`
          : null,
      ready: true,
    },
    {
      href: "/admin/fiscal-years",
      title: "ปีบัญชี",
      description:
        "เพิ่มปีบัญชีใหม่ สลับปีที่ระบบใช้งาน และคัดลอกตัวชี้วัดพร้อมเกณฑ์คะแนนจากปีก่อนมาตั้งต้น",
      stat: activeYear
        ? `กำลังใช้ปี ${activeYear.year} (${formatThaiDate(activeYear.startDate)} – ${formatThaiDate(activeYear.endDate)}) · มีทั้งหมด ${yearCount} ปี`
        : "ยังไม่ได้เลือกปีบัญชีที่ใช้งาน",
      warning: activeYear
        ? null
        : "ยังไม่มีปีบัญชีที่ใช้งาน หน้าตัวชี้วัดและภาพรวมจะยังไม่แสดงข้อมูล",
      ready: true,
    },
    {
      href: "/indicators",
      title: "ตัวชี้วัด",
      description: "เพิ่ม แก้ไข และกำหนดเกณฑ์คะแนน 1–5 ของตัวชี้วัดแต่ละรายการ",
      stat: activeYear
        ? `${indicatorCount.toLocaleString("th-TH")} ตัวชี้วัดในปีบัญชี ${activeYear.year}`
        : "-",
      warning: null,
      ready: true,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">ตั้งค่าระบบ</h1>
        <p className="mt-1 text-sm text-slate-600">
          เมนูสำหรับส่วนกลางเท่านั้น ผู้รับผิดชอบส่วนงานและผู้บริหารเข้าหน้านี้ไม่ได้
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-600 hover:shadow"
          >
            <h2 className="font-semibold text-emerald-800">{card.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{card.description}</p>
            <p className="mt-3 text-sm font-medium tabular-nums">{card.stat}</p>
            {card.warning && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                {card.warning}
              </p>
            )}
          </Link>
        ))}

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h2 className="font-semibold text-slate-500">ช่วงเวลาเปิด-ปิดระบบ</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            กำหนดวันเวลาที่เปิดให้ส่วนงานกรอกผลและแนบไฟล์ของแต่ละไตรมาส
            รวมถึงการขยายเวลาเฉพาะส่วนงาน
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">จะพัฒนาใน Phase 8</p>
          <p className="mt-2 text-xs text-slate-500">
            ตอนนี้ระบบสร้างช่วงเวลาตั้งต้นให้ 4 ไตรมาสอัตโนมัติเมื่อเพิ่มปีบัญชีใหม่
          </p>
        </div>
      </div>
    </div>
  );
}
