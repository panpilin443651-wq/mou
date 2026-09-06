import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// ============================================================================
// บอก TypeScript ว่า session ของระบบเรามีข้อมูลอะไรเพิ่มจากค่ามาตรฐาน
// ทำให้เขียน session.user.role แล้วไม่ error และมี autocomplete
// ============================================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    departmentId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    departmentId: string | null;
  }
}

// Auth.js v5 ใช้ type ของ JWT จาก @auth/core ภายใน จึงต้องประกาศเพิ่มที่นี่ด้วย
// ไม่เช่นนั้น token.role จะยังเป็น unknown ใน callback
declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    departmentId: string | null;
  }
}
