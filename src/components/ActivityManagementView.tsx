import React, { useState } from 'react';
import { Activity } from '../types/attendance';
import { updateActiveRoom } from '../services/attendanceService';

interface ActivityManagementViewProps {
  activity: Activity;
  onShowToast: (msg: string) => void;
}

export const ActivityManagementView: React.FC<ActivityManagementViewProps> = ({
  activity,
  onShowToast,
}) => {
  const [selectedRoom, setSelectedRoom] = useState(activity.room);

  const handleSaveRoom = async () => {
    try {
      await updateActiveRoom(activity.activityId, selectedRoom);
      onShowToast(`บันทึกห้องประชุม "${selectedRoom}" ลงใน Firestore สำเร็จ`);
    } catch (err) {
      console.error(err);
      onShowToast(`เกิดข้อผิดพลาดในการบันทึก`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#66000b] text-white text-xs font-semibold">
              NoSQL Master Collection
            </span>
            <span className="text-xs text-slate-500 font-mono">/activities/&#123;activityId&#125;</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">การจัดการกิจกรรมและห้องประชุม</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            รหัสกิจกรรมหลัก: <strong className="font-mono text-slate-800">{activity.activityId}</strong>
          </p>
        </div>
      </div>

      {/* Activity Profile Card */}
      <div className="p-6 bg-white rounded-2xl shadow-xs border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              ชื่อกิจกรรม / โครงการ
            </label>
            <input
              type="text"
              readOnly
              value={activity.title}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              รายละเอียดโครงการ
            </label>
            <textarea
              readOnly
              rows={3}
              value={activity.description}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                วันที่จัดกิจกรรม
              </label>
              <input
                type="text"
                readOnly
                value={activity.date}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                ช่วงเวลา
              </label>
              <input
                type="text"
                readOnly
                value={activity.timeRange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              ห้องประชุมที่จัด (เชื่อมโยงหน้า Kiosk)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a151b]/30"
              >
                <option value="ห้องประชุมมณีเทวา">ห้องประชุมมณีเทวา</option>
                <option value="ห้องประชุมดุสิตา">ห้องประชุมดุสิตา</option>
                <option value="ห้องประชุมสุพรรณิการ์">ห้องประชุมสุพรรณิการ์</option>
              </select>
              <button
                onClick={handleSaveRoom}
                className="px-4 py-2.5 rounded-xl bg-[#66000b] hover:bg-[#8a151b] text-white text-xs font-bold shadow-xs transition-colors"
              >
                บันทึกห้อง
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              สถานที่ตั้ง
            </label>
            <input
              type="text"
              readOnly
              value={activity.floor}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          {/* Subcollection Architecture Note */}
          <div className="p-4 rounded-xl bg-[#eff4ff] border border-blue-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#66000b] font-bold text-xs">
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <span>NoSQL Subcollection Path</span>
            </div>
            <code className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-blue-100 text-slate-800 block break-all">
              /activities/{activity.activityId}/attendances/&#123;employeeId&#125;
            </code>
            <p className="text-[11px] text-slate-500">
              ข้อมูลการเข้ากิจกรรมของแต่ละบุคลากรจะถูกจัดเก็บใน Subcollection ใต้กิจกรรมนี้ โดยไม่ต้อง JOIN กับตารางอื่น
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
