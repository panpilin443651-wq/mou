import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "เข้าสู่ระบบ | ระบบรายงานผล MOU" };

export default async function LoginPage() {
  // ถ้า login อยู่แล้วก็ไม่ต้องเห็นหน้านี้อีก
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold sm:text-2xl">ระบบรายงานผลการดำเนินงานตาม MOU</h1>
          <p className="mt-1.5 text-sm text-slate-600">การยางแห่งประเทศไทย</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          หากเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </main>
  );
}
