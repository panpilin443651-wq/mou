import { requireAdmin } from "@/lib/session";

export const metadata = { title: "ตั้งค่าระบบ | ระบบรายงานผล MOU" };

// requireAdmin ตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์
// ผู้ใช้ที่ไม่ใช่ ADMIN ต่อให้พิมพ์ URL เข้ามาตรงๆ ก็จะถูกส่งกลับหน้าภาพรวม
export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold sm:text-2xl">ตั้งค่าระบบ</h1>
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        จัดการปีบัญชี ช่วงเวลาเปิด-ปิดระบบ ส่วนงาน และผู้ใช้ จะพัฒนาใน Phase 5 และ 8
      </p>
    </div>
  );
}
