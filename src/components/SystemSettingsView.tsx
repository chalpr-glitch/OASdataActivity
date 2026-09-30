import React from 'react';
import { Activity, SystemSetting } from '../types/attendance';

interface SystemSettingsViewProps {
  activity: Activity;
  setting: SystemSetting | null;
  onShowToast: (msg: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  activity,
  setting,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#032879] text-white text-xs font-semibold">
              Firebase Cloud Firestore NoSQL
            </span>
            <span className="text-xs text-slate-500 font-mono">Database Architecture</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            โครงสร้างฐานข้อมูล NoSQL และการตั้งค่าระบบ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ออกแบบตามหลักการ NoSQL บน Cloud Firestore (Non-relational, Zero-SQL-JOIN, Denormalized)
          </p>
        </div>
      </div>

      {/* NoSQL Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Collection & Document Principles */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-[#66000b] font-bold text-sm">
            <span className="material-symbols-outlined text-[20px]">dataset</span>
            <span>1. Collection และ Document (No Relational Tables)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ระบบไม่มีการสร้างหรือใช้งานตารางสัมพันธ์ SQL (ไม่มี MySQL, PostgreSQL, หรือ Foreign Keys) ข้อมูลทุกชุดถูกจัดเก็บเป็น Documents ภายใน Collections:
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[#66000b] font-bold">employees/&#123;employeeId&#125;</span>
              <p className="text-[11px] font-sans text-slate-500 mt-0.5">
                เก็บข้อมูลหลักของบุคลากร OAS KKU (OAS01 ถึง OAS30)
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[#66000b] font-bold">activities/&#123;activityId&#125;</span>
              <p className="text-[11px] font-sans text-slate-500 mt-0.5">
                เก็บข้อมูลกิจกรรมหลักและสรุปสถิติแบบ Denormalized
              </p>
            </div>
          </div>
        </div>

        {/* 2. Subcollection Pattern */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-[#ab3600] font-bold text-sm">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            <span>2. Subcollection ใต้กิจกรรม</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ข้อมูลการเข้าร่วมประชุมถูกจัดเก็บภายใต้ Subcollection ของ Document กิจกรรมนั้นๆ:
          </p>
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 font-mono text-xs text-slate-800">
            <span className="text-[#ab3600] font-bold block mb-1">
              /activities/{activity.activityId}/attendances/&#123;employeeId&#125;
            </span>
            <p className="text-[11px] font-sans text-slate-600 leading-normal">
              แยกอิสระในแต่ละกิจกรรม ทำให้สามารถจัดเก็บประวัติการเข้าร่วมของหลายกิจกรรมได้โดยไม่กระทบกัน และดึงข้อมูลแบบ Realtime Listener (onSnapshot) ได้ทันที
            </p>
          </div>
        </div>

        {/* 3. Denormalization (Avoid SQL JOINs) */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-sm">
            <span className="material-symbols-outlined text-[20px]">flash_on</span>
            <span>3. หลีกเลี่ยงการ JOIN ด้วย Denormalization</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            เพื่อความเร็วในการแสดงผลหน้า Kiosk และหน้ารายงานระดับ Millisecond โดยไม่ต้องรัน JOIN ข้ามตาราง:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
            <li>
              <strong>Subcollection attendances:</strong> ฝัง employeeName, department, position, email ไว้ใน Document โดยตรง
            </li>
            <li>
              <strong>Parent Activity:</strong> ฝังยอด checkedInCount, departmentStats, และ latestCheckIns ไว้ใน Document เพื่อให้หน้าจอ Kiosk อ่าน Document เดียวแล้วแสดงผลได้ครบ
            </li>
          </ul>
        </div>

        {/* 4. Soft Delete & Timestamps */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-[#032879] font-bold text-sm">
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span>4. Timestamp และ Soft Delete</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ทุก Document ในระบบมีการประทับเวลาและรองรับการกู้คืนข้อมูล:
          </p>
          <div className="space-y-1.5 text-xs text-slate-600 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">createdAt:</span>
              <span className="text-slate-700">{activity.createdAt || new Date().toISOString()}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">updatedAt:</span>
              <span className="text-slate-700">{activity.updatedAt || new Date().toISOString()}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">isDeleted:</span>
              <span className="text-emerald-700 font-bold">false (ใช้งาน Soft Delete แทนการ DROP/DELETE)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kiosk Configuration Info */}
      <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#66000b] text-[18px]">tune</span>
          <span>การตั้งค่าระบบ Kiosk หน้างาน</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">ห้องประชุมที่เปิดใช้งาน</span>
            <span className="font-bold text-slate-800">{activity.room}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Dynamic QR Security Interval</span>
            <span className="font-bold text-slate-800">20 วินาที (ป้องกันการถ่ายภาพหน้าจอส่งต่อ)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Cloud Firestore Status</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              เชื่อมต่อฐานข้อมูล NoSQL สำเร็จ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
