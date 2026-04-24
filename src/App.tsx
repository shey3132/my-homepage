import React, { useState, useEffect } from "react";
import { Phone, MessageSquare, Settings, Activity, Clock, User, Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CallLog {
  id: string;
  phone: string;
  input: string;
  output: string;
  timestamp: string;
}

export default function App() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "settings">("logs");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt }),
      });
      alert("ההגדרות נשמרו בהצלחה!");
    } catch (e) {
      alert("שגיאה בשמירת ההגדרות");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col gap-4 p-6 overflow-x-hidden" dir="rtl">
      {/* Header - Bento Style */}
      <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            <Phone size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ניהול שלוחת IVR AI</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">System Gateway v4.2</p>
          </div>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button 
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Activity size={14} />
            לוג שיחות
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Settings size={14} />
            הגדרות בינה
          </button>
        </div>

        <div className="hidden md:flex gap-3">
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            שרת פעיל
          </div>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">
        <AnimatePresence mode="wait">
          {activeTab === "logs" ? (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              {/* Quick Config Card */}
              <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <h2 className="font-semibold text-indigo-400 text-sm">הגדרות יסוד (ext.ini)</h2>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">CONFIG</span>
                </div>
                <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-400 flex-grow border border-slate-800/50 leading-relaxed overflow-x-auto">
                  <p><span className="text-indigo-400">type</span>=api</p>
                  <p><span className="text-indigo-400">api_link</span>=https://my-homepage-pi-ashen.vercel.app/api/ivr</p>
                  <p><span className="text-indigo-400">api_url_post</span>=yes</p>
                  <p className="border-t border-slate-800 mt-2 pt-2 text-[10px] text-slate-500"># הגדרת קלט (חינם = record)</p>
                  <p><span className="text-emerald-400">api_000</span>=userInput,yes,voice,he-IL,yes</p>
                </div>
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex-1 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-center font-bold">API ENABLED</div>
                  <div className="flex-1 py-3 bg-slate-800 text-slate-500 rounded-xl text-center cursor-not-allowed">AUTO-SYNC</div>
                </div>
              </div>

              {/* Logs List Container */}
              <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[400px]">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" />
                    תעבורת נתונים בזמן אמת
                  </h2>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Buffer units: {logs.length}/50</span>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-none">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <div className="p-8 bg-slate-800 rounded-full border border-slate-700">
                        <Mic size={48} />
                      </div>
                      <p className="text-sm font-mono tracking-widest uppercase">Awaiting Connection...</p>
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={log.timestamp}
                        className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-3 hover:bg-slate-800/60 transition-colors group"
                      >
                        <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-indigo-500/20 rounded-md flex items-center justify-center">
                              <User size={12} className="text-indigo-400" />
                            </div>
                            <span className="font-mono text-xs font-bold text-indigo-300">{log.phone}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString("he-IL")}</span>
                            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">200 OK</div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-500 rounded-full"></span> STT INPUT
                            </div>
                            <p className="text-[13px] text-slate-200 leading-relaxed font-medium">{log.input || "---"}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1 h-1 bg-indigo-500 rounded-full"></span> AI RESPONSE
                            </div>
                            <p className="text-[13px] text-indigo-100 italic leading-relaxed">{log.output}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Settings View - Bento Style */
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">שינוי הנחיות מערכת (System Prompt)</h2>
                  <p className="text-slate-400 text-xs">הגדר את "האישיות" וכללי התגובה של הבינה המלאכותית מול המאזינים.</p>
                </div>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="למשל: ענה בקצרה, אתה נציג חברה מנומס..."
                  className="flex-grow bg-black/30 border border-slate-700/50 rounded-2xl p-5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner font-mono leading-relaxed"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className={`px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg ${isSaving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-indigo-500/20'}`}
                  >
                    {isSaving ? "מעבד נתונים..." : "עדכון הנחיות"}
                  </button>
                </div>
              </div>

              <div className="md:col-span-4 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-4 border-l-4 border-l-indigo-500">
                  <h3 className="text-xs text-indigo-400 font-bold uppercase tracking-widest">סטטיסטיקה</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white leading-none tracking-tighter">GEMINI</span>
                    <span className="text-xs text-slate-500 font-mono pb-0.5 italic">1.5 Flash</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>דיוק STT</span>
                      <span>98.2%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-indigo-500"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-6 flex flex-col gap-3">
                  <h3 className="text-xs text-indigo-300 font-bold uppercase tracking-widest">טיפ לביצועים</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    שימוש במודל Flash מאפשר תשובות בזמן אמת (פחות מ-2 שניות) – מה שקריטי לחווית משתמש טלפונית ללא "שתיקות" ארוכות.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-8 border-t border-slate-900 pt-8 pb-12">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 px-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} /> מדריך למסלול חינמי (ללא יחידות)
            </h3>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs leading-relaxed text-slate-400 space-y-3">
              <p>כדי לא לשלם על יחידות STT במערכת הטלפונית, אל תשתמש ב- <code className="text-slate-200">voice</code>. השתמש בשיטת ההקלטה:</p>
              <div className="bg-black/40 p-3 rounded-xl font-mono text-indigo-300">
                api_000=my_audio,yes,record,/1/1,audio_file,no,yes,yes
              </div>
              <p className="italic">במצב זה, המערכת תקליט את המאזין בחינם, והשרת יתמלל את הקובץ באמצעות Gemini (גם בחינם!).</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Settings size={16} /> הגדרת מפתח API
            </h3>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs leading-relaxed text-slate-400 space-y-3">
              <p>1. הוצא מפתח ב- <a href="https://aistudio.google.com" target="_blank" className="text-blue-400 underline">Google AI Studio</a> (חינם).</p>
              <p>2. כאן באדיטור, לחץ על <b>Secrets</b> (סמל המנעול).</p>
              <p>3. הוסף מפתח בשם <code className="text-slate-200">GEMINI_API_KEY</code> והדבק את הערך.</p>
              <p className="text-[10px] opacity-70">הערה: פריסה ב-Vercel דורשת הגדרת ה-Environment Variables בלוח הבקרה שלהם.</p>
            </div>
          </div>
        </div>
        <div className="text-center mt-12 text-[9px] text-slate-700 uppercase tracking-[0.4em]">
          Bento IVR AI • Free Tier Optimized • 2024
        </div>
      </footer>
    </div>
  );
}

