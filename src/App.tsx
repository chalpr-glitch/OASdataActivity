/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  initializeFirestoreDatabase,
  subscribeToActivity,
  subscribeToActivities,
  subscribeToRegistrations,
  subscribeToUsers,
  subscribeToSettings,
} from './services/attendanceService';
import { Activity, AttendanceRecord, Employee, SystemSetting } from './types/attendance';
import { AuthProvider } from './contexts/AuthContext';
import { KioskView } from './components/KioskView';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<'kiosk' | 'admin'>('kiosk');
  const [currentActivityId, setCurrentActivityId] = useState<string>('OAS-ACT-2024-001');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [, setSetting] = useState<SystemSetting | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Initial bootstrap and global collections listener
  useEffect(() => {
    let unsubActivities: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        await initializeFirestoreDatabase();
      } catch (err) {
        console.error('Firestore bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }

      // Requirement 3: Subscribe to activities
      unsubActivities = subscribeToActivities((acts) => {
        setActivities(acts);
      });

      // Requirement 2: Subscribe to users from 'users' collection
      unsubUsers = subscribeToUsers((users) => {
        setEmployees(users);
      });

      unsubSettings = subscribeToSettings((sett) => {
        if (sett) setSetting(sett);
      });
    };

    bootstrap();

    return () => {
      if (unsubActivities) unsubActivities();
      if (unsubUsers) unsubUsers();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Listen to selected activity and its registrations subcollection
  useEffect(() => {
    let unsubActivity: (() => void) | undefined;
    let unsubRegistrations: (() => void) | undefined;

    unsubActivity = subscribeToActivity(currentActivityId, (act) => {
      if (act) setActivity(act);
    });

    // Requirement 5: Subscribe to activities/{activityId}/registrations/{employeeId}
    unsubRegistrations = subscribeToRegistrations(currentActivityId, (regs) => {
      setAttendances(regs);
    });

    return () => {
      if (unsubActivity) unsubActivity();
      if (unsubRegistrations) unsubRegistrations();
    };
  }, [currentActivityId]);

  if (isLoading || !activity) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-6 text-center font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif]">
        <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-slate-100 p-2 mb-4 animate-pulse">
          <img src="/baslogo.png" alt="OAS KKU" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-[#66000b]">กำลังเชื่อมต่อ Cloud Firestore NoSQL...</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          ระบบบันทึกเวลาและกิจกรรมบุคลากร สำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น (OAS KKU)
        </p>
        <div className="mt-5 w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#66000b] rounded-full animate-indeterminate"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider employees={employees} onShowToast={showToast}>
      <div className="relative font-['TH_Sarabun_New','THSarabunNew','Sarabun',sans-serif] selection:bg-[#ffdad7] selection:text-[#66000b]">
        {/* View Switcher Floating Badge (Fast Switch between Kiosk & Admin) */}
        <div className="fixed bottom-5 left-5 z-40 print:hidden flex items-center gap-1.5 p-1 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80">
          <button
            onClick={() => setCurrentView('kiosk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'kiosk'
                ? 'bg-[#66000b] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="หน้าจอ Kiosk สำหรับหน้าห้องประชุม"
          >
            <span className="material-symbols-outlined text-[16px]">co_present</span>
            <span>โหมด Kiosk</span>
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'admin'
                ? 'bg-[#66000b] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="ระบบจัดการและรายงานสำหรับ HR"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>ระบบจัดการ (Admin)</span>
          </button>
        </div>

        {/* Render Current View */}
        {currentView === 'kiosk' ? (
          <KioskView
            activity={activity}
            attendances={attendances}
            employees={employees}
            onOpenAdmin={() => setCurrentView('admin')}
            onShowToast={showToast}
          />
        ) : (
          <AdminDashboard
            activity={activity}
            activities={activities}
            attendances={attendances}
            employees={employees}
            onSelectActivity={(id) => setCurrentActivityId(id)}
            onOpenKiosk={() => setCurrentView('kiosk')}
            onShowToast={showToast}
          />
        )}

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0d1c2f] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-slate-700 animate-slideUp">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
            <span className="font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}
