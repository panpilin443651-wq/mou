import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// ----------------------------------------------------------------------------
// ตัวเชื่อมต่อฐานข้อมูล (ใช้ร่วมกันทั้งระบบ)
//
// ต่อผ่าน Neon adapter ซึ่งวิ่งบน HTTPS พอร์ต 443
// แทนการต่อ PostgreSQL ตรงๆ ทางพอร์ต 5432
//
// ทำไมถึงต้องเป็นแบบนี้?
//   1. เครือข่ายหลายที่ (รวมถึงเน็ตที่ใช้พัฒนาอยู่) บล็อกพอร์ต 5432
//      พอบล็อกแล้วจะขึ้นว่า "Can't reach database server" ทั้งที่โค้ดไม่ได้ผิด
//   2. เป็นวิธีที่ Vercel แนะนำ เพราะฟังก์ชันบน Vercel เกิดใหม่ตลอด
//      การต่อแบบเดิมจะเปิดการเชื่อมต่อค้างไว้จนฐานข้อมูลปฏิเสธ
//
// หมายเหตุ: คำสั่ง prisma migrate / db push ยังใช้พอร์ต 5432 อยู่
// ถ้าต้องแก้โครงฐานข้อมูล ต้องอยู่บนเน็ตที่ไม่บล็อกพอร์ตนั้น
//
// ทำไมต้องเก็บไว้ใน globalThis?
// ตอนพัฒนา Next.js จะโหลดไฟล์ใหม่ทุกครั้งที่เราแก้โค้ด ถ้าสร้าง PrismaClient
// ใหม่ทุกครั้ง จะเปิดการเชื่อมต่อค้างไว้เรื่อยๆ จนฐานข้อมูลปฏิเสธการเชื่อมต่อ
// การเก็บไว้ใน globalThis ทำให้ใช้ตัวเดิมซ้ำได้
// ----------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("ยังไม่ได้ตั้งค่า DATABASE_URL ในไฟล์ .env");
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
