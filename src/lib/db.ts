import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// ----------------------------------------------------------------------------
// ตัวเชื่อมต่อฐานข้อมูล (ใช้ร่วมกันทั้งระบบ)
//
// ต่อผ่าน Neon adapter ซึ่งวิ่งบน HTTPS พอร์ต 443
// แทนการต่อ PostgreSQL ตรงๆ ทางพอร์ต 5432
//
// ทำไมถึงต้องเป็นแบบนี้?
//   1. เครือข่ายหลายที่บล็อกพอร์ต 5432
//      พอบล็อกแล้วจะขึ้นว่า "Can't reach database server" ทั้งที่โค้ดไม่ได้ผิด
//   2. เป็นวิธีที่ Vercel แนะนำ เพราะฟังก์ชันบน Vercel เกิดใหม่ตลอด
//      การต่อแบบเดิมจะเปิดการเชื่อมต่อค้างไว้จนฐานข้อมูลปฏิเสธ
//
// หมายเหตุ: คำสั่ง prisma migrate / db push ยังใช้พอร์ต 5432 อยู่
// ถ้าต้องแก้โครงฐานข้อมูล ต้องอยู่บนเน็ตที่ไม่บล็อกพอร์ตนั้น
//
// ----------------------------------------------------------------------------
// ทำไมต้องสร้างตัวเชื่อมต่อแบบ "รอจนกว่าจะใช้จริง"?
//
// ตอน build Next.js จะไล่โหลดไฟล์ของทุกหน้าเพื่อเก็บข้อมูล
// ถ้าอ่าน DATABASE_URL ตั้งแต่ตอนโหลดไฟล์ แล้วยังไม่ได้ตั้งค่าไว้
// การ build จะล้มทันทีด้วยข้อความ "Failed to collect page data"
// ทั้งที่ตอน build ไม่ได้ต้องใช้ฐานข้อมูลเลยสักนิด
//
// จึงเลื่อนไปสร้างตอนมีคนเรียกใช้จริง (ตอนมีคนเปิดเว็บ) ซึ่งตอนนั้น
// ค่าที่ตั้งไว้บน Vercel จะพร้อมแล้วเสมอ
// ----------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (client) return client;

  // ตอนพัฒนา Next.js โหลดไฟล์ใหม่ทุกครั้งที่แก้โค้ด ถ้าสร้างตัวใหม่ทุกครั้ง
  // จะเปิดการเชื่อมต่อค้างไว้เรื่อยๆ จนฐานข้อมูลปฏิเสธ จึงใช้ตัวเดิมซ้ำ
  if (globalForPrisma.prisma) {
    client = globalForPrisma.prisma;
    return client;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า DATABASE_URL — ถ้ารันบนเครื่องให้ใส่ในไฟล์ .env " +
        "ถ้าอยู่บน Vercel ให้ใส่ที่ Project Settings > Environment Variables"
    );
  }

  client = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

/**
 * ใช้งานเหมือน PrismaClient ทุกอย่าง เช่น `db.user.findMany()`
 * ต่างกันแค่ตัวเชื่อมต่อจริงจะถูกสร้างตอนเรียกใช้ครั้งแรกเท่านั้น
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance, property, receiver);
    // ผูก this กลับไปที่ตัวจริง ไม่งั้นเมธอดอย่าง $transaction จะหา this ไม่เจอ
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
