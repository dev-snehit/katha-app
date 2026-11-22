import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SupportedLanguage, Role } from '../../contracts';
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
  ArrowRight
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, registerUser, users, language, setLanguage } = useAppStore();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Login Form (Zero auto-fill)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>('STAFF');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = login(loginEmail, loginPassword);
    if (!result.success) {
      setLoginError(result.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    let cleanRegEmail = regEmail.trim().toLowerCase();
    if (cleanRegEmail.endsWith('@gmail')) {
      cleanRegEmail += '.com';
    }

    if (!regName.trim() || regName.length < 2) {
      setRegError(language === 'TE' ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.' : 'Please provide your full name (minimum 2 characters).');
      return;
    }
    if (!cleanRegEmail.includes('@') || (!cleanRegEmail.includes('.') && !cleanRegEmail.endsWith('@gmail'))) {
      setRegError(language === 'TE' ? 'దయచేసి సరైన ఇమెయిల్ చిరునామాను నమోదు చేయండి.' : 'Please enter a valid email address.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(regPhone.trim())) {
      setRegError(language === 'TE' ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.' : 'Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).');
      return;
    }
    if (regPassword.length < 4) {
      setRegError(language === 'TE' ? 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.' : 'Password must be at least 4 characters long.');
      return;
    }

    // Check if account already registered
    const existing = users.find(
      (u) =>
        u.email.toLowerCase() === cleanRegEmail ||
        ((cleanRegEmail === 'dev.snehit@gmail.com' || cleanRegEmail === 'dev.snehit@gmail') &&
          (u.email.toLowerCase() === 'dev.snehit@gmail.com' || u.email.toLowerCase() === 'dev.snehit@gmail'))
    );
    if (existing) {
      if (existing.status === 'APPROVED') {
        setRegError(
          language === 'TE'
            ? 'ఈ ఇమెయిల్ ఇప్పటికే నమోదై ఆమోదించబడింది. దయచేసి లాగిన్ అవ్వండి.'
            : 'An account with this email is already registered and approved. Please switch to Sign In.'
        );
      } else {
        setRegError(
          language === 'TE'
            ? 'ఈ ఇమెయిల్‌తో రిజిస్ట్రేషన్ అభ్యర్థన ఇప్పటికే సమీక్షలో ఉంది.'
            : 'An access request for this email is already pending review.'
        );
      }
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: regName.trim(),
      email: cleanRegEmail,
      phone: regPhone.trim(),
      role: regRole,
      status: 'PENDING_APPROVAL' as const,
      password: regPassword.trim(),
      createdAt: new Date().toISOString(),
    };

    registerUser(newUser);
    setRegSuccess(
      language === 'TE'
        ? `నమోదు అభ్యర్థన సమర్పించబడింది! అడ్మినిస్ట్రేటర్ మీ ఖాతాను సమీక్షించి ఆమోదిస్తారు.`
        : `Registration request submitted for ${newUser.name}! An administrator will review and approve your account shortly.`
    );
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
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
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setLoginError(null);
                setRegSuccess(null);
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'TE' ? 'పాస్‌వర్డ్' : 'Password / Passcode'}
                </label>
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
                    onChange={(e) => setRegPhone(e.target.value)}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'పాస్‌వర్డ్ సృష్టించండి' : 'Create Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5A36] transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-[11px] text-blue-800">
                <span className="font-bold">{language === 'TE' ? 'ఆమోదం విధానం:' : 'Approval Policy:'}</span>{' '}
                {language === 'TE'
                  ? 'రిజిస్ట్రేషన్లు సమీక్ష మరియు ధృవీకరణ కోసం అడ్మినిస్ట్రేటర్‌కు పంపబడతాయి.'
                  : 'Registrations are immediately sent to an administrator for role assignment & verification.'}
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
