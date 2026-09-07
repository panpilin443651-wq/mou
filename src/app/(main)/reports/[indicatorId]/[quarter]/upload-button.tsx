"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { recordAttachmentAction } from "@/actions/attachments";
import {
  ALLOWED_LABEL,
  FILE_INPUT_ACCEPT,
  MAX_FILE_BYTES,
  formatBytes,
} from "@/lib/attachments";

// ปุ่มแนบไฟล์หลักฐานของระดับคะแนนหนึ่งระดับ
//
// ไฟล์ถูกส่งตรงจากเบราว์เซอร์ไปที่ Vercel Blob ไม่ผ่านเซิร์ฟเวอร์ของเรา
// เพราะ Vercel จำกัดขนาดข้อมูลที่ส่งเข้าฟังก์ชันไว้แค่ 4.5 MB
// พออัปโหลดเสร็จจึงค่อยบอกเซิร์ฟเวอร์ให้บันทึกข้อมูลไฟล์ลงฐานข้อมูล

export function UploadButton({
  indicatorId,
  quarter,
  criteriaLevel,
}: {
  indicatorId: string;
  quarter: number;
  criteriaLevel: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    // ตรวจขนาดตั้งแต่ในเบราว์เซอร์ เพื่อไม่ให้ผู้ใช้เสียเวลารออัปโหลดไฟล์ที่ใหญ่เกิน
    // (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นอยู่แล้ว ตรงนี้แค่ช่วยให้รู้ผลเร็วขึ้น)
    if (file.size > MAX_FILE_BYTES) {
      setError(`ไฟล์ใหญ่ ${formatBytes(file.size)} เกิน 10 MB ที่กำหนด`);
      return;
    }

    setBusy(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/attachments/upload",
        clientPayload: JSON.stringify({ indicatorId, quarter, criteriaLevel }),
      });

      const result = await recordAttachmentAction(
        indicatorId,
        quarter,
        criteriaLevel,
        blob.url,
        file.name
      );
      if (result.error) {
        setError(result.error);
        return;
      }

      // ให้เซิร์ฟเวอร์วาดรายการไฟล์ใหม่ จะได้เห็นไฟล์ที่เพิ่งแนบทันที
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-11 items-center rounded-lg border border-dashed border-slate-300 px-4 text-sm font-medium text-emerald-800 transition hover:border-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "กำลังอัปโหลด..." : `+ แนบไฟล์หลักฐานระดับ ${criteriaLevel}`}
      </button>

      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          {ALLOWED_LABEL} · ไม่เกิน 10 MB ต่อไฟล์
        </p>
      )}
    </div>
  );
}
