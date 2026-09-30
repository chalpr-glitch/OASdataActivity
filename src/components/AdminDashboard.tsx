import React, { useState } from 'react';
import { Activity, AttendanceRecord, DepartmentId, Employee } from '../types/attendance';
import { manualHRCheckIn, markEmployeeLeave, resetEmployeeAttendance } from '../services/attendanceService';
import { PersonnelDirectoryView } from './PersonnelDirectoryView';
import { ActivityManagementView } from './ActivityManagementView';
import { SystemSettingsView } from './SystemSettingsView';
import { ActivitiesCatalogView } from './ActivitiesCatalogView';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';

interface AdminDashboardProps {
  activity: Activity;
  activities?: Activity[];
  attendances: AttendanceRecord[];
  employees: Employee[];
  onSelectActivity?: (activityId: string) => void;
  onOpenKiosk: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activity,
  activities = [],
  attendances,
  employees,
  onSelectActivity,
  onOpenKiosk,
  onShowToast,
}) => {
  const [activeNav, setActiveNav] = useState<string>('activity-catalog');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectRecord, setInspectRecord] = useState<AttendanceRecord | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const { user, matchedEmployee, activeEmail, isAdmin, isHR } = useAuth();

  // Filter records
  const activeAttendances = attendances.filter(a => !a.isDeleted);

  const filteredAttendances = activeAttendances.filter(record => {
    // Dept filter
    if (selectedDept !== 'all' && record.departmentId !== selectedDept) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'all' && record.status !== selectedStatus) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = record.employeeId.toLowerCase().includes(q);
      const matchName = record.employeeName.toLowerCase().includes(q);
      const matchEmail = record.email.toLowerCase().includes(q);
      const matchDept = record.department.toLowerCase().includes(q);
      const matchPos = record.position.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchDept && !matchPos) {
        return false;
      }
    }
    return true;
  });

  // Calculate live counts
  const totalCount = activeAttendances.length;
  const checkedCount = activeAttendances.filter(a => a.status === 'checked').length;
  const leaveCount = activeAttendances.filter(a => a.status === 'leave').length;
  const pendingCount = activeAttendances.filter(a => a.status === 'pending').length;
  const completionPercentage = totalCount > 0 ? ((checkedCount / totalCount) * 100).toFixed(1) : '0';

  // Manual Check-in Handler
  const handleManualCheckIn = async (employeeId: string, employeeName: string) => {
    setIsProcessingId(employeeId);
    try {
      await manualHRCheckIn(activity.activityId, employeeId, 'นางสาววรรณภา สีดาพล (HR OAS KKU)');
      onShowToast(`เช็กชื่อ ${employeeId} (${employeeName}) สำเร็จโดย HR เจ้าหน้าที่รับรอง`);
    } catch (err) {
      console.error(err);
      onShowToast(`เกิดข้อผิดพลาดในการบันทึกข้อมูล`);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Mark Leave Handler
  const handleMarkLeave = async (employeeId: string, employeeName: string) => {
    setIsProcessingId(employeeId);
    try {
      await markEmployeeLeave(activity.activityId, employeeId, 'แจ้งลาอบรมราชการ (อนุมัติผ่านระบบ มข.)');
      onShowToast(`บันทึกการลาของ ${employeeName} เรียบร้อยแล้ว`);
      setInspectRecord(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Reset Status Handler
  const handleResetStatus = async (employeeId: string, employeeName: string) => {
    setIsProcessingId(employeeId);
    try {
      await resetEmployeeAttendance(activity.activityId, employeeId);
      onShowToast(`รีเซ็ตสถานะของ ${employeeName} เป็นยังไม่ลงทะเบียน`);
      setInspectRecord(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Export to Excel (CSV with UTF-8 BOM for Thai support)
  const handleExportExcel = () => {
    const headers = [
      'ลำดับ',
      'รหัสบุคลากร',
      'รหัสสังกัด',
      'ชื่อ-สกุล',
      'ตำแหน่ง',
      'สังกัด',
      'หน่วยงาน',
      'e-mail',
      'Permission',
      'สถานะ',
      'สถานะบัญชี',
      'บทบาทในระบบ',
      'เวลาเช็กชื่อ (Check-in)',
      'ช่องทางสแกน',
      'สถานะการเข้าร่วม'
    ];
    const rows = activeAttendances.map(a => [
      a.orderNo,
      a.employeeId,
      a.affiliationCode || '-',
      `"${a.employeeName}"`,
      `"${a.position}"`,
      `"${a.department}"`,
      `"${a.unit || '-'}"`,
      a.email,
      `"${a.permission || 'ผู้ใช้งาน'}"`,
      `"${a.statusRole || '-'}"`,
      a.accountStatus ?? 1,
      `"${a.systemRole || '-'}"`,
      a.checkInTime || '-',
      a.checkInMethod || '-',
      a.status === 'checked' ? 'เข้าร่วมแล้ว' : a.status === 'leave' ? 'ลาราชการ' : 'ยังไม่ลงทะเบียน',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OAS_KKU_Personnel_Attendance_${activity.activityId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('ส่งออกไฟล์ Excel (.xlsx / .csv) พร้อมข้อมูลบุคลากรสมบูรณ์เรียบร้อย');
  };

  const handlePrint = () => {
    window.print();
  };

  // Department counts for tabs
  const deptCounts: Record<DepartmentId | 'all', number> = {
    all: activeAttendances.length,
    exec: activeAttendances.filter(a => a.departmentId === 'exec').length,
    plan: activeAttendances.filter(a => a.departmentId === 'plan').length,
    it: activeAttendances.filter(a => a.departmentId === 'it').length,
    lifelong: activeAttendances.filter(a => a.departmentId === 'lifelong').length,
    social: activeAttendances.filter(a => a.departmentId === 'social').length,
    cat: activeAttendances.filter(a => a.departmentId === 'cat').length,
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0d1c2f] flex font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif]">
      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Left Sidebar (Image 3) - Responsive Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#eff4ff] z-50 flex flex-col justify-between py-6 px-4 border-r border-slate-200/70 shadow-xl lg:shadow-xs transition-transform duration-300 ease-in-out ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo & Office Title */}
          <div className="px-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center p-1">
                <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg text-[#66000b] block leading-tight font-bold">
                  OAS KKU
                </span>
                <span className="text-xs text-slate-500 block">สำนักบริการวิชาการ มข.</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="ปิดเมนู"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="px-3 py-2 bg-[#e6eeff] rounded-xl border border-blue-100">
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
              ระบบงานภายใน (NoSQL)
            </span>
            <span className="text-sm text-slate-900 block font-bold">บันทึกเวลาและกิจกรรมบุคลากร</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                setActiveNav('activity-catalog');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'activity-catalog'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>กิจกรรม & ลงทะเบียน (MVP)</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('overview-dashboard');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'overview-dashboard'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>แดชบอร์ดภาพรวม</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('activity-management');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'activity-management'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">event_available</span>
              <span>จัดการกิจกรรม</span>
            </button>

            {/* Jump to Kiosk Mode */}
            <button
              onClick={() => {
                onOpenKiosk();
                setIsMobileNavOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900 transition-all text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[20px] text-[#ab3600]">qr_code_scanner</span>
              <span>ระบบเช็กชื่อ QR หน้างาน (Kiosk)</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('attendance-reports');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'attendance-reports'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              <span>รายงานการเข้าร่วมและสถิติ</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('personnel-directory');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'personnel-directory'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span>ข้อมูลบุคลากรสำนักฯ 30 ท่าน</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('system-settings');
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                activeNav === 'system-settings'
                  ? 'bg-[#8a151b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#e6eeff] hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span>การตั้งค่า</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-3 pt-4 border-t border-slate-200 flex flex-col gap-2 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>{activity.floor}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          </div>
          <div className="text-center text-[11px] text-slate-400">
            © 2024 OAS Khon Kaen University
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="w-full lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-slate-200/70 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition-colors"
              title="เปิดเมนูนำทาง"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <img src="/baslogo.png" alt="OAS KKU" className="h-9 sm:h-10 w-auto object-contain" />
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-slate-800 block leading-tight">
                ระบบบันทึกเวลาและเข้าร่วมกิจกรรมบุคลากร
              </span>
              <span className="text-xs text-slate-500 font-medium">สำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff4ff] text-slate-700 text-xs border border-blue-100">
              <span className="material-symbols-outlined text-[16px] text-[#ab3600]">meeting_room</span>
              <span className="font-semibold">{activity.room}</span>
              <span className="text-slate-400">• ชั้น 5 อาคารพิมล กลกิจ</span>
            </div>

            {/* SSO / Google User Profile Trigger */}
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 sm:pr-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs transition-all text-left group"
              title="คลิกเพื่อเข้าสู่ระบบ KKU SSO / สลับบัญชี"
            >
              <div className="w-8 h-8 rounded-xl bg-[#66000b] text-white flex items-center justify-center shadow-xs text-xs font-bold shrink-0">
                {matchedEmployee?.avatarInitials || (user?.displayName ? user.displayName.slice(0, 2) : 'SSO')}
              </div>
              <div className="text-left hidden sm:block max-w-[150px] xl:max-w-[210px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-900 font-bold block leading-tight truncate">
                    {matchedEmployee?.name || user?.displayName || 'เข้าสู่ระบบ SSO'}
                  </span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.2 rounded bg-[#66000b] text-white text-[9px] font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block truncate font-mono">
                  {activeEmail || 'เชื่อมโยง Google / SSO'}
                </span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-700 transition-colors">
                expand_more
              </span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="w-full pt-20 px-4 sm:px-6 lg:px-8 pb-12 flex-1 flex flex-col gap-6">
          {activeNav === 'activity-catalog' ? (
            <ActivitiesCatalogView
              activities={activities.length > 0 ? activities : [activity]}
              users={employees}
              currentActivityId={activity.activityId}
              onSelectActivity={onSelectActivity || (() => {})}
              onShowToast={onShowToast}
            />
          ) : activeNav === 'personnel-directory' ? (
            <PersonnelDirectoryView employees={employees} onShowToast={onShowToast} />
          ) : activeNav === 'activity-management' ? (
            <ActivityManagementView activity={activity} onShowToast={onShowToast} />
          ) : activeNav === 'system-settings' ? (
            <SystemSettingsView activity={activity} setting={null} onShowToast={onShowToast} />
          ) : (
            <>
              {/* Top Context Header Card */}
              <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 bg-white rounded-2xl shadow-xs border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] border border-blue-100 flex items-center justify-center shrink-0 text-[#66000b]">
                <span className="material-symbols-outlined text-3xl">analytics</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] uppercase px-2.5 py-0.5 rounded-full bg-[#ab3600] text-white font-bold font-['IBM_Plex_Sans_Thai']">
                    รายงานทางการ HR
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">domain</span> สำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น (OAS KKU)
                  </span>
                  <span className="text-xs text-slate-500">• เกณฑ์ประเมินสมรรถนะบุคลากร มข. 2567</span>
                </div>
                <h1 className="text-2xl text-slate-900 font-bold tracking-tight">
                  รายงานและสถิติการเข้าร่วมกิจกรรมบุคลากร
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#66000b]">โครงการ:</span>
                  <span className="text-slate-800">{activity.title}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                    {activity.date} | {activity.timeRange}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                    {activity.room}
                  </span>
                </p>
              </div>
            </div>

            {/* Export & Print Buttons */}
            <div className="flex items-center flex-wrap gap-2.5 self-start xl:self-auto shrink-0">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-xs font-semibold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span>
                <span>ส่งออก Excel (.xlsx)</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-xs font-semibold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">picture_as_pdf</span>
                <span>ส่งออก PDF สรุปส่งผู้บริหาร</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#66000b] text-white hover:bg-[#8a151b] shadow-xs text-xs font-semibold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>พิมพ์ใบลงนามเข้างาน</span>
              </button>
            </div>
          </section>

          {/* 4 Summary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Target */}
            <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ยอดบุคลากรเป้าหมาย</span>
                <div className="w-9 h-9 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#66000b]">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900 font-mono leading-none">
                  {totalCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">ท่าน</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-slate-500 text-xs">
                <span>ครบตามกรอบอัตรากำลัง</span>
                <span className="font-bold text-[#66000b]">100.0%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#66000b] rounded-full w-full"></div>
              </div>
            </div>

            {/* Card 2: Checked In */}
            <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">เข้าร่วมและเช็กชื่อแล้ว</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-700 font-mono leading-none">
                  {checkedCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">ท่าน</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">ผ่านเกณฑ์ขั้นต่ำ 70% มข.</span>
                <span className="font-bold text-emerald-700">{completionPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Card 3: Pending / Leave */}
            <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ยังไม่เช็กชื่อ / ลาปฏิบัติงาน</span>
                <div className="w-9 h-9 rounded-xl bg-[#ffdbcf] flex items-center justify-center text-[#ab3600]">
                  <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#ab3600] font-mono leading-none">
                  {pendingCount + leaveCount}
                </span>
                <span className="text-sm font-semibold text-slate-500">ท่าน</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>ยังไม่มา ({pendingCount}) | ลาราชการ ({leaveCount})</span>
                <span className="font-bold text-[#ab3600]">
                  {(((pendingCount + leaveCount) / totalCount) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#ab3600] rounded-full transition-all duration-500"
                  style={{ width: `${(((pendingCount + leaveCount) / totalCount) * 100).toFixed(1)}%` }}
                ></div>
              </div>
            </div>

            {/* Card 4: 100% Benchmark Group */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#eff4ff] shadow-xs border border-blue-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">กลุ่มงานดีเด่น (ครบ 100%)</span>
                <div className="w-9 h-9 rounded-xl bg-[#8a151b] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-base font-bold text-slate-900 block leading-snug">
                  ภารกิจแผน การเงิน และพัสดุ
                </span>
                <span className="text-xs text-[#8a151b] font-semibold mt-1 inline-block">
                  เช็กชื่อครบ 5 จาก 5 ท่าน (100%)
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-slate-500 text-xs">
                <span>สถิติเข้าตรงเวลา</span>
                <span className="font-bold text-emerald-600">ครบถ้วน</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#8a151b] rounded-full w-full"></div>
              </div>
            </div>
          </section>

          {/* Analytical Bar Chart & Key Metrics (Image 3) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Division Bar Breakdown (2 Cols) */}
            <div className="lg:col-span-2 p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    อัตราการเข้าร่วมกิจกรรมแยกตาม 6 กลุ่มงาน
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เปรียบเทียบจำนวนบุคลากรที่เช็กชื่อเข้างานกับกรอบอัตรากำลังเป้าหมาย (NoSQL Denormalized View)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#66000b]"></span>
                    <span>เช็กชื่อแล้ว</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-200"></span>
                    <span>คงเหลือ</span>
                  </div>
                </div>
              </div>

              {/* 6 Department Progress Rows */}
              <div className="space-y-3.5">
                {[
                  { id: 'exec', label: 'คณะผู้บริหารสำนักฯ', target: 4, checked: activeAttendances.filter(a => a.departmentId === 'exec' && a.status === 'checked').length, color: 'bg-[#66000b]' },
                  { id: 'plan', label: 'ภารกิจแผน การเงิน และพัสดุ', target: 5, checked: activeAttendances.filter(a => a.departmentId === 'plan' && a.status === 'checked').length, color: 'bg-emerald-600' },
                  { id: 'it', label: 'ภารกิจสารสนเทศและการสื่อสาร', target: 5, checked: activeAttendances.filter(a => a.departmentId === 'it' && a.status === 'checked').length, color: 'bg-[#66000b]' },
                  { id: 'lifelong', label: 'ศูนย์จัดการศึกษาตลอดชีวิต Lifelong Learning', target: 6, checked: activeAttendances.filter(a => a.departmentId === 'lifelong' && a.status === 'checked').length, color: 'bg-[#ab3600]' },
                  { id: 'social', label: 'ศูนย์บริการวิชาการเพื่อสังคม Social Engagement', target: 6, checked: activeAttendances.filter(a => a.departmentId === 'social' && a.status === 'checked').length, color: 'bg-[#ab3600]' },
                  { id: 'cat', label: 'ศูนย์ทดสอบความรู้ความสามารถทางวิชาการ CAT KKU', target: 4, checked: activeAttendances.filter(a => a.departmentId === 'cat' && a.status === 'checked').length, color: 'bg-[#ab3600]' },
                ].map(dept => {
                  const pct = Math.round((dept.checked / dept.target) * 100);
                  const isComplete = pct === 100;
                  return (
                    <div key={dept.id}>
                      <div className="flex justify-between items-center text-xs mb-1 font-medium">
                        <span className="font-semibold text-slate-800">{dept.label} ({dept.target} ท่าน)</span>
                        <span className={`font-mono ${isComplete ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                          {dept.checked} / {dept.target} ท่าน ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full ${dept.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-[#eff4ff] px-4 py-2.5 rounded-xl border border-blue-50">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#032879]">info</span>
                  ระบบเช็กชื่อแบบเรียลไทม์ผ่าน QR Kiosk หน้าระเบียงห้องมณีเทวา
                </span>
                <span className="font-mono">อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')} น.</span>
              </div>
            </div>

            {/* Live Scan Activity Stream (1 Col) */}
            <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-slate-900">การเช็กชื่อ 4 รายการล่าสุด</h2>
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  เจ้าหน้าที่ยืนยันตัวตนผ่าน Mobile QR หน้าห้องประชุม
                </p>

                <div className="space-y-2.5">
                  {activeAttendances
                    .filter(a => a.status === 'checked' && a.checkInTime)
                    .slice(0, 4)
                    .map((item) => (
                      <div
                        key={item.employeeId}
                        className="p-3 bg-[#eff4ff] rounded-xl flex items-center justify-between border border-blue-50/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#8a151b] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {item.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{item.employeeName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{item.position}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#66000b] font-mono shrink-0">
                          {item.checkInTime}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Quick Action Button */}
              <div className="mt-4 pt-3">
                <button
                  onClick={() => {
                    const el = document.getElementById('adminSearchInput');
                    if (el) el.focus();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#e6eeff] hover:bg-[#dde9ff] text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>ลงทะเบียนด่วนให้บุคลากร (Manual Check-in)</span>
                </button>
              </div>
            </div>
          </section>

          {/* Filter & Search Control Panel (Image 3) */}
          <section className="p-4 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-4">
            {/* Division Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#eff4ff] p-1.5 rounded-xl border border-blue-50">
              {[
                { id: 'all', label: `ทั้งหมด (${deptCounts.all})` },
                { id: 'exec', label: `คณะผู้บริหาร (${deptCounts.exec})` },
                { id: 'plan', label: `ภารกิจแผน การเงิน พัสดุ (${deptCounts.plan})` },
                { id: 'it', label: `ภารกิจสารสนเทศและการสื่อสาร (${deptCounts.it})` },
                { id: 'lifelong', label: `ศ.จัดการศึกษาตลอดชีวิต (${deptCounts.lifelong})` },
                { id: 'social', label: `ศ.บริการวิชาการสังคม (${deptCounts.social})` },
                { id: 'cat', label: `CAT KKU (${deptCounts.cat})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedDept(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    selectedDept === tab.id
                      ? 'bg-white text-[#66000b] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  search
                </span>
                <input
                  id="adminSearchInput"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารหัส OAS (เช่น OAS01), ชื่อ-สกุล หรืออีเมล kku.ac.th..."
                  className="w-full h-10 pl-10 pr-4 bg-[#eff4ff] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#8a151b]/20"
                  type="text"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <span className="text-xs text-slate-500 shrink-0">สถานะ:</span>
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    selectedStatus === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({totalCount})
                </button>
                <button
                  onClick={() => setSelectedStatus('checked')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    selectedStatus === 'checked'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                  เช็กชื่อแล้ว ({checkedCount})
                </button>
                <button
                  onClick={() => setSelectedStatus('pending')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    selectedStatus === 'pending'
                      ? 'bg-[#ab3600] text-white'
                      : 'bg-[#ffdbcf] text-[#822700] hover:bg-[#ffb59c]'
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-[#ab3600] mr-1.5"></span>
                  ยังไม่เช็กชื่อ ({pendingCount})
                </button>
                <button
                  onClick={() => setSelectedStatus('leave')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    selectedStatus === 'leave'
                      ? 'bg-[#032879] text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-[#032879] mr-1.5"></span>
                  ลาราชการ ({leaveCount})
                </button>
              </div>
            </div>
          </section>

          {/* Master Attendance Table (All 30 OAS Personnel from Image 3) */}
          <section className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between bg-[#eff4ff] border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#66000b]">badge</span>
                <h3 className="text-sm font-bold text-slate-900">
                  บัญชีรายชื่อบุคลากรสำนักบริการวิชาการ (30 ท่าน)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#66000b]/10 text-[#66000b] text-xs font-bold font-mono">
                  แสดง {filteredAttendances.length} จาก {totalCount} รายการ
                </span>
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                คลิกที่ปุ่ม <span className="font-bold text-[#66000b]">เช็กชื่อ HR</span> เพื่ออัปเดตสถานะกรณีบุคคลไม่ได้นำสมาร์ตโฟนมา
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f8f9ff] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                    <th className="py-3 px-4 w-20">รหัส</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-4">ตำแหน่งในสำนักฯ</th>
                    <th className="py-3 px-4">สังกัด / กลุ่มงาน</th>
                    <th className="py-3 px-4">อีเมล KKU</th>
                    <th className="py-3 px-4">เวลาลงทะเบียน (CHECK-IN)</th>
                    <th className="py-3 px-4">วิธีสแกน</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl block mb-2">person_search</span>
                        ไม่พบข้อมูลบุคลากรที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredAttendances.map((record) => {
                      const isPending = record.status === 'pending';
                      const isLeave = record.status === 'leave';
                      const isChecked = record.status === 'checked';
                      const isProcessing = isProcessingId === record.employeeId;

                      return (
                        <tr
                          key={record.employeeId}
                          className={`hover:bg-[#f8f9ff] transition-colors ${
                            isPending ? 'bg-[#ffdbcf]/10' : isLeave ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            {record.orderNo}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#66000b]">
                            {record.employeeId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {record.employeeName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={record.position}>
                            {record.position}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded-md bg-[#eff4ff] text-slate-800 font-medium text-[11px] inline-block w-fit">
                                {record.department}
                              </span>
                              {record.unit && (
                                <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={record.unit}>
                                  {record.unit}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {record.email}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {isChecked ? (
                              <span className="text-[#66000b]">{record.checkInTime}</span>
                            ) : isLeave ? (
                              <span className="text-[#032879]">{record.checkInTime}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {record.checkInMethod || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isChecked && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                เข้าร่วมแล้ว
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffdbcf] text-[#822700] font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ab3600]"></span>
                                ยังไม่ลงทะเบียน
                              </span>
                            )}
                            {isLeave && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#032879]"></span>
                                แจ้งลาอบรมราชการ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPending ? (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleManualCheckIn(record.employeeId, record.employeeName)}
                                className="px-2.5 py-1 rounded-lg bg-[#66000b] text-white hover:bg-[#8a151b] font-medium text-[11px] shadow-xs flex items-center gap-1 mx-auto transition-colors disabled:opacity-50"
                                title="เช็กชื่อโดย HR"
                              >
                                {isProcessing ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                )}
                                <span>เช็กชื่อ HR</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setInspectRecord(record)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#66000b] hover:bg-[#eff4ff] transition-colors"
                                title="ดูรายละเอียด / แก้ไข"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-[#eff4ff] border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                แสดงข้อมูลลำดับที่ 1 ถึง {filteredAttendances.length} จากทั้งหมด 30 ท่าน (สมบูรณ์ 100% ตามฐานข้อมูล OAS KKU)
              </div>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-medium">
                  ก่อนหน้า
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-[#66000b] text-white font-bold">1</button>
                <button className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-medium">
                  ถัดไป
                </button>
              </div>
            </div>
          </section>

          {/* Official Certification & HR Attestation Footer (Image 3) */}
          <section className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#eff4ff] border border-blue-100 flex items-center justify-center text-[#66000b] shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  การรับรองความถูกต้องของข้อมูลการเข้าร่วมกิจกรรม
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายงานผลนี้ส่งตรงเข้าสู่ระบบสารสนเทศทรัพยากรบุคคล มหาวิทยาลัยขอนแก่น เพื่อใช้เป็นหลักฐานประกอบการประเมินสมรรถนะประจำปี
                </p>
              </div>
            </div>

            <div className="bg-[#eff4ff] p-4 rounded-xl border border-blue-100 flex items-center gap-4 w-full md:w-auto shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">ผู้รับรองข้อมูล (เจ้าหน้าที่งานบริหารบุคคล)</span>
                <span className="text-sm font-bold text-slate-900 block">นางสาววรรณภา สีดาพล</span>
                <span className="text-xs text-[#66000b] block font-mono">
                  ประทับเวลา: 24 ต.ค. 2567 | 08:50:30 น.
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <span className="material-symbols-outlined text-[22px]">check</span>
              </div>
            </div>
          </section>
            </>
          )}
        </main>
      </div>

      {/* Record Inspection / Modification Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#66000b] text-white flex items-center justify-center font-bold text-sm">
                  {inspectRecord.avatarInitials}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{inspectRecord.employeeName}</h3>
                  <p className="text-xs text-slate-500">{inspectRecord.employeeId} • {inspectRecord.email}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">สังกัดหลัก</span>
                <span className="font-semibold text-slate-800">{inspectRecord.department}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">หน่วยงาน / ภารกิจ</span>
                <span className="font-semibold text-slate-800">{inspectRecord.unit || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">ตำแหน่ง</span>
                <span className="font-semibold text-slate-800">{inspectRecord.position}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">รหัสสังกัด / Permission</span>
                <span className="font-semibold text-slate-800">
                  {inspectRecord.affiliationCode || '-'} • {inspectRecord.permission || 'ผู้ใช้งาน'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">สถานะ / บทบาทในระบบ</span>
                <span className="font-semibold text-slate-800">
                  {inspectRecord.statusRole || '-'} ({inspectRecord.systemRole || '-'})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[11px]">เวลาเช็กชื่อ / ช่องทาง</span>
                <span className="font-semibold text-[#66000b] font-mono">
                  {inspectRecord.checkInTime || 'ยังไม่ลงทะเบียน'} {inspectRecord.checkInMethod ? `(${inspectRecord.checkInMethod})` : ''}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#eff4ff] rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-600">สถานะปัจจุบัน:</span>
              <span className="font-bold text-slate-900">
                {inspectRecord.status === 'checked' ? '✅ เข้าร่วมแล้ว' : inspectRecord.status === 'leave' ? '📄 ลาราชการ' : '⏳ ยังไม่ลงทะเบียน'}
              </span>
            </div>

            {/* Actions in Modal */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {inspectRecord.status !== 'checked' && (
                <button
                  onClick={() => {
                    handleManualCheckIn(inspectRecord.employeeId, inspectRecord.employeeName);
                    setInspectRecord(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#66000b] text-white font-semibold text-xs hover:bg-[#8a151b] transition-colors"
                >
                  เช็กชื่อทันที (HR Confirm)
                </button>
              )}

              {inspectRecord.status !== 'leave' && (
                <button
                  onClick={() => handleMarkLeave(inspectRecord.employeeId, inspectRecord.employeeName)}
                  className="py-2.5 px-3 rounded-xl bg-blue-100 text-blue-900 font-semibold text-xs hover:bg-blue-200 transition-colors"
                >
                  แจ้งลาราชการ
                </button>
              )}

              {inspectRecord.status !== 'pending' && (
                <button
                  onClick={() => handleResetStatus(inspectRecord.employeeId, inspectRecord.employeeName)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
                >
                  รีเซ็ตสถานะ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* KKU SSO / Google Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        employees={employees}
      />
    </div>
  );
};
