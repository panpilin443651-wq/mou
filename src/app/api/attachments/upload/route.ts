import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canSubmitReport } from "@/lib/permissions";
import { ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/attachments";

// ============================================================================
// จุดออก "บัตรผ่าน" ให้เบราว์เซอร์อัปโหลดไฟล์ตรงไปที่ Vercel Blob
// ============================================================================
// เบราว์เซอร์จะขอบัตรผ่านจากที่นี่ก่อน แล้วค่อยส่งไฟล์ตรงไป Blob เอง
//
// การตรวจสิทธิ์ทั้งหมดต้องเกิดตรงนี้ ก่อนออกบัตรผ่าน
// ถ้าไปตรวจหลังอัปโหลดเสร็จ ไฟล์จะขึ้นไปอยู่บน Blob เรียบร้อยแล้ว
// ต่อให้ปฏิเสธทีหลังก็สายเกินไป
// ============================================================================

export const dynamic = "force-dynamic";

type ClientPayload = {
  indicatorId: string;
  quarter: number;
  criteriaLevel: number;
};

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // 1. ต้อง login ก่อน
        const user = await getCurrentUser();
        if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนแนบไฟล์");

        // 2. ข้อมูลที่เบราว์เซอร์ส่งมาต้องอ่านได้และครบ
        if (!clientPayload) throw new Error("ข้อมูลประกอบการอัปโหลดไม่ครบ");
        let payload: ClientPayload;
        try {
          payload = JSON.parse(clientPayload) as ClientPayload;
        } catch {
          throw new Error("ข้อมูลประกอบการอัปโหลดไม่ถูกต้อง");
        }

        const { indicatorId, quarter, criteriaLevel } = payload;
        if (![1, 2, 3, 4].includes(quarter)) throw new Error("ไตรมาสไม่ถูกต้อง");
        if (![1, 2, 3, 4, 5].includes(criteriaLevel)) {
          throw new Error("ระดับคะแนนไม่ถูกต้อง");
        }

        // 3. ตัวชี้วัดต้องมีอยู่จริง และผู้ใช้ต้องมีสิทธิ์กรอกผลของส่วนงานนั้น
        const indicator = await db.indicator.findUnique({
          where: { id: indicatorId },
          select: { id: true, departmentId: true },
        });
        if (!indicator) throw new Error("ไม่พบตัวชี้วัดนี้");
        if (!canSubmitReport(user, indicator.departmentId)) {
          throw new Error("คุณไม่มีสิทธิ์แนบไฟล์ของส่วนงานนี้");
        }

        // TODO Phase 8: ตรวจ SubmissionWindow ตรงนี้ด้วย
        // ต้องตรวจตอนออกบัตรผ่าน ไม่ใช่ตอนบันทึกข้อมูลไฟล์

        return {
          // Blob จะปฏิเสธเองถ้าไฟล์ผิดชนิดหรือใหญ่เกิน ไม่ต้องรอมาตรวจทีหลัง
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_BYTES,
          // เติมตัวอักษรสุ่มท้ายชื่อไฟล์ กันชื่อชนกันและกันคนเดาที่อยู่ไฟล์
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ indicatorId, quarter, criteriaLevel }),
        };
      },

      // Vercel เรียกกลับมาที่นี่เมื่ออัปโหลดเสร็จ แต่เรียกไม่ถึงตอนรันบนเครื่องตัวเอง
      // การบันทึกลงฐานข้อมูลจึงทำที่ Server Action หลังอัปโหลดเสร็จแทน
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
