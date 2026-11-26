import React, { useState, useEffect } from 'react';
import { useAppStore, normalizeEmail, normalizePhone } from '../../store/useAppStore';
import { Role } from '../../contracts';
import { hashPassword, generateTemporaryPassword } from '../../lib/crypto';
import { useRouter } from '../../lib/router';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  KeyRound,
  RotateCcw,
  Copy,
  ExternalLink
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { 
    login, 
    registerUser, 
    resetPassword, 
    forgotPassword, 
    validateResetToken, 
    resetPasswordWithToken, 
    users, 
    language, 
    setLanguage 
  } = useAppStore();

  const { route, navigate } = useRouter();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET_REQUIRED' | 'RESET_LINK'>('LOGIN');
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>('STAFF');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Reset Password Form (First login or forgot password)
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // Forgot Password Form & Unique Reset Link
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetLinkGenerated, setResetLinkGenerated] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // URL Reset Token state
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);
  const [tokenUserEmail, setTokenUserEmail] = useState<string | null>(null);

  // Automatically detect and validate resetToken in URL query params or route hash
  useEffect(() => {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      token = params.get('resetToken') || params.get('token');
    }

    if (!token && route.view === 'auth' && route.subView === 'reset') {
      token = route.queryParams.resetToken || route.queryParams.token || route.paramId;
    }

    if (token) {
      const validation = validateResetToken(token);
      if (validation.valid && validation.user) {
        setTokenFromUrl(token);
        setTokenUserEmail(validation.user.email);
        setResetUserId(validation.user.id);
        setMode('RESET_LINK');
        setResetError(null);
        return;
      } else {
        setForgotError(
          language === 'TE'
            ? 'ఈ పాస్‌వర్డ్ రీసెట్ లింక్ చెల్లదు లేదా గడువు ముగిసింది. దయచేసి కొత్త లింక్‌ను అభ్యర్థించండి.'
            : (validation.error || 'This password reset link is invalid or has expired. Please request a new one.')
        );
        setMode('FORGOT');
        return;
      }
    }

    // Synchronize route subView with form mode
    if (route.view === 'auth') {
      if (route.subView === 'register') {
        setMode('REGISTER');
      } else if (route.subView === 'forgot') {
        setMode('FORGOT');
      } else if (route.subView === 'login') {
        setMode('LOGIN');
      }
    }
  }, [route.view, route.subView, route.paramId, route.queryParams, users, language]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = await login(loginEmail, loginPassword);
    
    if (result.mustResetPassword && result.user) {
      setResetUserId(result.user.id);
      setMode('RESET_REQUIRED');
      return;
    }

    if (!result.success) {
      setLoginError(result.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const cleanRegEmail = normalizeEmail(regEmail);
    const cleanRegPhone = normalizePhone(regPhone);

    if (!regName.trim() || regName.length < 2) {
      setRegError(language === 'TE' ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.' : 'Please provide your full name (minimum 2 characters).');
      return;
    }
    if (!cleanRegEmail.includes('@') || (!cleanRegEmail.includes('.') && !cleanRegEmail.endsWith('@gmail.com'))) {
      setRegError(language === 'TE' ? 'దయచేసి సరైన ఇమెయిల్ చిరునామాను నమోదు చేయండి.' : 'Please enter a valid email address.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanRegPhone)) {
      setRegError(language === 'TE' ? 'మొబైల్ నంబరులో 10 అంకెలు ఉండాలి. దయచేసి ధృవీకరించండి.' : 'Mobile number should have 10 digits. Please verify.');
      return;
    }

    // 1. Check if email already exists
    const existingEmail = users.find(
      (u) =>
        normalizeEmail(u.email) === cleanRegEmail ||
        ((cleanRegEmail === 'dev.snehit@gmail.com' || cleanRegEmail === 'dev.snehit@gmail') &&
          (normalizeEmail(u.email) === 'dev.snehit@gmail.com' || normalizeEmail(u.email) === 'dev.snehit@gmail'))
    );
    if (existingEmail) {
      if (existingEmail.status === 'APPROVED') {
        setRegError(
          language === 'TE'
            ? 'ఈ ఇమెయిల్‌తో ఖాతా ఇప్పటికే నమోదై ఉంది. దయచేసి ధృవీకరించండి లేదా లాగిన్ అవ్వండి.'
            : 'An account with this email address already exists. Please verify your details or sign in.'
        );
      } else {
        setRegError(
          language === 'TE'
            ? 'ఈ ఇమెయిల్‌తో రిజిస్ట్రేషన్ అభ్యర్థన ఇప్పటికే సమీక్షలో ఉంది.'
            : 'An access request for this email address is already pending review.'
        );
      }
      return;
    }

    // 2. Check if mobile number already exists
    const existingPhone = users.find(
      (u) => normalizePhone(u.phone) === cleanRegPhone
    );
    if (existingPhone) {
      if (existingPhone.status === 'APPROVED') {
        setRegError(
          language === 'TE'
            ? 'ఈ మొబైల్ నంబరుతో ఖాతా ఇప్పటికే నమోదై ఉంది. దయచేసి ధృవీకరించండి లేదా లాగిన్ అవ్వండి.'
            : 'An account with this mobile number already exists. Please verify your details or sign in.'
        );
      } else {
        setRegError(
          language === 'TE'
            ? 'ఈ మొబైల్ నంబరుతో రిజిస్ట్రేషన్ అభ్యర్థన ఇప్పటికే సమీక్షలో ఉంది.'
            : 'An access request for this mobile number is already pending review.'
        );
      }
      return;
    }

    // Generate secure temporary password & hash it
    const tempPassword = generateTemporaryPassword();
    const tempHash = await hashPassword(tempPassword);

    const newUser = {
      id: crypto.randomUUID(),
      name: regName.trim(),
      email: cleanRegEmail,
      phone: cleanRegPhone,
      role: regRole,
      status: 'PENDING_APPROVAL' as const,
      password: tempPassword,
      passwordHash: tempHash,
      mustResetPassword: true,
      createdAt: new Date().toISOString(),
    };

    const regResult = registerUser(newUser, tempPassword);
    if (!regResult.success) {
      setRegError(regResult.message);
      return;
    }

    setRegSuccess(
      language === 'TE'
        ? `నమోదు పూర్తయింది! తాత్కాలిక పాస్‌వర్డ్ మీ ఇమెయిల్‌కు పంపబడింది. మొదటి లాగిన్‌లో పాస్‌వర్డ్ మార్చుకోవాల్సి ఉంటుంది.`
        : `Registration submitted! A temporary sign-in password has been sent to ${cleanRegEmail}. You will be prompted to choose a permanent password on first sign-in.`
    );
    setRegName('');
    setRegEmail('');
    setRegPhone('');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 4) {
      setResetError(language === 'TE' ? 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.' : 'Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError(language === 'TE' ? 'పాస్‌వర్డ్‌లు సరిపోలలేదు.' : 'Passwords do not match. Please verify.');
      return;
    }

    if (!resetUserId) {
      setResetError('User session expired. Please sign in again.');
      setMode('LOGIN');
      return;
    }

    const res = await resetPassword(resetUserId, newPassword);
    if (!res.success) {
      setResetError(res.message);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setResetLinkGenerated(null);

    const res = await forgotPassword(forgotEmail);
    if (res.success) {
      setForgotSuccess(
        language === 'TE'
          ? `పాస్‌వర్డ్ రీసెట్ లింక్ ${forgotEmail} కు పంపబడింది! దయచేసి మీ ఇన్‌బాక్స్ తనిఖీ చేసి లింక్‌పై క్లిక్ చేయండి.`
          : `A unique password reset link has been dispatched to ${forgotEmail}. Please check your email inbox and click the link to reset your password.`
      );
      if (res.resetLink) {
        setResetLinkGenerated(res.resetLink);
      }
      setForgotEmail('');
    } else {
      setForgotError(res.message);
    }
  };

  const handleResetWithTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 4) {
      setResetError(language === 'TE' ? 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.' : 'Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError(language === 'TE' ? 'పాస్‌వర్డ్‌లు సరిపోలలేదు.' : 'Passwords do not match. Please verify.');
      return;
    }

    if (!tokenFromUrl) {
      setResetError('Reset token is missing or has expired. Please request a new one.');
      setMode('LOGIN');
      return;
    }

    const res = await resetPasswordWithToken(tokenFromUrl, newPassword);
    if (!res.success) {
      setResetError(res.message);
      return;
    }

    // Clean up resetToken from query string without page reload
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center bg-white shadow-sm border border-slate-200/80 rounded-full p-1">
        <button
          onClick={() => setLanguage('EN')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            language === 'EN'
              ? 'bg-[#FF5A36] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('TE')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            language === 'TE'
              ? 'bg-[#FF5A36] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          తెలుగు
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] text-white shadow-lg shadow-orange-500/25 mb-3.5">
            <span className="text-3xl font-black">🌾</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Katha Wholesale
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {language === 'TE' 
              ? 'రైస్ & గ్రాసరీస్ హోల్‌సేల్ ప్లాట్‌ఫారమ్'
              : 'Enterprise Rice & Groceries Wholesale Platform'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-6 sm:p-8">
          
          {/* Top Mode Tabs (Visible for LOGIN and REGISTER) */}
          {(mode === 'LOGIN' || mode === 'REGISTER') && (
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setLoginError(null);
                  setRegSuccess(null);
                  navigate('/login');
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'TE' ? 'లాగిన్ అవ్వండి' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setLoginError(null);
                  setRegSuccess(null);
                  navigate('/register');
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'TE' ? 'రిజిస్టర్ అవ్వండి' : 'Request Access'}
              </button>
            </div>
          )}

          {/* Mode: LOGIN */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'ఇమెయిల్ చిరునామా' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'TE' ? 'పాస్‌వర్డ్' : 'Password / Passcode'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT');
                      setForgotSuccess(null);
                      setForgotError(null);
                      navigate('/forgot-password');
                    }}
                    className="text-[11px] font-semibold text-[#FF5A36] hover:underline"
                  >
                    {language === 'TE' ? 'పాస్‌వర్డ్ మర్చిపోయారా?' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{language === 'TE' ? 'లాగిన్ అవ్వండి' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Mode: REGISTER */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {regSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {regError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'పూర్తి పేరు' : 'Full Name'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'ఇమెయిల్' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'మొబైల్ నంబర్ (10 అంకెలు)' : 'Mobile Number (10 Digits)'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'కోరుకున్న పాత్ర' : 'Requested Role'}
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as Role)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] transition-all"
                >
                  <option value="STAFF">{language === 'TE' ? 'గోడౌన్ / కౌంటర్ సిబ్బంది' : 'Warehouse / Counter Staff'}</option>
                  <option value="OWNER">{language === 'TE' ? 'భాగస్వామి / వ్యాపార యజమాని' : 'Partner / Business Owner'}</option>
                  <option value="CUSTOMER">{language === 'TE' ? 'కస్టమర్ ప్రతినిధి' : 'Customer Representative'}</option>
                  <option value="ADMIN">{language === 'TE' ? 'అడ్మినిస్ట్రేటర్' : 'Administrator'}</option>
                </select>
              </div>

              {/* Security & Temporary Password Notice */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {language === 'TE'
                    ? 'సురక్షిత తాత్కాలిక పాస్‌వర్డ్ మీ ఇమెయిల్‌కు పంపబడుతుంది. మొదటి లాగిన్‌లో పాస్‌వర్డ్ సెట్ చేసుకోవాలి.'
                    : 'A secure temporary sign-in password will be emailed to your address. You will set a permanent password upon first login.'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === 'TE' ? 'యాక్సెస్ అభ్యర్థించండి' : 'Submit Access Request'}</span>
              </button>
            </form>
          )}

          {/* Mode: RESET_REQUIRED (First Login Mandatory Password Reset) */}
          {mode === 'RESET_REQUIRED' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-bold">
                    {language === 'TE' ? 'మొదటి లాగిన్ భద్రతా సెటప్:' : 'First Login Security Requirement:'}
                  </span>{' '}
                  {language === 'TE'
                    ? 'మీ ఖాతా భద్రత కోసం కొత్త శాశ్వత పాస్‌వర్డ్‌ను సెట్ చేసుకోండి.'
                    : 'Temporary password verified. Please choose your permanent account password.'}
                </div>
              </div>

              {resetError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{resetError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'కొత్త శాశ్వత పాస్‌వర్డ్' : 'New Permanent Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'పాస్‌వర్డ్‌ను నిర్ధారించండి' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'TE' ? 'పాస్‌వర్డ్ భద్రపరచి లాగిన్ అవ్వండి' : 'Save Password & Enter'}</span>
              </button>
            </form>
          )}

          {/* Mode: FORGOT (Forgot Password Request) */}
          {mode === 'FORGOT' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-left mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'TE' ? 'పాస్‌వర్డ్ రీసెట్' : 'Reset Your Password'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'TE'
                    ? 'మీ రిజిస్టర్డ్ ఇమెయిల్‌ను నమోదు చేయండి. ప్రత్యేక పాస్‌వర్డ్ రీసెట్ లింక్ మీ ఇమెయిల్‌కు పంపబడుతుంది.'
                    : 'Enter your registered email address. A unique password reset link will be sent to your inbox.'}
                </p>
              </div>

              {forgotSuccess && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{forgotSuccess}</span>
                  </div>

                  {resetLinkGenerated && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>{language === 'TE' ? 'ప్రత్యక్ష రీసెట్ లింక్ (పరీక్ష / ప్రివ్యూ):' : 'Direct Password Reset Link (Instant Preview):'}</span>
                      </div>
                      <div className="font-mono text-[11px] break-all bg-white p-2.5 rounded-xl border border-amber-200 text-slate-700 select-all shadow-inner">
                        {resetLinkGenerated}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(resetLinkGenerated);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedLink ? (language === 'TE' ? 'కాపీ చేయబడింది!' : 'Copied!') : (language === 'TE' ? 'లింక్ కాపీ చేయండి' : 'Copy Link')}</span>
                        </button>
                        <a
                          href={resetLinkGenerated}
                          className="px-3 py-1.5 text-xs font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/70 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{language === 'TE' ? 'లింక్ తెరవండి' : 'Open Reset Link'}</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {forgotError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{forgotError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'ఇమెయిల్ చిరునామా' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'TE' ? 'రీసెట్ లింక్ పంపండి' : 'Send Reset Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setForgotError(null);
                  setForgotSuccess(null);
                  setResetLinkGenerated(null);
                  navigate('/login');
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 pt-2"
              >
                &larr; {language === 'TE' ? 'లాగిన్‌కు తిరిగి వెళ్ళండి' : 'Back to Sign In'}
              </button>
            </form>
          )}

          {/* Mode: RESET_LINK (Triggered via unique email link ?resetToken=...) */}
          {mode === 'RESET_LINK' && (
            <form onSubmit={handleResetWithTokenSubmit} className="space-y-4">
              <div className="text-left mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-semibold mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{language === 'TE' ? 'ప్రత్యేక రీసెట్ లింక్ ధృవీకరించబడింది' : 'Unique Reset Link Verified'}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'TE' ? 'కొత్త పాస్‌వర్డ్ సెట్ చేయండి' : 'Create New Password'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'TE'
                    ? `${tokenUserEmail || 'మీ'} ఖాతా కోసం కొత్త పాస్‌వర్డ్‌ను నమోదు చేయండి.`
                    : `Set a new secure password for ${tokenUserEmail || 'your account'}.`}
                </p>
              </div>

              {resetError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{resetError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'కొత్త పాస్‌వర్డ్' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'పాస్‌వర్డ్‌ను నిర్ధారించండి' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'TE' ? 'పాస్‌వర్డ్ రీసెట్ చేసి లాగిన్ అవ్వండి' : 'Reset Password & Enter'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                  setMode('LOGIN');
                  setResetError(null);
                  navigate('/login');
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 pt-2"
              >
                &larr; {language === 'TE' ? 'లాగిన్‌కు తిరిగి వెళ్ళండి' : 'Back to Sign In'}
              </button>
            </form>
          )}

        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          {language === 'TE'
            ? 'కథా హోల్‌సేల్ • క్లౌడ్ & మొబైల్ ప్లాట్‌ఫారమ్'
            : 'Katha Wholesale • Cloud & Mobile Platform'}
        </p>
      </div>
    </div>
  );
};
