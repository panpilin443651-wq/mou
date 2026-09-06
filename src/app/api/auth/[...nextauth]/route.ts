import { handlers } from "@/auth";

// จุดรับ-ส่งข้อมูลของระบบ Login (login, logout, ตรวจ session)
// Auth.js จัดการให้ทั้งหมด เราแค่ต่อสายไว้ที่ URL /api/auth/*
export const { GET, POST } = handlers;
