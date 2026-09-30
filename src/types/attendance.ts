export type DepartmentId = 'exec' | 'plan' | 'it' | 'lifelong' | 'social' | 'cat';

export interface DepartmentInfo {
  id: DepartmentId;
  name: string;
  shortName: string;
  order: number;
}

export interface Employee {
  employeeId: string; // e.g. "OAS01"
  orderNo: number;
  name: string;
  position: string;
  department: string;
  departmentId: DepartmentId;
  affiliationCode?: string; // รหัสสังกัด
  unit?: string; // หน่วยงาน
  permission?: string; // Permission
  statusRole?: string; // สถานะ
  accountStatus?: number; // สถานะบัญชี
  systemRole?: string; // บทบาทในระบบ
  email: string;
  phone?: string;
  avatarInitials: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentStatItem {
  id: DepartmentId;
  name: string;
  target: number;
  checkedIn: number;
  percentage: number;
}

export interface RecentCheckInItem {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  checkInTime: string;
  avatarInitials: string;
  method: string;
}

export interface Activity {
  activityId: string; // e.g. "OAS-ACT-2024-001"
  title: string;
  description: string;
  date: string; // e.g. "24 ต.ค. 2567"
  timeRange: string; // e.g. "08:30 - 16:30 น."
  room: string; // e.g. "ห้องประชุมมณีเทวา"
  floor: string; // e.g. "ชั้น 5 อาคารพิมล กลกิจ สำนักบริการวิชาการ มข."
  targetCount: number; // 30
  registeredCount: number; // Current live registered attendees count
  openedAt?: string; // "08:00 น."
  currentDynamicToken: string;
  tokenExpiresAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  // Denormalized aggregates for instant zero-join reads
  checkedInCount?: number;
  pendingCount?: number;
  leaveCount?: number;
  completionRate?: number;
  departmentStats?: Record<DepartmentId, DepartmentStatItem>;
  latestCheckIns?: RecentCheckInItem[];
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'registered' | 'checked' | 'pending' | 'leave';

export interface AttendanceRecord {
  employeeId: string; // Document ID under subcollection: activities/{activityId}/registrations/{employeeId}
  activityId: string;
  status: AttendanceStatus;
  orderNo?: number;
  employeeName: string;
  position: string;
  department: string;
  departmentId: DepartmentId;
  affiliationCode?: string; // รหัสสังกัด
  unit?: string; // หน่วยงาน
  permission?: string; // Permission
  statusRole?: string; // สถานะ
  accountStatus?: number; // สถานะบัญชี
  systemRole?: string; // บทบาทในระบบ
  email: string;
  avatarInitials?: string;
  registeredAt?: string; // e.g. "30 ก.ย. 2569 09:15 น."
  registeredTimestamp?: string; // ISO
  checkInTime: string | null; // e.g. "08:42:15 น."
  checkInTimestamp: string | null; // ISO
  checkInMethod: string | null; // "QR Code Kiosk" | "Mobile Self-Scan" | "Web Portal Registration" | "ผู้ดูแลระบบ (HR Host)"
  verifiedBy?: string | null;
  remarks?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Aliases for explicit user specification
export type Registration = AttendanceRecord;
export type UserProfile = Employee;

export interface SystemSetting {
  id: string; // "kiosk_config"
  activeRoom: string;
  availableRooms: string[];
  dynamicQrIntervalSec: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
