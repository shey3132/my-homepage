import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { LogIn, LogOut, User, Settings as SettingsIcon, Menu } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '../contexts/ToastContext';

export default function Header() {
  const { user, isEditor } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      showToast('התחברת בהצלחה', 'success');
    } catch (error) {
      showToast('שגיאה בהתחברות', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      showToast('התנתקת בהצלחה', 'info');
      navigate('/');
    } catch (error) {
      showToast('שגיאה בהתנתקות', 'error');
    }
  };

  return (
    <header className="bg-white border-bottom border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-3xl font-black tracking-tighter text-red-600 italic">
            הגיזרה
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-bold text-gray-600">
            <Link to="/" className="hover:text-red-600 transition-colors">מבזקים</Link>
            <Link to="/politics" className="hover:text-red-600 transition-colors">פוליטיקה</Link>
            <Link to="/security" className="hover:text-red-600 transition-colors">ביטחון</Link>
            <Link to="/economy" className="hover:text-red-600 transition-colors">כלכלה</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isEditor && (
            <Link
              to="/admin"
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-all"
              title="ניהול"
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
          )}
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-gray-900">{user.displayName}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">מחובר</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-all"
                title="התנתק"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-all shadow-md active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              התחבר
            </button>
          )}
          <button className="md:hidden p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
