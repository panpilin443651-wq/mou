import { requireUser } from "@/lib/session";

export const metadata = { title: "รายงานผล | ระบบรายงานผล MOU" };

export default async function Page() {
  await requireUser();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold sm:text-2xl">รายงานผล</h1>
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        ส่วนนี้จะพัฒนาใน Phase 7
      </p>
    </div>
  );
}
