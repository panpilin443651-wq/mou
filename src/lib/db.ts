import { PrismaClient } from "@prisma/client";

// ----------------------------------------------------------------------------
// ตัวเชื่อมต่อฐานข้อมูล (ใช้ร่วมกันทั้งระบบ)
//
// ทำไมต้องเก็บไว้ใน globalThis?
// ตอนพัฒนา Next.js จะโหลดไฟล์ใหม่ทุกครั้งที่เราแก้โค้ด ถ้าสร้าง PrismaClient
// ใหม่ทุกครั้ง จะเปิดการเชื่อมต่อค้างไว้เรื่อยๆ จนฐานข้อมูลปฏิเสธการเชื่อมต่อ
// การเก็บไว้ใน globalThis ทำให้ใช้ตัวเดิมซ้ำได้
// ----------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
