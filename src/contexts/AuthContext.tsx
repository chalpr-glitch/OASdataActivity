import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, loginWithGoogle, logoutUser, onAuthStateChanged, User } from '../lib/firebase';
import { Employee } from '../types/attendance';

export interface AuthContextType {
  user: User | null;
  ssoEmail: string | null;
  matchedEmployee: Employee | null;
  isLoading: boolean;
  isAdmin: boolean;
  isHR: boolean;
  loginGoogle: () => Promise<void>;
  loginSSO: (email: string) => void;
  logout: () => Promise<void>;
  activeEmail: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  employees: Employee[];
  onShowToast: (msg: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  employees,
  onShowToast,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [ssoEmail, setSsoEmail] = useState<string | null>(() => {
    // Default to user email chalpr@kku.ac.th or saved session
    return localStorage.getItem('oas_kku_sso_email') || 'chalpr@kku.ac.th';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
      if (firebaseUser?.email) {
        setSsoEmail(firebaseUser.email);
        localStorage.setItem('oas_kku_sso_email', firebaseUser.email);
      }
    });
    return () => unsubscribe();
  }, []);

  const activeEmail = (user?.email || ssoEmail || '').toLowerCase().trim();

  // Link to database employee by matching email
  const matchedEmployee = employees.find(
    (emp) => emp.email && emp.email.toLowerCase().trim() === activeEmail
  ) || null;

  // Role checks
  const isAdmin = Boolean(
    activeEmail === 'chalpr@kku.ac.th' ||
    matchedEmployee?.permission?.toLowerCase().includes('admin') ||
    matchedEmployee?.systemRole?.toLowerCase().includes('admin') ||
    matchedEmployee?.permission?.includes('ผู้อนุมัติ')
  );

  const isHR = Boolean(
    matchedEmployee?.permission?.includes('HR') ||
    matchedEmployee?.systemRole?.includes('HR') ||
    activeEmail === 'wannse@kku.ac.th' ||
    isAdmin
  );

  const loginGoogle = async () => {
    try {
      const res = await loginWithGoogle();
      const email = res.user?.email || '';
      setUser(res.user);
      setSsoEmail(email);
      localStorage.setItem('oas_kku_sso_email', email);
      onShowToast(`เข้าสู่ระบบด้วย Google (${email}) สำเร็จ`);
    } catch (err: any) {
      console.warn('Google sign-in popup error/fallback:', err);
      // If popup is blocked by browser/iframe, give helpful toast
      onShowToast('ไม่สามารถเปิดหน้าต่าง Google Popup ได้ กรุณาใช้ระบบ KKU SSO ด้านล่าง');
    }
  };

  const loginSSO = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setSsoEmail(cleanEmail);
    localStorage.setItem('oas_kku_sso_email', cleanEmail);
    const emp = employees.find(e => e.email.toLowerCase().trim() === cleanEmail);
    if (emp) {
      onShowToast(`ยืนยันตัวตน KKU SSO: ${emp.name} (${emp.employeeId}) สำเร็จ`);
    } else {
      onShowToast(`เข้าสู่ระบบ KKU SSO: ${cleanEmail}`);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser(null);
    setSsoEmail(null);
    localStorage.removeItem('oas_kku_sso_email');
    onShowToast('ออกจากระบบเรียบร้อย');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ssoEmail,
        matchedEmployee,
        isLoading,
        isAdmin,
        isHR,
        loginGoogle,
        loginSSO,
        logout,
        activeEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
