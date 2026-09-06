"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

// ============================================================================
// Server Action - โค้ดส่วนนี้ทำงานบนเซิร์ฟเวอร์เท่านั้น
// หน้าเว็บเรียกใช้ผ่านฟอร์มได้เลย โดยไม่ต้องเขียน API แยก
// ============================================================================

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
    return { error: null };
  } catch (error) {
    // next/navigation ใช้การโยน error เพื่อสั่ง redirect
    // ถ้าดักไว้เองจะทำให้ redirect ไม่ทำงาน จึงต้องโยนต่อ
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;

    if (error instanceof AuthError) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    return { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
