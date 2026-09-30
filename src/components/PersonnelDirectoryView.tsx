import React, { useState } from 'react';
import { Employee } from '../types/attendance';
import { softDeleteEmployee, restoreEmployee } from '../services/attendanceService';

interface PersonnelDirectoryViewProps {
  employees: Employee[];
  onShowToast: (msg: string) => void;
}

export const PersonnelDirectoryView: React.FC<PersonnelDirectoryViewProps> = ({
  employees,
  onShowToast,
}) => {
  const [filterDept, setFilterDept] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  const filteredEmployees = employees.filter((emp) => {
    if (!showDeleted && emp.isDeleted) return false;
    if (showDeleted && !emp.isDeleted) return false;
    if (filterDept !== 'all' && emp.departmentId !== filterDept) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = emp.employeeId.toLowerCase().includes(q);
      const matchName = emp.name.toLowerCase().includes(q);
      const matchEmail = emp.email.toLowerCase().includes(q);
      const matchPos = emp.position.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchPos) return false;
    }
    return true;
  });

  const handleToggleSoftDelete = async (emp: Employee) => {
    try {
      if (emp.isDeleted) {
        await restoreEmployee(emp.employeeId);
        onShowToast(`กู้คืนข้อมูลบุคลากร ${emp.employeeId} (${emp.name}) สำเร็จ`);
      } else {
        await softDeleteEmployee(emp.employeeId);
        onShowToast(`Soft Delete (ซ่อน) ข้อมูลบุคลากร ${emp.employeeId} (${emp.name}) เรียบร้อย`);
      }
    } catch (err) {
      console.error(err);
      onShowToast(`เกิดข้อผิดพลาดในการอัปเดตข้อมูล`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl shadow-xs border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#66000b] text-white text-xs font-semibold">
              NoSQL Master Collection
            </span>
            <span className="text-xs text-slate-500 font-mono">/employees/&#123;employeeId&#125;</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            สารบบข้อมูลบุคลากร สำนักบริการวิชาการ มข. (30 ท่าน)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกเป็น Document รายบุคคลโดยใช้ employeeId เป็น Primary Key ใน Cloud Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              showDeleted
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {showDeleted ? 'delete_forever' : 'delete'}
            </span>
            <span>{showDeleted ? 'แสดงรายการที่ลบ (Soft Deleted)' : 'ถังขยะ / Soft Deleted'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl shadow-xs border border-slate-100">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัส, อีเมล..."
            className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'exec', 'plan', 'it', 'lifelong', 'social', 'cat'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                filterDept === d
                  ? 'bg-[#66000b] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d === 'all'
                ? 'ทั้งหมด'
                : d === 'exec'
                ? 'ผู้บริหาร'
                : d === 'plan'
                ? 'แผน-การเงิน'
                : d === 'it'
                ? 'สารสนเทศ'
                : d === 'lifelong'
                ? 'ตลอดชีวิต'
                : d === 'social'
                ? 'วิชาการสังคม'
                : 'CAT KKU'}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.employeeId}
            className={`p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col justify-between transition-all ${
              emp.isDeleted ? 'opacity-60 border-dashed border-red-200' : 'hover:shadow-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-[#66000b]/10 text-[#66000b] font-mono font-bold text-xs">
                  {emp.employeeId}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">ลำดับที่ {emp.orderNo}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#66000b] to-[#8a151b] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {emp.avatarInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{emp.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{emp.position}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">สังกัดหลัก:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[170px]">{emp.department}</span>
                </div>
                {emp.unit && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">หน่วยงาน:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[170px]" title={emp.unit}>{emp.unit}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">รหัสสังกัด:</span>
                  <span className="font-mono font-semibold text-slate-800">{emp.affiliationCode || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">อีเมล:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[180px]">{emp.email}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                  <span className="text-slate-400">บทบาทในระบบ:</span>
                  <span className="font-semibold text-[#66000b] truncate max-w-[170px]">{emp.systemRole || emp.permission}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {emp.isDeleted ? 'สถานะ: ถูกลบ (Soft Delete)' : 'สถานะ: ใช้งานปกติ'}
              </span>
              <button
                onClick={() => handleToggleSoftDelete(emp)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  emp.isDeleted
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {emp.isDeleted ? 'restore' : 'delete'}
                </span>
                <span>{emp.isDeleted ? 'กู้คืน' : 'Soft Delete'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
