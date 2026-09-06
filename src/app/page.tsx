import Link from "next/link";
import { db } from "@/lib/db";

// หน้านี้เปิดได้โดยไม่ต้อง login จึงแสดงแค่สถานะการติดตั้ง
// ไม่แสดงข้อมูลตัวชี้วัดหรือข้อมูลส่วนงานใดๆ
export const dynamic = "force-dynamic";

async function checkDatabase() {
  try {
    const departments = await db.department.count();
    const users = await db.user.count();
    return { connected: true as const, hasData: departments > 0, hasUsers: users > 0 };
  } catch (error) {
    return {
      connected: false as const,
      message: error instanceof Error ? error.message : "ไม่ทราบสาเหตุ",
    };
  }
}

export default async function HomePage() {
  const status = await checkDatabase();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">ระบบรายงานผลการดำเนินงานตาม MOU</h1>
      <p className="mt-2 text-slate-600">การยางแห่งประเทศไทย</p>

      {status.connected && status.hasData && status.hasUsers ? (
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-800"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">ยังติดตั้งไม่เสร็จ</h2>

          {!status.connected ? (
            <>
              <p className="mt-3 text-sm text-red-700">ยังเชื่อมต่อฐานข้อมูลไม่ได้</p>
              <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-slate-700">
                <li>
                  ใส่ connection string จาก Neon ลงในไฟล์{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code> ที่ตัวแปร{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5">DATABASE_URL</code>
                </li>
                <li>
                  รัน <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run db:migrate</code>
                </li>
                <li>
                  รัน <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run db:seed</code>
                </li>
              </ol>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                {status.message}
              </pre>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-700">
              เชื่อมต่อฐานข้อมูลได้แล้ว แต่ยังไม่มีข้อมูลตั้งต้น ให้รันคำสั่ง{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run db:seed</code>
            </p>
          )}
        </section>
      )}
    </main>
  );
}
