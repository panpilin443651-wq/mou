// แถบแสดงคะแนนเทียบกับคะแนนเต็ม 5
//
// ใช้สีเดียวทุกแถบโดยตั้งใจ ไม่ไล่สีตามคะแนน
// เพราะความยาวของแถบบอกคะแนนอยู่แล้ว ถ้าไล่สีด้วยจะเป็นการบอกเรื่องเดิมซ้ำสองทาง
// และทำให้แถบที่คะแนนใกล้กันแยกจากกันยากขึ้นแทนที่จะง่ายขึ้น

export function ScoreBar({
  value,
  max = 5,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className="h-2 w-full rounded bg-slate-100"
      role="img"
      aria-label={`${label} ${value} จาก ${max}`}
    >
      {/* ปลายซ้ายชิดเส้นฐานจึงไม่มน ปลายขวาซึ่งเป็นปลายข้อมูลมนเล็กน้อย */}
      <div
        className="h-2 rounded-r bg-emerald-600"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
