"use client";

// ปุ่มสั่งพิมพ์ ต้องเป็น client component เพราะเรียก window.print()
// ในหน้าต่างที่เปิดขึ้น ผู้ใช้เลือกปลายทางเป็น "บันทึกเป็น PDF" ก็จะได้ไฟล์ PDF

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white transition hover:bg-brand-800"
    >
      พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
