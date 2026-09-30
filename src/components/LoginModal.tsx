import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Employee } from '../types/attendance';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, employees }) => {
  const { user, matchedEmployee, loginGoogle, loginSSO, logout, activeEmail, isAdmin, isHR } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await loginGoogle();
      onClose();
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSSOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    loginSSO(customEmail.trim());
    onClose();
  };

  const handleSelectQuickEmployee = (emp: Employee) => {
    loginSSO(emp.email);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif]">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with OAS Logo */}
        <div className="bg-gradient-to-r from-[#66000b] to-[#8a151b] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shadow-sm">
              <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-xl leading-tight">เข้าสู่ระบบ KKU SSO / Google</h3>
              <p className="text-xs text-white/80">ระบบบันทึกเวลาและกิจกรรมบุคลากร สำนักบริการวิชาการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Current Profile Status if already connected */}
          {activeEmail && (
            <div className="p-4 rounded-2xl bg-[#eff4ff] border border-blue-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#66000b] uppercase tracking-wider">
                  สถานะการเข้าสู่ระบบปัจจุบัน
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  เชื่อมโยงฐานข้อมูลแล้ว
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-full bg-[#66000b] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {matchedEmployee?.avatarInitials || user?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-base text-slate-900 leading-tight">
                    {matchedEmployee?.name || user?.displayName || 'บุคลากร มข.'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono truncate">{activeEmail}</p>
                  {matchedEmployee && (
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                      {matchedEmployee.position} • {matchedEmployee.department}
                    </p>
                  )}
                </div>
              </div>

              {/* Roles Badge List */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-[#66000b] text-white font-bold text-[11px]">
                    Admin / ผู้ดูแลระบบ
                  </span>
                )}
                {isHR && (
                  <span className="px-2 py-0.5 rounded-md bg-[#ab3600] text-white font-bold text-[11px]">
                    เจ้าหน้าที่ HR
                  </span>
                )}
                {matchedEmployee?.statusRole && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                    {matchedEmployee.statusRole}
                  </span>
                )}
                {matchedEmployee?.systemRole && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100 text-[11px]">
                    {matchedEmployee.systemRole}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  logout();
                }}
                className="mt-1 w-full py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                ออกจากระบบ / สลับบัญชีผู้ใช้
              </button>
            </div>
          )}

          {/* Option 1: Login with Google */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              วิธีที่ 1: ลงชื่อเข้าใช้ด้วย Google (KKU Mail)
            </label>
            <button
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-center gap-3 transition-all text-sm font-bold text-slate-800 disabled:opacity-60"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>ลงชื่อเข้าใช้ด้วย Google Workspace KKU</span>
            </button>
          </div>

          {/* Option 2: KKU Single Sign-On (Email input) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              วิธีที่ 2: KKU Single Sign-On (ระบุอีเมล @kku.ac.th)
            </label>
            <form onSubmit={handleCustomSSOSubmit} className="flex gap-2">
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="เช่น chalpr@kku.ac.th หรือชื่อ@kku.ac.th"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#8a151b]/20"
              />
              <button
                type="submit"
                disabled={!customEmail.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#66000b] hover:bg-[#8a151b] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
              >
                ยืนยัน SSO
              </button>
            </form>
          </div>

          {/* Option 3: Quick Switch by Role / OAS Personnel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                วิธีที่ 3: เลือกตามบทบาทบุคลากร OAS KKU (สลับบัญชีทดสอบทันที)
              </label>
              <span className="text-[11px] text-slate-400">30 ท่านในฐานข้อมูล</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {employees.slice(0, 8).map((emp) => (
                <button
                  key={emp.employeeId}
                  onClick={() => handleSelectQuickEmployee(emp)}
                  className={`w-full p-2.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                    activeEmail === emp.email.toLowerCase().trim()
                      ? 'bg-[#66000b]/5 border-[#66000b] text-[#66000b]'
                      : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {emp.employeeId}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {emp.position} • {emp.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8a151b] px-2 py-0.5 rounded-full bg-red-50 shrink-0">
                    {emp.permission || 'บุคลากร'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
            เชื่อมโยงอัตโนมัติกับ Collection /employees ใน Cloud Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
