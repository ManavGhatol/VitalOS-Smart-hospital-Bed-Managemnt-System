import React, { useState } from 'react';
import { Stethoscope, ArrowLeft, Lock, Mail, AlertCircle, CheckCircle2, Shield, Hospital, User, Building } from 'lucide-react';
import { doctorLogin, doctorRegister } from '../services/api';
import type { DoctorUser } from '../types';

interface DoctorAuthProps {
  onSuccess: (doctor: DoctorUser) => void;
  onNavigateHome: () => void;
}

export const DoctorAuth: React.FC<DoctorAuthProps> = ({ onSuccess, onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('sarah.jenkins@hospital.org');
  const [loginPassword, setLoginPassword] = useState<string>('PulseDoctor#2026');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Register form state
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regLicense, setRegLicense] = useState<string>('MD-');
  const [regHospital, setRegHospital] = useState<string>('Vitalis OS Central Hospital');
  const [regDepartment, setRegDepartment] = useState<string>('Emergency & Critical Care');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  // Calculate password strength
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-blue-500' };
    return { score: 4, label: 'Secure', color: 'bg-emerald-500' };
  };

  const passStrength = calculatePasswordStrength(regPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const data = await doctorLogin({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      onSuccess(data.doctor);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!agreedTerms) {
      setErrorMessage('Please accept the Terms & Conditions and HIPAA compliance acknowledgment.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await doctorRegister({
        name: regName.trim(),
        email: regEmail.trim(),
        licenseNumber: regLicense.trim(),
        hospitalName: regHospital.trim(),
        department: regDepartment,
        password: regPassword,
      });
      setSuccessMessage('Registration successful! You can now log in with your credentials.');
      setLoginEmail(data.doctor.email);
      setLoginPassword(regPassword);
      setTimeout(() => {
        setActiveTab('login');
        setSuccessMessage('Account registered and ready. Click Login below.');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (email: string, name: string) => {
    setLoginEmail(email);
    setLoginPassword('PulseDoctor#2026');
    setErrorMessage('');
    setSuccessMessage(`Loaded demo credentials for ${name}`);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        {/* Navigation Return */}
        <button
          id="doctor-auth-back-btn"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-xs">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Physician Portal</h2>
            <p className="text-xs text-slate-500 mt-1">Verified Medical Staff Authentication & Emergency Access</p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold">
            <button
              id="doctor-tab-login"
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'login' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctor Login
            </button>
            <button
              id="doctor-tab-register"
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Physician Registration
            </button>
          </div>

          {/* Feedback banners */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab 1: Login Form */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="login-email">
                  Hospital Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('For demo purposes, use sarah.jenkins@hospital.org or michael.marcus@hospital.org with password PulseDoctor#2026')}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                id="doctor-login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Log in to Clinical Portal</span>
                )}
              </button>

              {/* Demo Account Quick Pickers */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wider text-center">
                  Quick Demo Accounts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('sarah.jenkins@hospital.org', 'Dr. Sarah Jenkins')}
                    className="text-[11px] font-medium p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100 text-blue-700 border border-blue-200/60 text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold">Dr. Sarah Jenkins</p>
                    <p className="text-[10px] text-slate-500">Trauma & ICU</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('michael.marcus@hospital.org', 'Dr. Michael Marcus')}
                    className="text-[11px] font-medium p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold">Dr. Michael Marcus</p>
                    <p className="text-[10px] text-slate-500">Cardiology</p>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab 2: Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-name">
                  Full Name (with credentials)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Dr. Alexander Vance, MD"
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="reg-license">
                    Medical License Number
                  </label>
                  <span className="text-[10px] text-slate-500">Format: MD-#####-STATE</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-license"
                    type="text"
                    required
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="MD-84920-CA"
                    className="w-full pl-9 pr-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-hospital">
                    Hospital / Clinic Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Hospital className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="reg-hospital"
                      type="text"
                      required
                      value={regHospital}
                      onChange={(e) => setRegHospital(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-department">
                    Specialty Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <select
                      id="reg-department"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    >
                      <option value="Emergency & Critical Care">Emergency & Critical Care</option>
                      <option value="Cardiology & Intensive Care">Cardiology & Intensive Care</option>
                      <option value="Pulmonology & Trauma">Pulmonology & Trauma</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-email">
                  Medical Staff Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="doctor.name@hospital.org"
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="reg-password">
                    Password
                  </label>
                  {regPassword && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      Strength: <span className="font-bold text-slate-700">{passStrength.label}</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                {/* Visual password strength bar */}
                {regPassword && (
                  <div className="grid grid-cols-4 gap-1 mt-1.5 h-1">
                    <div className={`rounded-full h-1 ${passStrength.score >= 1 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`rounded-full h-1 ${passStrength.score >= 2 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`rounded-full h-1 ${passStrength.score >= 3 ? passStrength.color : 'bg-slate-200'}`} />
                    <div className={`rounded-full h-1 ${passStrength.score >= 4 ? passStrength.color : 'bg-slate-200'}`} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-confirm-password">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I confirm that I am a licensed medical practitioner and agree to Vitalis OS Terms & HIPAA Data Protection rules.
                  </span>
                </label>
              </div>

              <button
                id="doctor-register-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Medical License...</span>
                  </>
                ) : (
                  <span>Complete Physician Registration</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
