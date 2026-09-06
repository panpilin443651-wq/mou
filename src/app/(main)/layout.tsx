import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL, visibleMenus } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logoutAction } from "@/actions/auth";
import { MobileNav } from "./mobile-nav";

// โฟลเดอร์ (main) ที่มีวงเล็บ = จัดกลุ่มไฟล์โดยไม่กลายเป็นส่วนหนึ่งของ URL
// ทุกหน้าในกลุ่มนี้จะได้แถบเมนูนี้ และต้อง login ก่อนเสมอ

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const menus = visibleMenus(user);

  // แสดงชื่อส่วนงานที่สังกัด เพื่อให้ผู้ใช้เห็นชัดว่ากำลังดูข้อมูลของหน่วยไหน
  const department = user.departmentId
    ? await db.department.findUnique({
        where: { id: user.departmentId },
        select: { code: true, name: true },
      })
    : null;

  const links = [
    { href: "/dashboard", label: "ภาพรวม", show: menus.dashboard },
    { href: "/indicators", label: "ตัวชี้วัด", show: menus.indicators },
    { href: "/reports", label: "รายงานผล", show: menus.reports },
    { href: "/plans", label: "แผนดำเนินงาน", show: menus.plans },
    { href: "/admin", label: "ตั้งค่าระบบ", show: menus.admin },
    { href: "/account", label: "บัญชีของฉัน", show: true },
  ].filter((l) => l.show);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        {/* relative จำเป็นสำหรับให้เมนูมือถือเลื่อนลงมาวางตำแหน่งถูกต้อง */}
        <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <MobileNav links={links} />

          <Link href="/dashboard" className="min-w-0 flex-1">
            <span className="block truncate font-semibold">ระบบรายงานผล MOU</span>
            <span className="block truncate text-xs text-slate-500">
              {department ? `${department.code} ${department.name}` : ROLE_LABEL[user.role]}
            </span>
          </Link>

          {/* เมนูแนวนอนสำหรับจอใหญ่ - จอเล็กใช้เมนูแบบเลื่อนออกแทน */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
