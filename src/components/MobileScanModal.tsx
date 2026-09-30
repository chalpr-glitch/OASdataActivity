import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Activity, AttendanceRecord, Employee } from '../types/attendance';
import { checkInEmployee } from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';

interface MobileScanModalProps {
  activity: Activity;
  attendances: AttendanceRecord[];
  employees?: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employeeName: string) => void;
}

export const MobileScanModal: React.FC<MobileScanModalProps> = ({
  activity,
  attendances,
  employees = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { matchedEmployee, activeEmail } = useAuth();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedInAttendee, setCheckedInAttendee] = useState<AttendanceRecord | null>(null);

  // Auto-select matched employee from SSO session if available
  useEffect(() => {
    if (matchedEmployee && !selectedEmpId) {
      setSelectedEmpId(matchedEmployee.employeeId);
    }
  }, [matchedEmployee, isOpen]);

  if (!isOpen) return null;

  const pendingAttendees = attendances.filter(a => !a.isDeleted && a.status === 'pending');
  const allAttendees = attendances.filter(a => !a.isDeleted);

  const handleConfirmCheckIn = async () => {
    if (!selectedEmpId) return;
    setIsSubmitting(true);
    try {
      await checkInEmployee(activity.activityId, selectedEmpId, 'Mobile Self-Scan', 'สแกน QR ผ่านสมาร์ตโฟน');
      const target = allAttendees.find(a => a.employeeId === selectedEmpId);
      if (target) {
        setCheckedInAttendee(target);
        onSuccess(target.employeeName);
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Mobile Mockup Header */}
        <div className="bg-gradient-to-r from-[#66000b] to-[#8a151b] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-xs">
              <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">เช็กชื่อผ่านสมาร์ตโฟน</h3>
              <p className="text-xs text-white/80">ระบบสแกน QR Code หน้างาน OAS KKU</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCheckedInAttendee(null);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!checkedInAttendee ? (
            <div className="flex flex-col gap-5">
              {/* Event Card Summary */}
              <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-slate-100 flex flex-col gap-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm line-clamp-1">{activity.title}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[16px] text-[#ab3600]">meeting_room</span>
                  <span>{activity.room} • {activity.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Dynamic Token: <strong className="font-mono text-slate-900">{activity.currentDynamicToken}</strong> (ตรวจสอบแล้ว)</span>
                </div>
              </div>

              {/* Attendee Selector */}
              <div>
                {matchedEmployee && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {matchedEmployee.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          ตรวจพบบัญชี SSO: {matchedEmployee.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {matchedEmployee.employeeId} • {matchedEmployee.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmpId(matchedEmployee.employeeId)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shrink-0 hover:bg-emerald-700 transition-colors"
                    >
                      เลือกบัญชีนี้
                    </button>
                  </div>
                )}

                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  เลือกรายชื่อบุคลากรของคุณ (OAS KKU)
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a151b]/30 focus:border-[#8a151b]"
                >
                  <option value="">-- กรุณาเลือกรายชื่อเพื่อยืนยัน --</option>
                  {pendingAttendees.length > 0 && (
                    <optgroup label="📋 ยังไม่เช็กชื่อ (รอลงทะเบียน)">
                      {pendingAttendees.map((att) => (
                        <option key={att.employeeId} value={att.employeeId}>
                          {att.employeeId} - {att.employeeName} ({att.department})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="✅ เช็กชื่อแล้ว (เลือกเพื่อทดสอบซ้ำ)">
                    {allAttendees
                      .filter((a) => a.status === 'checked')
                      .map((att) => (
                        <option key={att.employeeId} value={att.employeeId}>
                          {att.employeeId} - {att.employeeName} (เช็กแล้ว {att.checkInTime})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">help</span>
                  หากไม่พบรายชื่อ กรุณาติดต่อ HR หน้าห้องประชุม
                </p>
              </div>

              {/* Action Button */}
              <button
                disabled={!selectedEmpId || isSubmitting}
                onClick={handleConfirmCheckIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#66000b] to-[#8a151b] hover:from-[#8a151b] hover:to-[#ab3600] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#8a151b]/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    กำลังบันทึกลง Firestore...
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>ยืนยันเข้าห้องประชุม (Check-in Now)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* E-Certificate & Success confirmation */
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900">เช็กชื่อสำเร็จเรียบร้อย!</h4>
                <p className="text-xs text-slate-500 mt-0.5">ระบบบันทึกเวลาลงฐานข้อมูล Firestore แล้ว</p>
              </div>

              {/* e-Certificate Card */}
              <div className="w-full p-4 rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 text-left relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <img src="/baslogo.png" alt="OAS KKU" className="h-6 w-auto object-contain" />
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">e-Certificate of Attendance</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-700 font-semibold">OAS-KKU-2024</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <p className="text-[11px] text-slate-500">รับรองว่า:</p>
                  <p className="font-bold text-slate-900 text-sm">{checkedInAttendee.employeeName}</p>
                  <p className="text-slate-600 text-[11px]">{checkedInAttendee.position}</p>
                  <p className="text-slate-600 text-[11px]">{checkedInAttendee.department}</p>
                  <div className="pt-2 border-t border-amber-200/40 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">เวลาบันทึก:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {new Date().toLocaleTimeString('th-TH')} น.
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">ห้องประชุม:</span>
                    <span className="font-medium text-slate-800">{activity.room}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setCheckedInAttendee(null);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
