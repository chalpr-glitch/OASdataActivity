import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Activity, AttendanceRecord, Employee } from '../types/attendance';
import {
  registerEmployeeForActivity,
  subscribeToRegistrations,
  getEmployeeRegisteredActivities,
} from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';

interface ActivitiesCatalogViewProps {
  activities: Activity[];
  users: Employee[];
  currentActivityId: string;
  onSelectActivity: (activityId: string) => void;
  onShowToast: (msg: string) => void;
}

export const ActivitiesCatalogView: React.FC<ActivitiesCatalogViewProps> = ({
  activities,
  users,
  currentActivityId,
  onSelectActivity,
  onShowToast,
}) => {
  const { matchedEmployee, activeEmail, isAdmin, isHR } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-activities'>('catalog');
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [qrModalActivity, setQrModalActivity] = useState<Activity | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activityRegistrations, setActivityRegistrations] = useState<AttendanceRecord[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<{ activity: Activity; registration: AttendanceRecord }[]>([]);
  const [selectedUserToRegister, setSelectedUserToRegister] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load My Registered Activities for the logged-in employee
  useEffect(() => {
    if (!matchedEmployee?.employeeId) {
      setMyRegistrations([]);
      return;
    }

    const loadMyRegistrations = async () => {
      const myRegs = await getEmployeeRegisteredActivities(matchedEmployee.employeeId);
      setMyRegistrations(myRegs);
    };

    loadMyRegistrations();
  }, [matchedEmployee, activities]);

  // Subscribe to registrations of selected detail activity
  useEffect(() => {
    if (!detailActivity) {
      setActivityRegistrations([]);
      return;
    }

    const unsub = subscribeToRegistrations(detailActivity.activityId, (regs) => {
      setActivityRegistrations(regs);
    });

    return () => unsub();
  }, [detailActivity]);

  // Generate QR Code when QR modal is opened
  useEffect(() => {
    if (!qrModalActivity) {
      setQrDataUrl('');
      return;
    }

    const generate = async () => {
      try {
        const payload = JSON.stringify({
          app: 'OAS_KKU_ACTIVITY',
          act: qrModalActivity.activityId,
          title: qrModalActivity.title,
          token: qrModalActivity.currentDynamicToken,
          room: qrModalActivity.room,
        });

        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 320,
          color: {
            dark: '#66000b',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    };

    generate();
  }, [qrModalActivity]);

  // Handler: Register current logged-in employee or chosen employee
  const handleRegister = async (activityId: string, employeeIdToRegister: string) => {
    if (!employeeIdToRegister) return;
    setIsSubmitting(true);

    try {
      const res = await registerEmployeeForActivity(
        activityId,
        employeeIdToRegister,
        'Web Portal Registration'
      );

      if (res.success) {
        onShowToast(res.message);
        // Refresh my registrations if it's the current user
        if (matchedEmployee && employeeIdToRegister === matchedEmployee.employeeId) {
          const updated = await getEmployeeRegisteredActivities(matchedEmployee.employeeId);
          setMyRegistrations(updated);
        }
      } else {
        onShowToast(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      onShowToast(err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setIsSubmitting(false);
      setSelectedUserToRegister('');
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif]">
      {/* Top Banner / Navigation Header */}
      <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] border border-blue-100 flex items-center justify-center shrink-0 text-[#66000b]">
            <span className="material-symbols-outlined text-3xl">event_note</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#66000b] text-white text-xs font-semibold">
                NoSQL Activities & Registrations
              </span>
              <span className="text-xs text-slate-500 font-mono">
                /activities/&#123;activityId&#125;/registrations/&#123;employeeId&#125;
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              ระบบลงทะเบียนและแสดงรายการกิจกรรมบุคลากร OAS KKU
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ป้องกันการลงทะเบียนซ้ำด้วย employeeId พร้อมคำนวณ registeredCount อัตโนมัติใน Firestore
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'catalog'
                ? 'bg-white text-[#66000b] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>รายการกิจกรรมทั้งหมด ({activities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('my-activities')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'my-activities'
                ? 'bg-white text-[#66000b] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bookmark</span>
            <span>กิจกรรมของฉัน ({myRegistrations.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ALL ACTIVITIES CATALOG */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((act) => {
            const isCurrentActive = act.activityId === currentActivityId;
            const isRegistered = myRegistrations.some((r) => r.activity.activityId === act.activityId);
            const targetCount = act.targetCount || 30;
            const regCount = act.registeredCount ?? 0;
            const regPct = Math.min(100, Math.round((regCount / targetCount) * 100));

            return (
              <div
                key={act.activityId}
                className={`bg-white rounded-2xl p-6 shadow-xs border transition-all flex flex-col justify-between ${
                  isCurrentActive
                    ? 'border-[#66000b] ring-2 ring-[#66000b]/10'
                    : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Badge & Room */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#66000b]/10 text-[#66000b] font-mono font-bold text-xs">
                      {act.activityId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#ab3600]">meeting_room</span>
                      {act.room}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug line-clamp-2">
                    {act.title}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>

                  {/* Date & Time */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 mb-4 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#66000b]">calendar_today</span>
                      <span className="font-semibold">{act.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#ab3600]">schedule</span>
                      <span>{act.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">pin_drop</span>
                      <span className="truncate">{act.floor}</span>
                    </div>
                  </div>

                  {/* Requirement 7: registeredCount Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600">groups</span>
                        จำนวนผู้ลงทะเบียน (registeredCount)
                      </span>
                      <span className="font-mono font-bold text-[#66000b]">
                        {regCount} / {targetCount} ท่าน ({regPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#66000b] to-[#ab3600] rounded-full transition-all duration-500"
                        style={{ width: `${regPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {/* View Details Button (Requirement 4) */}
                    <button
                      onClick={() => setDetailActivity(act)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>รายละเอียด</span>
                    </button>

                    {/* QR Code Button (Requirement 9) */}
                    <button
                      onClick={() => setQrModalActivity(act)}
                      className="py-2 px-3 rounded-xl bg-[#eff4ff] hover:bg-[#dde9ff] text-[#032879] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="สร้าง QR Code กิจกรรม"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code</span>
                      <span>QR Code</span>
                    </button>

                    {/* Set Active Kiosk Button */}
                    <button
                      onClick={() => {
                        onSelectActivity(act.activityId);
                        onShowToast(`เลือกกิจกรรม ${act.activityId} เป็นกิจกรรมหลักหน้า Kiosk`);
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                        isCurrentActive
                          ? 'bg-[#66000b] text-white border-[#66000b]'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={isCurrentActive ? 'กิจกรรมหลักปัจจุบัน' : 'ตั้งเป็นกิจกรรมหน้า Kiosk'}
                    >
                      <span className="material-symbols-outlined text-[18px]">co_present</span>
                    </button>
                  </div>

                  {/* Requirement 5 & 6: Registration Button with Duplicate Check */}
                  {matchedEmployee ? (
                    isRegistered ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>คุณได้ลงทะเบียนกิจกรรมนี้แล้ว (Document Created)</span>
                      </button>
                    ) : (
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleRegister(act.activityId, matchedEmployee.employeeId)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#66000b] hover:bg-[#8a151b] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        <span>ลงทะเบียนทันที ({matchedEmployee.name.split(' ')[0]})</span>
                      </button>
                    )
                  ) : (
                    <div className="text-center py-2 px-3 rounded-xl bg-slate-50 text-slate-500 text-xs border border-slate-100">
                      กรุณาเข้าสู่ระบบ SSO เพื่อลงทะเบียน
                    </div>
                  )}

                  {/* Admin Fast Registration for other Personnel */}
                  {(isAdmin || isHR) && (
                    <div className="pt-2 flex items-center gap-1.5">
                      <select
                        value={selectedUserToRegister}
                        onChange={(e) => setSelectedUserToRegister(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700"
                      >
                        <option value="">-- HR ลงทะเบียนแทน --</option>
                        {users.map((u) => (
                          <option key={u.employeeId} value={u.employeeId}>
                            {u.employeeId} - {u.name}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!selectedUserToRegister || isSubmitting}
                        onClick={() => handleRegister(act.activityId, selectedUserToRegister)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-black text-white text-[11px] font-bold disabled:opacity-40"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MY REGISTERED ACTIVITIES (Requirement 8) */}
      {activeTab === 'my-activities' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#66000b] text-white flex items-center justify-center font-bold text-base shadow-xs">
                {matchedEmployee?.avatarInitials || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {matchedEmployee?.name || 'บุคลากร มข.'}
                </h3>
                <p className="text-xs text-slate-500">
                  {matchedEmployee?.position} • {matchedEmployee?.department} ({activeEmail})
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
              ลงทะเบียนแล้ว {myRegistrations.length} กิจกรรม
            </span>
          </div>

          {myRegistrations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
              <span className="material-symbols-outlined text-5xl block mb-2 text-slate-300">
                event_busy
              </span>
              <p className="text-sm font-semibold text-slate-600">ยังไม่มีประวัติการลงทะเบียนกิจกรรม</p>
              <p className="text-xs text-slate-400 mt-1">
                คลิกที่แท็บ "รายการกิจกรรมทั้งหมด" เพื่อเลือกลงทะเบียนเข้าร่วมกิจกรรมที่สนใจ
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#66000b] text-white text-xs font-bold"
              >
                ดูรายการกิจกรรม
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRegistrations.map(({ activity, registration }) => (
                <div
                  key={activity.activityId}
                  className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#66000b]/10 text-[#66000b] font-mono font-bold text-xs">
                        {activity.activityId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {registration.status === 'checked' ? 'เช็กชื่อเข้างานแล้ว' : 'ลงทะเบียนสำเร็จ'}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mb-1">{activity.title}</h4>
                    <p className="text-xs text-slate-500 mb-4">{activity.description}</p>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">วันที่จัดงาน:</span>
                        <span className="font-semibold">{activity.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">เวลา:</span>
                        <span>{activity.timeRange}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ห้องประชุม:</span>
                        <span className="font-semibold text-[#66000b]">{activity.room}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400">เวลาลงทะเบียน:</span>
                        <span className="font-mono text-emerald-700 font-semibold">
                          {registration.registeredAt || registration.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setDetailActivity(activity)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      ดูข้อมูลกิจกรรม
                    </button>
                    <button
                      onClick={() => setQrModalActivity(activity)}
                      className="py-2 px-3 rounded-xl bg-[#eff4ff] text-[#032879] text-xs font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code</span>
                      <span>QR บัตรเข้างาน</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUIREMENT 4: ACTIVITY DETAILS MODAL */}
      {detailActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#66000b] to-[#8a151b] p-6 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-bold mb-1.5 inline-block">
                  {detailActivity.activityId}
                </span>
                <h3 className="font-bold text-xl leading-snug">{detailActivity.title}</h3>
                <p className="text-xs text-white/80 mt-1">
                  {detailActivity.room} • {detailActivity.floor}
                </p>
              </div>
              <button
                onClick={() => setDetailActivity(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  วัตถุประสงค์และรายละเอียด
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed">{detailActivity.description}</p>
              </div>

              {/* Schedule and Venue Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">วันที่จัดกิจกรรม</span>
                  <span className="font-bold text-slate-900">{detailActivity.date}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">ช่วงเวลา</span>
                  <span className="font-bold text-slate-900">{detailActivity.timeRange}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">ห้องประชุม</span>
                  <span className="font-bold text-[#66000b]">{detailActivity.room}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">ผู้ลงทะเบียน</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {detailActivity.registeredCount ?? activityRegistrations.length} / {detailActivity.targetCount || 30} ท่าน
                  </span>
                </div>
              </div>

              {/* Requirement 5 Subcollection List: activities/{activityId}/registrations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#66000b]">badge</span>
                    รายชื่อผู้ลงทะเบียนใน Subcollection: activities/{detailActivity.activityId}/registrations
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                    {activityRegistrations.length} รายการ
                  </span>
                </div>

                <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-16">รหัส</th>
                        <th className="py-2.5 px-3">ชื่อ - สกุล</th>
                        <th className="py-2.5 px-3">สังกัด / กลุ่มงาน</th>
                        <th className="py-2.5 px-3">เวลาลงทะเบียน</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activityRegistrations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            ยังไม่มีผู้ลงทะเบียนในกิจกรรมนี้
                          </td>
                        </tr>
                      ) : (
                        activityRegistrations.map((reg) => (
                          <tr key={reg.employeeId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#66000b]">
                              {reg.employeeId}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{reg.employeeName}</td>
                            <td className="py-2.5 px-3 text-slate-500">{reg.department}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {reg.registeredAt || reg.checkInTime || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  reg.status === 'checked'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {reg.status === 'checked' ? 'เช็กชื่อแล้ว' : 'ลงทะเบียน'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 font-mono">
                NoSQL Subcollection: activities/{detailActivity.activityId}/registrations
              </span>
              <button
                onClick={() => setDetailActivity(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT 9: QR CODE GENERATOR MODAL */}
      {qrModalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#66000b] text-white flex items-center justify-center mb-3 shadow-sm">
              <span className="material-symbols-outlined text-2xl">qr_code_2</span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-[#66000b]/10 text-[#66000b] font-mono font-bold text-xs mb-1">
              {qrModalActivity.activityId}
            </span>
            <h3 className="font-bold text-base text-slate-900 mb-1">{qrModalActivity.title}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {qrModalActivity.room} • สแกนเพื่อลงทะเบียนหรือยืนยันตัวตน
            </p>

            {/* QR Code Canvas */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#66000b]/20 shadow-md relative mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Activity QR" className="w-56 h-56 object-contain rounded-lg" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                </div>
              )}
              {/* Logo in center */}
              <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full p-1 shadow-sm border border-slate-100 pointer-events-none">
                <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="w-full p-2.5 bg-slate-50 rounded-xl text-slate-600 text-xs font-mono mb-4 border border-slate-100">
              Dynamic Token: <strong className="text-slate-900">{qrModalActivity.currentDynamicToken}</strong>
            </div>

            <div className="w-full flex items-center gap-2">
              <a
                href={qrDataUrl}
                download={`${qrModalActivity.activityId}-qr.png`}
                className="flex-1 py-2.5 rounded-xl bg-[#66000b] hover:bg-[#8a151b] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>บันทึกรูป QR Code</span>
              </a>
              <button
                onClick={() => setQrModalActivity(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
