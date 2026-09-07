import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canViewDepartment } from "@/lib/permissions";

// ============================================================================
// ดาวน์โหลดไฟล์แนบ ผ่านการตรวจสิทธิ์ก่อนเสมอ
// ============================================================================
// ไฟล์บน Blob เปิดให้ใครก็ตามที่รู้ URL เข้าถึงได้ (ชื่อไฟล์สุ่ม เดาไม่ได้)
// ระบบจึงไม่เคยส่ง URL จริงของไฟล์ออกไปให้เบราว์เซอร์เห็น
//
// เวลาผู้ใช้กดดาวน์โหลด จะมาที่นี่ก่อน เราตรวจสิทธิ์แล้วค่อยดึงไฟล์มาส่งต่อให้
// ผู้ใช้จึงเห็นแต่ที่อยู่ของระบบเรา ไม่เห็นที่อยู่จริงบน Blob
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new Response("กรุณาเข้าสู่ระบบ", { status: 401 });

  const { id } = await params;

  const attachment = await db.attachment.findUnique({
    where: { id },
    include: {
      report: { select: { indicator: { select: { departmentId: true } } } },
    },
  });
  if (!attachment) return new Response("ไม่พบไฟล์แนบนี้", { status: 404 });

  // ใครเห็นข้อมูลของส่วนงานนั้นได้ ก็เปิดไฟล์หลักฐานของส่วนงานนั้นได้
  if (!canViewDepartment(user, attachment.report.indicator.departmentId)) {
    return new Response("ไม่พบไฟล์แนบนี้", { status: 404 });
  }

  const upstream = await fetch(attachment.storagePath);
  if (!upstream.ok || !upstream.body) {
    return new Response("เปิดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", { status: 502 });
  }

  // ใส่ชื่อไฟล์เดิมกลับไป เพื่อให้ผู้ใช้ได้ไฟล์ชื่อเดียวกับที่อัปโหลดมา
  // เข้ารหัสชื่อไฟล์เพราะชื่อภาษาไทยใส่ตรงๆ ใน header ไม่ได้
  const encodedName = encodeURIComponent(attachment.originalName);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.sizeBytes),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      // ห้ามให้ตัวกลางเก็บไฟล์ไว้แชร์ต่อ เพราะเป็นเอกสารที่จำกัดสิทธิ์การเข้าถึง
      "Cache-Control": "private, no-store",
    },
  });
}
