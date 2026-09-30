import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Activity,
  AttendanceRecord,
  AttendanceStatus,
  DepartmentId,
  DepartmentStatItem,
  Employee,
  RecentCheckInItem,
  SystemSetting,
} from '../types/attendance';
import { MASTER_EMPLOYEES, INITIAL_ATTENDANCE_STATE, OAS_DEPARTMENTS } from '../data/seedEmployees';

export const DEFAULT_ACTIVITY_ID = 'OAS-ACT-2024-001';
const SETTINGS_DOC_ID = 'kiosk_config';

// Initial Activities Seed List (3 Activities)
export const SEED_ACTIVITIES: Omit<Activity, 'createdAt' | 'updatedAt' | 'isDeleted'>[] = [
  {
    activityId: 'OAS-ACT-2024-001',
    title: 'การประชุมเชิงปฏิบัติการพัฒนาบุคลากรด้านเทคโนโลยีดิจิทัลและ AI',
    description: 'โครงการพัฒนาทักษะด้านเทคโนโลยีและดิจิทัลสำหรับบุคลากรสำนักบริการวิชาการ มหาวิทยาลัยขอนแก่น ประจำปี 2567',
    date: '24 ต.ค. 2567',
    timeRange: '08:30 - 16:30 น.',
    room: 'ห้องประชุมมณีเทวา',
    floor: 'ชั้น 5 อาคารพิมล กลกิจ สำนักบริการวิชาการ มข.',
    targetCount: 30,
    registeredCount: 23,
    openedAt: '08:00 น.',
    currentDynamicToken: 'OAS-DGT99',
    tokenExpiresAt: new Date(Date.now() + 20000).toISOString(),
    status: 'active',
  },
  {
    activityId: 'OAS-ACT-2024-002',
    title: 'การอบรมมาตรฐานความปลอดภัยข้อมูลและการบริหารจัดการงานบริการวิชาการ',
    description: 'เสริมสร้างความเข้าใจพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) และมาตรฐานความปลอดภัยสารสนเทศสำนักบริการวิชาการ',
    date: '15 พ.ย. 2567',
    timeRange: '09:00 - 16:00 น.',
    room: 'ห้องประชุมดุสิตา',
    floor: 'ชั้น 5 อาคารพิมล กลกิจ สำนักบริการวิชาการ มข.',
    targetCount: 30,
    registeredCount: 16,
    openedAt: '08:30 น.',
    currentDynamicToken: 'OAS-SEC42',
    tokenExpiresAt: new Date(Date.now() + 20000).toISOString(),
    status: 'active',
  },
  {
    activityId: 'OAS-ACT-2024-003',
    title: 'สัมมนาทิศทางการขับเคลื่อนเศรษฐกิจ BCG และการบริการสังคม KKU',
    description: 'ระดมสมองกำหนดทิศทางยุทธศาสตร์การบริการวิชาการสู่ชุมชนเพื่อสังคมที่ยั่งยืน ตามแนวทางมหาวิทยาลัยขอนแก่น',
    date: '2 ธ.ค. 2567',
    timeRange: '09:00 - 12:00 น.',
    room: 'ห้องประชุมสุพรรณิการ์',
    floor: 'ชั้น 5 อาคารพิมล กลกิจ สำนักบริการวิชาการ มข.',
    targetCount: 30,
    registeredCount: 12,
    openedAt: '08:30 น.',
    currentDynamicToken: 'OAS-BCG18',
    tokenExpiresAt: new Date(Date.now() + 20000).toISOString(),
    status: 'active',
  },
];

// Helper to calculate denormalized statistics across all 30 attendees
export function computeActivityStats(attendances: AttendanceRecord[]) {
  const activeRecords = attendances.filter(a => !a.isDeleted);
  const targetCount = activeRecords.length || 30;
  let checkedInCount = 0;
  let pendingCount = 0;
  let leaveCount = 0;

  const departmentBuckets: Record<DepartmentId, { target: number; checkedIn: number }> = {
    exec: { target: 0, checkedIn: 0 },
    plan: { target: 0, checkedIn: 0 },
    it: { target: 0, checkedIn: 0 },
    lifelong: { target: 0, checkedIn: 0 },
    social: { target: 0, checkedIn: 0 },
    cat: { target: 0, checkedIn: 0 },
  };

  for (const item of activeRecords) {
    if (departmentBuckets[item.departmentId]) {
      departmentBuckets[item.departmentId].target += 1;
      if (item.status === 'checked') {
        departmentBuckets[item.departmentId].checkedIn += 1;
      }
    }

    if (item.status === 'checked') {
      checkedInCount++;
    } else if (item.status === 'leave') {
      leaveCount++;
    } else {
      pendingCount++;
    }
  }

  const departmentStats: Record<DepartmentId, DepartmentStatItem> = {
    exec: {
      id: 'exec',
      name: OAS_DEPARTMENTS.exec.shortName,
      target: departmentBuckets.exec.target,
      checkedIn: departmentBuckets.exec.checkedIn,
      percentage: departmentBuckets.exec.target > 0
        ? Math.round((departmentBuckets.exec.checkedIn / departmentBuckets.exec.target) * 1000) / 10
        : 0,
    },
    plan: {
      id: 'plan',
      name: OAS_DEPARTMENTS.plan.shortName,
      target: departmentBuckets.plan.target,
      checkedIn: departmentBuckets.plan.checkedIn,
      percentage: departmentBuckets.plan.target > 0
        ? Math.round((departmentBuckets.plan.checkedIn / departmentBuckets.plan.target) * 1000) / 10
        : 0,
    },
    it: {
      id: 'it',
      name: OAS_DEPARTMENTS.it.shortName,
      target: departmentBuckets.it.target,
      checkedIn: departmentBuckets.it.checkedIn,
      percentage: departmentBuckets.it.target > 0
        ? Math.round((departmentBuckets.it.checkedIn / departmentBuckets.it.target) * 1000) / 10
        : 0,
    },
    lifelong: {
      id: 'lifelong',
      name: OAS_DEPARTMENTS.lifelong.shortName,
      target: departmentBuckets.lifelong.target,
      checkedIn: departmentBuckets.lifelong.checkedIn,
      percentage: departmentBuckets.lifelong.target > 0
        ? Math.round((departmentBuckets.lifelong.checkedIn / departmentBuckets.lifelong.target) * 1000) / 10
        : 0,
    },
    social: {
      id: 'social',
      name: OAS_DEPARTMENTS.social.shortName,
      target: departmentBuckets.social.target,
      checkedIn: departmentBuckets.social.checkedIn,
      percentage: departmentBuckets.social.target > 0
        ? Math.round((departmentBuckets.social.checkedIn / departmentBuckets.social.target) * 1000) / 10
        : 0,
    },
    cat: {
      id: 'cat',
      name: OAS_DEPARTMENTS.cat.shortName,
      target: departmentBuckets.cat.target,
      checkedIn: departmentBuckets.cat.checkedIn,
      percentage: departmentBuckets.cat.target > 0
        ? Math.round((departmentBuckets.cat.checkedIn / departmentBuckets.cat.target) * 1000) / 10
        : 0,
    },
  };

  const completionRate = targetCount > 0
    ? Math.round((checkedInCount / targetCount) * 1000) / 10
    : 0;

  const checkedInList: RecentCheckInItem[] = activeRecords
    .filter(a => a.status === 'checked' && a.checkInTime)
    .sort((a, b) => (b.checkInTimestamp || '').localeCompare(a.checkInTimestamp || ''))
    .slice(0, 4)
    .map(a => ({
      employeeId: a.employeeId,
      name: a.employeeName,
      position: a.position,
      department: a.department,
      checkInTime: a.checkInTime || '',
      avatarInitials: a.avatarInitials || a.employeeName.slice(0, 2),
      method: a.checkInMethod || 'QR Code Kiosk',
    }));

  return {
    targetCount,
    checkedInCount,
    pendingCount,
    leaveCount,
    completionRate,
    departmentStats,
    latestCheckIns: checkedInList,
  };
}

// Generate secure random dynamic QR token
export function generateRandomToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'OAS-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Format Thai date and time
export function getThaiNowString(): { dateStr: string; timeStr: string; fullStr: string } {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${h}:${m}:${s} น.`;

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const dateStr = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
  return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}` };
}

// 1. Initialize Firestore Database: Seeding users, activities & subcollection registrations
export async function initializeFirestoreDatabase(): Promise<void> {
  const now = new Date().toISOString();
  const thaiNow = getThaiNowString();

  try {
    // A. Check or initialize System Settings
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      const initialSetting: SystemSetting = {
        id: SETTINGS_DOC_ID,
        activeRoom: 'ห้องประชุมมณีเทวา',
        availableRooms: ['ห้องประชุมมณีเทวา', 'ห้องประชุมดุสิตา', 'ห้องประชุมสุพรรณิการ์'],
        dynamicQrIntervalSec: 20,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(settingsRef, initialSetting);
    }

    // B. Requirement 2: Seed Users into 'users' collection (/users/{employeeId})
    for (const emp of MASTER_EMPLOYEES) {
      const userDocRef = doc(db, 'users', emp.employeeId);
      const userSnap = await getDoc(userDocRef);
      const userRecord: Employee = {
        ...emp,
        isDeleted: userSnap.exists() ? (userSnap.data().isDeleted ?? false) : false,
        deletedAt: userSnap.exists() ? (userSnap.data().deletedAt ?? null) : null,
        createdAt: userSnap.exists() ? (userSnap.data().createdAt ?? now) : now,
        updatedAt: now,
      };
      await setDoc(userDocRef, userRecord, { merge: true });

      // Also maintain employees collection for compatibility
      const empDocRef = doc(db, 'employees', emp.employeeId);
      await setDoc(empDocRef, userRecord, { merge: true });
    }

    // C. Requirement 3: Seed Activities into 'activities' collection
    for (const act of SEED_ACTIVITIES) {
      const actRef = doc(db, 'activities', act.activityId);
      const actSnap = await getDoc(actRef);

      if (!actSnap.exists()) {
        const initialActivity: Activity = {
          ...act,
          registeredCount: act.registeredCount ?? 0,
          currentDynamicToken: generateRandomToken(),
          tokenExpiresAt: new Date(Date.now() + 20000).toISOString(),
          isDeleted: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(actRef, initialActivity);
      }
    }

    // D. Requirement 5 & 6: Seed Default Activity Subcollection registrations & attendances
    let registeredCountCalc = 0;
    for (const emp of MASTER_EMPLOYEES) {
      const regRef = doc(db, 'activities', DEFAULT_ACTIVITY_ID, 'registrations', emp.employeeId);
      const regSnap = await getDoc(regRef);

      const init = INITIAL_ATTENDANCE_STATE[emp.employeeId] || {
        status: 'pending',
        checkInTime: null,
        checkInMethod: null,
      };

      const isRegistered = init.status === 'checked' || init.status === 'leave' || emp.orderNo <= 23;
      if (isRegistered) registeredCountCalc++;

      const regRecord: AttendanceRecord = {
        employeeId: emp.employeeId,
        activityId: DEFAULT_ACTIVITY_ID,
        status: init.status as AttendanceStatus,
        orderNo: emp.orderNo,
        employeeName: emp.name,
        position: emp.position,
        department: emp.department,
        departmentId: emp.departmentId,
        affiliationCode: emp.affiliationCode,
        unit: emp.unit,
        permission: emp.permission,
        statusRole: emp.statusRole,
        accountStatus: emp.accountStatus,
        systemRole: emp.systemRole,
        email: emp.email,
        avatarInitials: emp.avatarInitials,
        registeredAt: isRegistered ? `${thaiNow.dateStr} 08:15 น.` : undefined,
        registeredTimestamp: isRegistered ? now : undefined,
        checkInTime: init.checkInTime,
        checkInTimestamp: init.checkInTime ? now : null,
        checkInMethod: init.checkInMethod,
        verifiedBy: init.verifiedBy || (init.checkInMethod === 'ผู้ดูแลระบบ (HR Host)' ? 'นางสาววรรณภา สีดาพล (HR OAS KKU)' : null),
        remarks: init.remarks || null,
        isDeleted: false,
        deletedAt: null,
        createdAt: regSnap.exists() ? (regSnap.data().createdAt ?? now) : now,
        updatedAt: now,
      };

      await setDoc(regRef, regRecord, { merge: true });

      // Also sync attendances subcollection
      const attRef = doc(db, 'activities', DEFAULT_ACTIVITY_ID, 'attendances', emp.employeeId);
      await setDoc(attRef, regRecord, { merge: true });
    }

    // Refresh parent activity with denormalized aggregate counts and registeredCount
    const allAttsSnap = await getDocs(collection(db, 'activities', DEFAULT_ACTIVITY_ID, 'registrations'));
    const allAttsList: AttendanceRecord[] = [];
    allAttsSnap.forEach(d => allAttsList.push(d.data() as AttendanceRecord));
    const stats = computeActivityStats(allAttsList);

    const parentActRef = doc(db, 'activities', DEFAULT_ACTIVITY_ID);
    await updateDoc(parentActRef, {
      registeredCount: registeredCountCalc,
      checkedInCount: stats.checkedInCount,
      pendingCount: stats.pendingCount,
      leaveCount: stats.leaveCount,
      completionRate: stats.completionRate,
      departmentStats: stats.departmentStats,
      latestCheckIns: stats.latestCheckIns,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
  }
}

// 2. Read Users: Subscribe to 'users' collection
export function subscribeToUsers(callback: (users: Employee[]) => void) {
  const path = 'users';
  const usersColRef = collection(db, 'users');
  const q = query(usersColRef, orderBy('orderNo', 'asc'));

  return onSnapshot(
    q,
    snapshot => {
      const list: Employee[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Employee);
      });
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// 2. Read Single User from 'users' collection
export async function getUserFromUsers(employeeId: string): Promise<Employee | null> {
  const path = `users/${employeeId}`;
  try {
    const userRef = doc(db, 'users', employeeId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as Employee;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Read User by Email from 'users' collection
export async function getUserByEmail(email: string): Promise<Employee | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const d of usersSnap.docs) {
      const data = d.data() as Employee;
      if (data.email && data.email.toLowerCase().trim() === cleanEmail) {
        return data;
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

// 3. Subscribe to all Activities from 'activities'
export function subscribeToActivities(callback: (activities: Activity[]) => void) {
  const path = 'activities';
  const actColRef = collection(db, 'activities');

  return onSnapshot(
    actColRef,
    snapshot => {
      const list: Activity[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Activity);
      });
      // Sort active first, then date
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// 4. Subscribe to a Single Activity Document
export function subscribeToActivity(activityId: string, callback: (activity: Activity | null) => void) {
  const path = `activities/${activityId}`;
  const actRef = doc(db, 'activities', activityId);

  return onSnapshot(
    actRef,
    snapshot => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Activity);
      } else {
        callback(null);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// 5 & 6. Subscribe to Registrations Subcollection: /activities/{activityId}/registrations
export function subscribeToRegistrations(activityId: string, callback: (registrations: AttendanceRecord[]) => void) {
  const path = `activities/${activityId}/registrations`;
  const regColRef = collection(db, 'activities', activityId, 'registrations');
  const q = query(regColRef, orderBy('orderNo', 'asc'));

  return onSnapshot(
    q,
    snapshot => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as AttendanceRecord);
      });
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Backward compatibility alias for attendances
export const subscribeToAttendances = subscribeToRegistrations;
export const subscribeToEmployees = subscribeToUsers;

// 5, 6 & 7: Register employee for an activity:
// - Create document in activities/{activityId}/registrations/{employeeId}
// - Prevent duplicate registration with employeeId
// - Update registeredCount atomically
export async function registerEmployeeForActivity(
  activityId: string,
  employeeId: string,
  method: string = 'Web Portal Registration'
): Promise<{ success: boolean; message: string; registration?: AttendanceRecord }> {
  const path = `activities/${activityId}/registrations/${employeeId}`;
  const now = new Date().toISOString();
  const thaiNow = getThaiNowString();

  try {
    const regRef = doc(db, 'activities', activityId, 'registrations', employeeId);
    const actRef = doc(db, 'activities', activityId);

    // Run in a Firestore Transaction to guarantee atomicity and prevent race duplicates
    const result = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);

      // Requirement 6: Check for duplicate registration
      if (regSnap.exists()) {
        const existingData = regSnap.data() as AttendanceRecord;
        if (existingData.status === 'registered' || existingData.status === 'checked') {
          throw new Error(`บุคลากร ${employeeId} (${existingData.employeeName}) ได้ลงทะเบียนกิจกรรมนี้แล้ว (ป้องกันการลงทะเบียนซ้ำ)`);
        }
      }

      // Read user data from 'users' collection (Requirement 2)
      const userRef = doc(db, 'users', employeeId);
      const userSnap = await transaction.get(userRef);

      let empData: Employee;
      if (userSnap.exists()) {
        empData = userSnap.data() as Employee;
      } else {
        const found = MASTER_EMPLOYEES.find(e => e.employeeId === employeeId);
        if (!found) {
          throw new Error(`ไม่พบข้อมูลบุคลากรรหัส ${employeeId} ในฐานข้อมูล users`);
        }
        empData = {
          ...found,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };
      }

      // Requirement 5: Create Registration Document in activities/{activityId}/registrations/{employeeId}
      const newRegistration: AttendanceRecord = {
        employeeId: empData.employeeId,
        activityId,
        status: 'registered',
        orderNo: empData.orderNo || 99,
        employeeName: empData.name,
        position: empData.position,
        department: empData.department,
        departmentId: empData.departmentId,
        affiliationCode: empData.affiliationCode,
        unit: empData.unit,
        permission: empData.permission,
        statusRole: empData.statusRole,
        accountStatus: empData.accountStatus,
        systemRole: empData.systemRole,
        email: empData.email,
        avatarInitials: empData.avatarInitials,
        registeredAt: thaiNow.fullStr,
        registeredTimestamp: now,
        checkInTime: null,
        checkInTimestamp: null,
        checkInMethod: method,
        verifiedBy: null,
        remarks: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(regRef, newRegistration);

      // Also sync attendances subcollection
      const attRef = doc(db, 'activities', activityId, 'attendances', employeeId);
      transaction.set(attRef, newRegistration);

      // Requirement 7: Update registeredCount atomically
      transaction.update(actRef, {
        registeredCount: increment(1),
        updatedAt: now,
      });

      return newRegistration;
    });

    return {
      success: true,
      message: `ลงทะเบียนเข้าร่วมกิจกรรมสำเร็จ (${result.employeeName})`,
      registration: result,
    };
  } catch (error: any) {
    console.error('Registration failed:', error);
    return {
      success: false,
      message: error?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
    };
  }
}

// 8. Get Registered Activities for a Specific Employee (My Activities)
export async function getEmployeeRegisteredActivities(employeeId: string): Promise<{
  activity: Activity;
  registration: AttendanceRecord;
}[]> {
  try {
    const actSnap = await getDocs(collection(db, 'activities'));
    const results: { activity: Activity; registration: AttendanceRecord }[] = [];

    for (const actDoc of actSnap.docs) {
      const act = actDoc.data() as Activity;
      const regDocRef = doc(db, 'activities', act.activityId, 'registrations', employeeId);
      const regSnap = await getDoc(regDocRef);

      if (regSnap.exists()) {
        const reg = regSnap.data() as AttendanceRecord;
        if (!reg.isDeleted && (reg.status === 'registered' || reg.status === 'checked' || reg.status === 'leave')) {
          results.push({
            activity: act,
            registration: reg,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching employee activities:', error);
    return [];
  }
}

// Subscribe to Settings
export function subscribeToSettings(callback: (setting: SystemSetting | null) => void) {
  const path = `settings/${SETTINGS_DOC_ID}`;
  const settingRef = doc(db, 'settings', SETTINGS_DOC_ID);

  return onSnapshot(
    settingRef,
    snapshot => {
      if (snapshot.exists()) {
        callback(snapshot.data() as SystemSetting);
      } else {
        callback(null);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Check-in Employee: Updates the subcollection document & recalcs denormalized summary
export async function checkInEmployee(
  activityId: string,
  employeeId: string,
  method: string = 'QR Code Kiosk',
  verifiedBy: string = 'ระบบสแกนตนเอง OAS Kiosk'
): Promise<void> {
  const path = `activities/${activityId}/registrations/${employeeId}`;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} น.`;
  const isoTime = now.toISOString();

  try {
    const regRef = doc(db, 'activities', activityId, 'registrations', employeeId);
    const attRef = doc(db, 'activities', activityId, 'attendances', employeeId);

    const updatePayload = {
      status: 'checked',
      checkInTime: timeStr,
      checkInTimestamp: isoTime,
      checkInMethod: method,
      verifiedBy,
      updatedAt: isoTime,
    };

    await updateDoc(regRef, updatePayload).catch(() => setDoc(regRef, updatePayload, { merge: true }));
    await updateDoc(attRef, updatePayload).catch(() => setDoc(attRef, updatePayload, { merge: true }));

    // Read updated attendances to sync parent Activity denormalized metrics without SQL JOIN
    const attSnap = await getDocs(collection(db, 'activities', activityId, 'registrations'));
    const allAtts: AttendanceRecord[] = [];
    attSnap.forEach(d => allAtts.push(d.data() as AttendanceRecord));

    const updatedStats = computeActivityStats(allAtts);

    const actRef = doc(db, 'activities', activityId);
    await updateDoc(actRef, {
      checkedInCount: updatedStats.checkedInCount,
      pendingCount: updatedStats.pendingCount,
      leaveCount: updatedStats.leaveCount,
      completionRate: updatedStats.completionRate,
      departmentStats: updatedStats.departmentStats,
      latestCheckIns: updatedStats.latestCheckIns,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Manual HR Check-in
export async function manualHRCheckIn(
  activityId: string,
  employeeId: string,
  hrName: string = 'นางสาววรรณภา สีดาพล (HR OAS KKU)'
): Promise<void> {
  return checkInEmployee(activityId, employeeId, 'HR Manual Check-in', hrName);
}

// Mark Leave for an employee
export async function markEmployeeLeave(
  activityId: string,
  employeeId: string,
  remarks: string = 'แจ้งลาอบรมราชการ'
): Promise<void> {
  const path = `activities/${activityId}/registrations/${employeeId}`;
  const isoTime = new Date().toISOString();

  try {
    const regRef = doc(db, 'activities', activityId, 'registrations', employeeId);
    const attRef = doc(db, 'activities', activityId, 'attendances', employeeId);

    const updatePayload = {
      status: 'leave',
      checkInTime: 'ได้รับอนุมัติลา',
      checkInTimestamp: isoTime,
      checkInMethod: 'ระบบลาราชการ มข.',
      verifiedBy: 'ระบบลาราชการ มข.',
      remarks,
      updatedAt: isoTime,
    };

    await updateDoc(regRef, updatePayload);
    await updateDoc(attRef, updatePayload);

    // Refresh denormalized parent aggregates
    const attSnap = await getDocs(collection(db, 'activities', activityId, 'registrations'));
    const allAtts: AttendanceRecord[] = [];
    attSnap.forEach(d => allAtts.push(d.data() as AttendanceRecord));
    const updatedStats = computeActivityStats(allAtts);

    const actRef = doc(db, 'activities', activityId);
    await updateDoc(actRef, {
      checkedInCount: updatedStats.checkedInCount,
      pendingCount: updatedStats.pendingCount,
      leaveCount: updatedStats.leaveCount,
      completionRate: updatedStats.completionRate,
      departmentStats: updatedStats.departmentStats,
      latestCheckIns: updatedStats.latestCheckIns,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Reset employee attendance status to pending
export async function resetEmployeeAttendance(activityId: string, employeeId: string): Promise<void> {
  const path = `activities/${activityId}/registrations/${employeeId}`;
  const isoTime = new Date().toISOString();

  try {
    const regRef = doc(db, 'activities', activityId, 'registrations', employeeId);
    const attRef = doc(db, 'activities', activityId, 'attendances', employeeId);

    const updatePayload = {
      status: 'pending',
      checkInTime: null,
      checkInTimestamp: null,
      checkInMethod: null,
      verifiedBy: null,
      remarks: null,
      updatedAt: isoTime,
    };

    await updateDoc(regRef, updatePayload);
    await updateDoc(attRef, updatePayload);

    const attSnap = await getDocs(collection(db, 'activities', activityId, 'registrations'));
    const allAtts: AttendanceRecord[] = [];
    attSnap.forEach(d => allAtts.push(d.data() as AttendanceRecord));
    const updatedStats = computeActivityStats(allAtts);

    const actRef = doc(db, 'activities', activityId);
    await updateDoc(actRef, {
      checkedInCount: updatedStats.checkedInCount,
      pendingCount: updatedStats.pendingCount,
      leaveCount: updatedStats.leaveCount,
      completionRate: updatedStats.completionRate,
      departmentStats: updatedStats.departmentStats,
      latestCheckIns: updatedStats.latestCheckIns,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Refresh Dynamic Security Token
export async function refreshDynamicToken(activityId: string): Promise<string> {
  const path = `activities/${activityId}`;
  const newToken = generateRandomToken();
  const isoTime = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 20000).toISOString();

  try {
    const actRef = doc(db, 'activities', activityId);
    await updateDoc(actRef, {
      currentDynamicToken: newToken,
      tokenExpiresAt: expiresAt,
      updatedAt: isoTime,
    });
    return newToken;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Switch active room
export async function updateActiveRoom(activityId: string, roomName: string): Promise<void> {
  const isoTime = new Date().toISOString();
  try {
    const actRef = doc(db, 'activities', activityId);
    await updateDoc(actRef, {
      room: roomName,
      updatedAt: isoTime,
    });

    const setRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await updateDoc(setRef, {
      activeRoom: roomName,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `activities/${activityId}`);
  }
}

// Soft Delete Employee in 'users' and 'employees'
export async function softDeleteEmployee(employeeId: string): Promise<void> {
  const path = `users/${employeeId}`;
  const isoTime = new Date().toISOString();

  try {
    const userRef = doc(db, 'users', employeeId);
    await updateDoc(userRef, {
      isDeleted: true,
      deletedAt: isoTime,
      updatedAt: isoTime,
    });

    const empRef = doc(db, 'employees', employeeId);
    await updateDoc(empRef, {
      isDeleted: true,
      deletedAt: isoTime,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Restore Soft Deleted Employee
export async function restoreEmployee(employeeId: string): Promise<void> {
  const path = `users/${employeeId}`;
  const isoTime = new Date().toISOString();

  try {
    const userRef = doc(db, 'users', employeeId);
    await updateDoc(userRef, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: isoTime,
    });

    const empRef = doc(db, 'employees', employeeId);
    await updateDoc(empRef, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: isoTime,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
