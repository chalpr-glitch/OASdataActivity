import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Activity, AttendanceRecord, Employee } from '../types/attendance';
import { refreshDynamicToken, updateActiveRoom } from '../services/attendanceService';
import { MobileScanModal } from './MobileScanModal';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';

interface KioskViewProps {
  activity: Activity;
  attendances: AttendanceRecord[];
  employees?: Employee[];
  onOpenAdmin: () => void;
  onShowToast: (msg: string) => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  activity,
  attendances,
  employees = [],
  onOpenAdmin,
  onShowToast,
}) => {
  const { user, matchedEmployee, activeEmail } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [countdownSec, setCountdownSec] = useState<number>(20);
  const [maxCountdown] = useState<number>(20);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Live Thai Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);

      const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
      ];
      const dayName = thaiDays[now.getDay()];
      const dayDate = now.getDate();
      const monthName = thaiMonths[now.getMonth()];
      const yearThai = now.getFullYear() + 543;
      setDateStr(`${dayName}ที่ ${dayDate} ${monthName} ${yearThai}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Dynamic QR Code generation with rolling token
  useEffect(() => {
    const generateQr = async () => {
      try {
        const payload = JSON.stringify({
          app: 'OAS_KKU_ATTENDANCE',
          act: activity.activityId,
          token: activity.currentDynamicToken || 'OAS-INITIAL',
          room: activity.room,
          ts: Date.now(),
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
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    };

    generateQr();
  }, [activity.activityId, activity.currentDynamicToken, activity.room]);

  // 3. Dynamic QR Countdown Timer & Rolling Token in Firestore
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          // Token expired, refresh in Firestore
          refreshDynamicToken(activity.activityId).catch(console.error);
          return maxCountdown;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activity.activityId, maxCountdown]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const handleRoomChange = async (roomName: string) => {
    if (activity.room === roomName) return;
    await updateActiveRoom(activity.activityId, roomName);
    onShowToast(`เปลี่ยนห้องประชุมเป็น "${roomName}" ในระบบ Firestore สำเร็จ`);
  };

  const stats: Record<string, any> = activity.departmentStats || {};
  const checkedCount = activity.checkedInCount ?? 22;
  const targetCount = activity.targetCount ?? 30;
  const pendingCount = targetCount - checkedCount;
  const completionRate = activity.completionRate ?? 73.3;

  // SVG circular dial calculation (radius: 40 => circumference ~251.2)
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0d1c2f] flex flex-col font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif]">
      {/* Fixed Top Header (Kiosk Navbar) */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#f8f9ff]/90 backdrop-blur-xl z-40 flex items-center justify-between px-6 lg:px-8 border-b border-slate-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-1">
              <img src="/baslogo.png" alt="OAS KKU Kiosk" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-[#66000b] text-lg block leading-tight">
                OAS KKU KIOSK
              </span>
              <span className="text-xs text-slate-500 block">สำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น</span>
            </div>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-200"></div>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ab3600] inline-block animate-pulse"></span>
            <span className="text-sm font-semibold text-slate-800">
              {activity.room} • {activity.floor}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* SSO User / Login Button */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-2 p-1.5 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700 transition-all"
            title="เข้าสู่ระบบ KKU SSO / Google"
          >
            <div className="w-6 h-6 rounded-lg bg-[#66000b] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
              {matchedEmployee?.avatarInitials || (user?.displayName ? user.displayName.slice(0, 2) : 'SSO')}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate">
              {matchedEmployee?.name ? matchedEmployee.name.split(' ')[0] : (activeEmail ? activeEmail.split('@')[0] : 'เข้าสู่ระบบ SSO')}
            </span>
          </button>

          {/* Live Clock Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#eff4ff] border border-blue-100/60 shadow-xs">
            <span className="material-symbols-outlined text-[#66000b] text-[18px]">schedule</span>
            <span className="text-sm font-bold text-slate-900 tracking-wider font-mono">
              {timeStr} <span className="text-xs font-medium text-slate-500">น.</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e6eeff] hover:bg-[#dde9ff] flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
              title="โหมดเต็มจอ"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
            <button
              onClick={onOpenAdmin}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ffdad6] text-[#93000a] hover:bg-[#ba1a1a] hover:text-white flex items-center justify-center transition-colors"
              title="สลับไปยังระบบจัดการ (Admin)"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">tune</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Canvas */}
      <main className="w-full pt-24 pb-10 px-4 sm:px-6 lg:px-12 flex-1 max-w-[1560px] mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Subtle Background Ambient Accents */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-[#ffdad7]/30 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="fixed bottom-10 right-10 w-[480px] h-[480px] bg-[#ffdbcf]/40 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Top Banner: Institution & Room Header */}
        <section className="w-full bg-white rounded-2xl p-6 lg:p-7 shadow-sm border border-slate-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* KKU Logo Badge */}
            <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center p-2 shadow-xs shrink-0">
              <img
                alt="ตราสัญลักษณ์สำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น"
                className="w-full h-full object-contain"
                src="/baslogo.png"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#66000b] text-white text-xs font-semibold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#ffdbcf] animate-ping"></span>
                  SELF-ATTENDANCE KIOSK
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#dde9ff] text-slate-700 font-mono text-xs font-medium">
                  รหัสกิจกรรม: {activity.activityId}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl text-[#66000b] font-bold tracking-tight">
                จุดเช็กชื่อเข้าร่วมกิจกรรมด้วยตนเอง
              </h1>
              <p className="text-base text-slate-600 flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-[#ab3600] text-[20px]">meeting_room</span>
                <span className="font-semibold text-slate-900">{activity.room}</span>
                <span>• {activity.floor}</span>
              </p>
            </div>
          </div>

          {/* Real-time Live Clock Card */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto bg-[#eff4ff] border border-blue-100 px-5 py-3.5 rounded-xl gap-2 shrink-0">
            <div className="flex items-center gap-2 text-[#66000b] font-semibold text-sm">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>{dateStr || 'วันพุธที่ 30 กันยายน 2569'}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              {timeStr} <span className="text-sm font-medium text-slate-500">น.</span>
            </div>
          </div>
        </section>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT: Dynamic QR Presentation Card (5 Cols) */}
          <div className="xl:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-7 lg:p-8 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col items-center text-center">
              {/* Top Accent Band */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#66000b] via-[#8a151b] to-[#ab3600]"></div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffdbcf] text-[#822700] text-xs font-bold mb-4">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                เฉพาะบุคลากรภายในสำนักบริการวิชาการ (เป้าหมาย 30 ท่าน)
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2 leading-snug">
                {activity.title}
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                เปิดกล้องสมาร์ทโฟนหรือแอป LINE เพื่อสแกน QR Code ยืนยันการเข้าร่วมห้องประชุม
              </p>

              {/* Focus Target Frame with SVG / Canvas Matrix */}
              <div className="relative p-5 rounded-2xl bg-white shadow-xl border border-slate-100">
                {/* Corner Marks */}
                <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-[#66000b] rounded-tl-lg pointer-events-none"></div>
                <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-[#66000b] rounded-tr-lg pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-[#66000b] rounded-bl-lg pointer-events-none"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-[#66000b] rounded-br-lg pointer-events-none"></div>

                {/* QR Matrix Render */}
                <div className="w-64 h-64 sm:w-72 sm:h-72 p-2 bg-white rounded-xl flex items-center justify-center relative">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="OAS QR Code Attendance"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                    </div>
                  )}

                  {/* University Center Shield Badge with New Logo */}
                  <div className="absolute inset-0 m-auto w-14 h-14 bg-white rounded-full shadow-md border-2 border-white flex items-center justify-center pointer-events-none overflow-hidden p-1">
                    <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Dynamic Security Refresh Countdown */}
              <div className="w-full mt-6 bg-[#eff4ff] rounded-xl p-3.5 flex flex-col gap-2 border border-blue-50">
                <div className="flex items-center justify-between text-slate-800 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined text-[18px] text-[#ab3600]">security_update_good</span>
                    Dynamic QR Token (ป้องกันภาพส่งต่อ)
                  </span>
                  <span className="font-bold text-[#66000b] flex items-center gap-1 font-mono">
                    รีเฟรชใน <span className="text-[#ab3600] font-bold text-sm">{countdownSec}</span> วิ
                  </span>
                </div>
                {/* Progress Bar Gauge */}
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#ab3600] transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(countdownSec / maxCountdown) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
                  <span>Current Security Key:</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {activity.currentDynamicToken}
                  </span>
                </div>
              </div>

              {/* Interactive Phone Simulation Button */}
              <button
                onClick={() => setIsMobileModalOpen(true)}
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#66000b] to-[#8a151b] hover:from-[#8a151b] hover:to-[#ab3600] text-white text-xs font-bold shadow-md shadow-[#66000b]/15 flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">smartphone</span>
                <span>จำลองการสแกนด้วยมือถือ (Mobile Test Scan)</span>
              </button>

              <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-[16px] text-[#032879]">info</span>
                ระบบบันทึกเวลาและส่งเกียรติบัตร e-Certificate อัตโนมัติหลังจบกิจกรรม
              </div>
            </div>
          </div>

          {/* RIGHT: Live Attendance Monitor & Department Statistics (7 Cols) */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            {/* Live Realtime Counter Hero Banner */}
            <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                {/* Circular Progress Dial Visual */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-slate-100"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="10"
                    ></circle>
                    <circle
                      className="text-[#66000b] transition-all duration-700 ease-out"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    ></circle>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-[#66000b] leading-none font-mono">
                      {completionRate}%
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">ครบเกณฑ์</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#ab3600] uppercase tracking-wider mb-1 flex items-center gap-1.5 font-['IBM_Plex_Sans_Thai']">
                    <span className="w-2 h-2 rounded-full bg-[#ab3600] animate-pulse"></span>
                    สรุปสถานะการเข้าห้องประชุมสด
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl lg:text-5xl text-[#66000b] font-bold tracking-tight font-mono">
                      {checkedCount}
                    </span>
                    <span className="text-xl text-slate-500 font-semibold">/ {targetCount} ท่าน</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    คงเหลือรอสแกนเข้าห้องประชุมอีก{' '}
                    <span className="font-bold text-[#ab3600]">{pendingCount} ท่าน</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2.5 w-full sm:w-auto justify-end">
                <div className="px-4 py-2.5 rounded-xl bg-[#e6eeff] flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#66000b] text-[22px]">group</span>
                  <div>
                    <span className="text-xs text-slate-500 block leading-tight">กลุ่มเป้าหมาย</span>
                    <span className="text-sm font-bold text-slate-800">{targetCount} อัตรา</span>
                  </div>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-[#eff4ff] flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#ab3600] text-[22px]">timer</span>
                  <div>
                    <span className="text-xs text-slate-500 block leading-tight">เปิดระบบเมื่อ</span>
                    <span className="text-sm font-bold text-slate-800">{activity.openedAt || '08:00 น.'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown by 6 Departments / Units */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#66000b] text-[20px]">domain</span>
                  สถิติการเช็กชื่อแยกตามกลุ่มงานย่อย (6 ภารกิจสังกัด)
                </h3>
                <span className="text-xs text-slate-500">อัปเดตแบบเรียลไทม์ (Firestore)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. ผู้บริหารสำนักฯ */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 font-semibold truncate pr-2">1. ผู้บริหารสำนักฯ</span>
                    <span className="text-xs font-bold text-[#66000b] shrink-0 font-mono">
                      {stats.exec?.checkedIn ?? 3}/{stats.exec?.target ?? 4} ({stats.exec?.percentage ?? 75}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#66000b] rounded-full transition-all duration-500"
                      style={{ width: `${stats.exec?.percentage ?? 75}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2. ภารกิจแผน การเงิน และพัสดุ */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="text-sm text-slate-800 font-semibold truncate">2. ภารกิจแผน การเงิน พัสดุ</span>
                      <span className="material-symbols-outlined text-[#ab3600] text-[16px] shrink-0">check_circle</span>
                    </div>
                    <span className="text-xs font-bold text-[#ab3600] shrink-0 font-mono">
                      {stats.plan?.checkedIn ?? 5}/{stats.plan?.target ?? 5} ({stats.plan?.percentage ?? 100}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#ab3600] rounded-full transition-all duration-500"
                      style={{ width: `${stats.plan?.percentage ?? 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3. ภารกิจสารสนเทศ & บริหาร */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 font-semibold truncate pr-2">3. ภารกิจสารสนเทศ & บริหาร</span>
                    <span className="text-xs font-bold text-[#66000b] shrink-0 font-mono">
                      {stats.it?.checkedIn ?? 4}/{stats.it?.target ?? 5} ({stats.it?.percentage ?? 80}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#66000b] rounded-full transition-all duration-500"
                      style={{ width: `${stats.it?.percentage ?? 80}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4. ศูนย์จัดการศึกษาตลอดชีวิต */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 font-semibold truncate pr-2">4. ศูนย์จัดการศึกษาตลอดชีวิต</span>
                    <span className="text-xs font-bold text-[#66000b] shrink-0 font-mono">
                      {stats.lifelong?.checkedIn ?? 4}/{stats.lifelong?.target ?? 6} ({stats.lifelong?.percentage ?? 66.7}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#8a151b] rounded-full transition-all duration-500"
                      style={{ width: `${stats.lifelong?.percentage ?? 66.7}%` }}
                    ></div>
                  </div>
                </div>

                {/* 5. ศูนย์บริการวิชาการสังคม */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 font-semibold truncate pr-2">5. ศูนย์บริการวิชาการสังคม</span>
                    <span className="text-xs font-bold text-[#66000b] shrink-0 font-mono">
                      {stats.social?.checkedIn ?? 4}/{stats.social?.target ?? 6} ({stats.social?.percentage ?? 66.7}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#8a151b] rounded-full transition-all duration-500"
                      style={{ width: `${stats.social?.percentage ?? 66.7}%` }}
                    ></div>
                  </div>
                </div>

                {/* 6. CAT KKU */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-blue-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 font-semibold truncate pr-2">6. CAT KKU (อาหาร)</span>
                    <span className="text-xs font-bold text-[#ab3600] shrink-0 font-mono">
                      {stats.cat?.checkedIn ?? 2}/{stats.cat?.target ?? 4} ({stats.cat?.percentage ?? 50}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#ab3600] rounded-full transition-all duration-500"
                      style={{ width: `${stats.cat?.percentage ?? 50}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Check-in Ticker (Feed) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#66000b] text-[20px]">notifications_active</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ผู้เช็กชื่อเข้าห้องประชุมล่าสุด (Live Ticker)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-slate-600 text-xs font-medium">
                  4 รายการล่าสุด
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(activity.latestCheckIns && activity.latestCheckIns.length > 0
                  ? activity.latestCheckIns
                  : [
                      {
                        employeeId: 'OAS11',
                        name: 'คุณวรรณภา สีดาพล',
                        department: 'ภารกิจสารสนเทศและบริหารงานทั่วไป',
                        checkInTime: 'เมื่อสักครู่',
                        avatarInitials: 'ว',
                        position: '',
                        method: '',
                      },
                      {
                        employeeId: 'OAS01',
                        name: 'รศ.น.สพ.ดร.ชูชาติ กมลเลิศ',
                        department: 'ผู้บริหารสำนักบริการวิชาการ',
                        checkInTime: '08:42 น.',
                        avatarInitials: 'ช',
                        position: '',
                        method: '',
                      },
                      {
                        employeeId: 'OAS10',
                        name: 'นายทิวากร กาเจริญ',
                        department: 'ภารกิจสารสนเทศและบริหารงานทั่วไป',
                        checkInTime: '08:39 น.',
                        avatarInitials: 'ท',
                        position: '',
                        method: '',
                      },
                      {
                        employeeId: 'OAS22',
                        name: 'นางสาวเดือนเพ็ญดาว ชิวส์พิมาย',
                        department: 'ศูนย์จัดการศึกษาตลอดชีวิต',
                        checkInTime: '08:38 น.',
                        avatarInitials: 'ด',
                        position: '',
                        method: '',
                      },
                    ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#eff4ff] border border-blue-50/50 flex items-center justify-between transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-[#66000b] text-white'
                            : 'bg-[#dde9ff] text-[#66000b]'
                        }`}
                      >
                        {item.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 truncate">{item.department}</div>
                      </div>
                    </div>
                    {item.checkInTime.includes('สักครู่') ? (
                      <span className="text-xs font-bold text-[#822700] px-2 py-0.5 rounded-md bg-[#ffdbcf] shrink-0 font-['IBM_Plex_Sans_Thai']">
                        เมื่อสักครู่
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono font-medium shrink-0">
                        {item.checkInTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action & Assistance Bar */}
        <section className="w-full bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* HR Support Desk Notice */}
          <div className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">contact_support</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">
                พบปัญหาการสแกน หรือไม่มีรายชื่อ?
              </span>
              <span className="text-xs text-slate-500">
                กรุณาติดต่อเจ้าหน้าที่ทรัพยากรบุคคล (HR) ณ โต๊ะอำนวยการรับรองด้านหน้าห้องประชุม
              </span>
            </div>
          </div>

          {/* Quick Actions: Switch Room & Admin */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end w-full lg:w-auto">
            {/* Room Selector */}
            <div className="flex items-center bg-[#eff4ff] p-1 rounded-xl gap-1 border border-blue-50">
              {['ห้องประชุมมณีเทวา', 'ห้องประชุมดุสิตา', 'ห้องประชุมสุพรรณิการ์'].map((room) => {
                const isSelected = activity.room === room;
                const shortLabel = room.replace('ห้องประชุม', '');
                return (
                  <button
                    key={room}
                    onClick={() => handleRoomChange(room)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-white text-[#66000b] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    type="button"
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>

            <button
              onClick={toggleFullscreen}
              className="px-3.5 py-2 rounded-xl bg-[#e6eeff] hover:bg-[#dde9ff] text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">aspect_ratio</span>
              ขยายเต็มจอ
            </button>

            <button
              onClick={onOpenAdmin}
              className="px-4 py-2 rounded-xl bg-[#66000b] hover:bg-[#8a151b] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              ระบบจัดการ (Admin)
            </button>
          </div>
        </section>
      </main>

      {/* Mobile Scan Modal Simulator */}
      <MobileScanModal
        activity={activity}
        attendances={attendances}
        employees={employees}
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSuccess={(name) => {
          onShowToast(`ยินดีต้อนรับ ${name} เข้าสู่การประชุม`);
        }}
      />

      {/* KKU SSO / Google Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        employees={employees}
      />
    </div>
  );
};
