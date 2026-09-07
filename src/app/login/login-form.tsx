"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/actions/auth";

// "use client" = คอมโพเนนต์นี้ทำงานบนเบราว์เซอร์
// จำเป็นเพราะต้องใช้ state เพื่อแสดงข้อความ error และสถานะกำลังส่งข้อมูล

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          อีเมล
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          // inputMode ช่วยให้แป้นพิมพ์บนมือถือขึ้นปุ่ม @ ให้อัตโนมัติ
          inputMode="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
