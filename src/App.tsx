import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Header from './components/Header';
import BreakingTicker from './components/BreakingTicker';
import NewsFeed from './components/NewsFeed';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
            <Header />
            <BreakingTicker />
            <main>
              <Routes>
                <Route path="/" element={<NewsFeed />} />
                <Route path="/admin" element={<AdminDashboard />} />
                {/* Add more routes as needed */}
              </Routes>
            </main>
            
            <footer className="bg-white border-t border-gray-200 py-8 mt-12">
              <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-2xl font-black tracking-tighter text-red-600 italic">
                  הגיזרה
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  © {new Date().getFullYear()} כל הזכויות שמורות למערכת הגיזרה
                </div>
                <nav className="flex items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <a href="#" className="hover:text-red-600 transition-colors">אודות</a>
                  <a href="#" className="hover:text-red-600 transition-colors">תנאי שימוש</a>
                  <a href="#" className="hover:text-red-600 transition-colors">צרו קשר</a>
                </nav>
              </div>
            </footer>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
