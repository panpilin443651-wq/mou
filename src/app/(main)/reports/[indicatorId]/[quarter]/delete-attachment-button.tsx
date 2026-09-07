"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/actions/attachments";

// ปุ่มลบไฟล์แนบ ถามยืนยันก่อนเพราะไฟล์ถูกลบจริง เรียกคืนไม่ได้

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={(e) => {
        if (!confirm("ลบไฟล์แนบนี้หรือไม่ ไฟล์จะถูกลบถาวร เรียกคืนไม่ได้")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "กำลังลบ..." : "ลบ"}
    </button>
  );
}

export function DeleteAttachmentButton({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, { error: null } as FormState);

  return (
    <form action={formAction}>
      <Button />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
