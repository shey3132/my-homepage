import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Phone, 
  Users, 
  History as HistoryIcon, 
  LayoutDashboard, 
  Plus, 
  ChevronRight,
  Trash2,
  RefreshCw,
  Zap,
  ListOrdered,
  PhoneOff,
  UserMinus
} from 'lucide-react';
import { ref, onValue, set, push, remove, runTransaction } from 'firebase/database';
import { db } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Call, Session, Phonebook, View, QueueEntry } from './types';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [liveCalls, setLiveCalls] = useState<Call[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [phonebook, setPhonebook] = useState<Phonebook>({});
  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Session[]>([]);
  const [apiToken, setApiToken] = useState('097642194:*5473');
  const [queuePath, setQueuePath] = useState('ivr2:/1');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [sparks, setSparks] = useState<{id: number, left: string, delay: string, duration: string}[]>([]);

  const activeSessionsRef = useRef<Record<string, Session>>({});

  useEffect(() => {
    // Generate sparks
    setSparks(Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 8 + 8}s`
    })));
  }, []);

  useEffect(() => {
    const phonebookRef = ref(db, 'phonebook');
    const statsRef = ref(db, 'statistics');
    const historyRef = ref(db, 'history');

    const unsubPhonebook = onValue(phonebookRef, (snapshot) => {
      setPhonebook(snapshot.val() || {});
    });

    const unsubStats = onValue(statsRef, (snapshot) => {
      setStatistics(snapshot.val() || {});
    });

    const unsubHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyList = Object.values(data) as Session[];
        setHistory(historyList.sort((a, b) => b.startTime - a.startTime));
      } else {
        setHistory([]);
      }
    });

    return () => {
      unsubPhonebook();
      unsubStats();
      unsubHistory();
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const processTracking = React.useCallback((calls: Call[]) => {
    const now = Date.now();
    const liveIds = new Set(calls.map(c => c.id));
    const activeSessions = activeSessionsRef.current;

    // End sessions for calls that are no longer live
    for (const id in activeSessions) {
      if (!liveIds.has(id)) {
        const s = activeSessions[id];
        const historyRef = ref(db, 'history');
        push(historyRef, {
          ...s,
          endTime: now,
          duration: now - s.startTime
        });
        delete activeSessions[id];
      }
    }

    // Update or start sessions for live calls
    calls.forEach(call => {
      const path = call.path || 'ראשי';
      if (!activeSessions[call.id]) {
        activeSessions[call.id] = {
          startTime: now,
          callerId: call.callerIdNum,
          name: phonebook[call.callerIdNum] || 'לא ידוע',
          paths: [path]
        };
        const safePath = path.replace(/[.#$[\]]/g, '_');
        const statRef = ref(db, `statistics/${safePath}`);
        runTransaction(statRef, (currentCount) => {
          return (currentCount || 0) + 1;
        });
      } else {
        const session = activeSessions[call.id];
        if (session.paths[session.paths.length - 1] !== path) {
          session.paths.push(path);
        }
      }
    });
  }, [phonebook]);

  const updateCalls = React.useCallback(async () => {
    if (!apiToken) return;
    try {
      // Fetch Live Calls
      const resCalls = await fetch(`/api/proxy/calls?token=${encodeURIComponent(apiToken)}`);
      if (resCalls.ok) {
        const data = await resCalls.json();
        const calls = Array.isArray(data) ? data : (data.calls || []);
        setLiveCalls(calls);
        processTracking(calls);
      }

      // Fetch Queue
      if (queuePath) {
        const resQueue = await fetch(`/api/proxy/queue?token=${encodeURIComponent(apiToken)}&queuePath=${encodeURIComponent(queuePath)}`);
        if (resQueue.ok) {
          const data = await resQueue.json();
          setQueueEntries(data.entries || []);
        }
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  }, [apiToken, queuePath, processTracking]);

  const hangupCall = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/hangup?token=${encodeURIComponent(apiToken)}&ids=${id}`);
      if (res.ok) {
        showToast("📵 שיחה נותקה בהצלחה");
        updateCalls();
      }
    } catch (e) {
      console.error("Hangup Error:", e);
    }
  };

  const kickFromQueue = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/queue-kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken, callIds: [id] })
      });
      if (res.ok) {
        showToast("🚪 הוצא מהתור ונותק");
        updateCalls();
      }
    } catch (e) {
      console.error("Kick Error:", e);
    }
  };

  useEffect(() => {
    const interval = setInterval(updateCalls, 2000);
    updateCalls();
    return () => clearInterval(interval);
  }, [updateCalls]);

  const addContact = () => {
    const phone = contactPhone.replace(/[^0-9]/g, '');
    if (contactName && phone) {
      set(ref(db, `phonebook/${phone}`), contactName);
      showToast("✅ איש קשר נוסף למערכת");
      setContactName('');
      setContactPhone('');
    }
  };

  const clearHistory = () => {
    if (window.confirm("האם למחוק לצמיתות את כל היסטוריית השיחות?")) {
      remove(ref(db, 'history'));
    }
  };

  const resetStats = () => {
    if (window.confirm("האם לאפס את מונה הכניסות לכל השלוחות?")) {
      remove(ref(db, 'statistics'));
    }
  };

  const totalEntries = useMemo(() => {
    return Object.values(statistics).reduce((acc: number, val) => acc + (typeof val === 'number' ? val : 0), 0);
  }, [statistics]);

  const sortedStats = useMemo(() => {
    const entries = Object.entries(statistics).filter(([_, v]) => typeof v === 'number');
    const max = Math.max(...entries.map(e => e[1] as number), 1);
    return entries.sort((a, b) => (b[1] as number) - (a[1] as number)).map(([path, count]) => ({
      path,
      count: count as number,
      perc: ((count as number) / max) * 100
    }));
  }, [statistics]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-dark text-gray-100 font-sans main-bg" dir="rtl">
      {/* Sparks Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {sparks.map(spark => (
          <div 
            key={spark.id}
            className="spark"
            style={{ 
              left: spark.left, 
              animationDelay: spark.delay, 
              animationDuration: spark.duration 
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <aside className="sidebar w-[280px] h-full flex flex-col z-50">
        <div className="p-10 flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-orange-600/20 rounded-full"></div>
            <img 
              src="https://raw.githubusercontent.com/shey3132/-22/refs/heads/main/image__1_-removebg-preview.png" 
              alt="Logo" 
              className="w-36 relative drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-black mt-6 tracking-tighter">
            בוערים <span className="text-orange-500 italic">3.0</span>
          </h2>
        </div>

        <nav className="flex-1 mt-6 space-y-2">
          <div 
            onClick={() => setView('dashboard')} 
            className={cn("nav-item", view === 'dashboard' && "active")}
          >
            <LayoutDashboard className="w-5 h-5" />
            לוח בקרה
          </div>
          <div 
            onClick={() => setView('queues')} 
            className={cn("nav-item", view === 'queues' && "active")}
          >
            <ListOrdered className="w-5 h-5" />
            ניהול תורים
          </div>
          <div 
            onClick={() => setView('history')} 
            className={cn("nav-item", view === 'history' && "active")}
          >
            <HistoryIcon className="w-5 h-5" />
            היסטוריית שיחות
          </div>
          <div 
            onClick={() => setView('contacts')} 
            className={cn("nav-item", view === 'contacts' && "active")}
          >
            <Users className="w-5 h-5" />
            אנשי קשר
          </div>
        </nav>

        <div className="p-8">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">חיבור פעיל</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 z-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-6xl font-black tracking-tighter text-fire italic uppercase">DASHBOARD</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="h-px w-8 bg-orange-600"></span>
                    <p className="text-orange-500 font-bold text-[10px] uppercase tracking-[0.3em]">Real-time Network Monitor</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="glass-card px-10 py-5 text-center min-w-[160px]">
                    <span className="block text-4xl font-black text-white">{totalEntries}</span>
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">סה"כ כניסות</span>
                  </div>
                  <div className="glass-card px-10 py-5 text-center min-w-[160px] bg-orange-600/5 border-orange-600/20">
                    <span className="block text-4xl font-black text-orange-500">{liveCalls.length}</span>
                    <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest mt-1">שיחות פעילות</span>
                  </div>
                  <div className="glass-card px-10 py-5 text-center min-w-[160px] bg-yellow-600/5 border-yellow-600/20">
                    <span className="block text-4xl font-black text-yellow-500">{queueEntries.length}</span>
                    <span className="text-[9px] text-yellow-400 font-black uppercase tracking-widest mt-1">ממתינים בתור</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">שידור חי</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {liveCalls.length === 0 ? (
                      <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                        <p className="text-gray-700 text-xs font-bold uppercase tracking-widest italic">ממתין לשיחות נכנסות...</p>
                      </div>
                    ) : (
                      liveCalls.map((call: Call) => (
                        <CallCard 
                          key={call.id} 
                          call={call} 
                          name={phonebook[call.callerIdNum] || 'מבקר לא מזוהה'} 
                          onHangup={() => hangupCall(call.id)}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="glass-card p-8">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">דירוג שלוחות</h3>
                      <button 
                        onClick={resetStats}
                        className="text-[10px] font-bold text-red-900 hover:text-red-500 transition-colors"
                      >
                        איפוס נתונים
                      </button>
                    </div>
                    <div className="space-y-6">
                      {sortedStats.length === 0 ? (
                        <p className="text-center text-gray-700 text-[10px] font-bold py-8">אין נתונים בסטטיסטיקה</p>
                      ) : (
                        sortedStats.map(stat => (
                          <div key={stat.path} className="space-y-2">
                            <div className="flex justify-between items-end px-1">
                              <span className="text-[11px] font-black text-white/70 uppercase">שלוחה {stat.path}</span>
                              <span className="text-sm font-black text-orange-500">{stat.count}</span>
                            </div>
                            <div className="stat-bar">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stat.perc}%` }}
                                className="stat-fill" 
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'queues' && (
            <motion.div 
              key="queues"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-5xl font-black italic text-fire uppercase">QUEUE MANAGEMENT</h1>
                  <p className="text-orange-500 font-bold text-[10px] uppercase tracking-widest mt-2">ניהול תורים וניתוק שיחות בזמן אמת</p>
                </div>
                <div className="glass-card p-4 flex items-center gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">נתיב התור</label>
                    <input 
                      type="text" 
                      value={queuePath}
                      onChange={(e) => setQueuePath(e.target.value)}
                      className="bg-transparent border-b border-white/10 text-xs outline-none focus:border-orange-500 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {queueEntries.length === 0 ? (
                  <div className="py-24 text-center border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                    <p className="text-gray-700 text-xs font-bold uppercase tracking-widest italic">אין ממתינים בתור כרגע</p>
                  </div>
                ) : (
                  queueEntries.map((entry) => (
                    <div key={entry.id} className="glass-card p-6 flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black">
                          {entry.position}
                        </div>
                        <div>
                          <div className="font-black text-white text-lg">{phonebook[entry.callerIdNum] || 'ממתין לא מזוהה'}</div>
                          <div className="text-xs text-orange-500 font-mono">{entry.callerIdNum}</div>
                        </div>
                        <div className="h-10 w-px bg-white/5"></div>
                        <div>
                          <div className="text-[8px] text-gray-500 font-black uppercase">זמן כניסה</div>
                          <div className="text-xs font-bold text-white">{entry.enterTime}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => kickFromQueue(entry.id)}
                        className="flex items-center gap-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border border-red-600/20"
                      >
                        <UserMinus className="w-4 h-4" />
                        הוצא ונתק
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-5xl font-black italic text-fire uppercase">HISTORY</h1>
                  <p className="text-orange-500 font-bold text-[10px] uppercase tracking-widest mt-2">תיעוד מלא של תעבורת הרשת</p>
                </div>
                <button 
                  onClick={clearHistory}
                  className="bg-red-950/30 text-red-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all border border-red-900/20"
                >
                  מחק היסטוריה
                </button>
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-white/[0.03] border-b border-white/5">
                    <tr>
                      <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">מבקר / מזהה</th>
                      <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">מסלול בתוך המערכת</th>
                      <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">זמן כניסה</th>
                      <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">משך שהייה</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-24 text-center text-gray-800 font-bold italic uppercase tracking-widest">
                          ההיסטוריה ריקה לחלוטין
                        </td>
                      </tr>
                    ) : (
                      history.map((doc, idx) => (
                        <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="p-6">
                            <div className="font-black text-white text-base">{doc.name || 'לא ידוע'}</div>
                            <div className="text-[10px] text-gray-600 font-mono tracking-tighter">{doc.callerId}</div>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-wrap gap-2 items-center">
                              {doc.paths.map((p, i) => (
                                <React.Fragment key={i}>
                                  <span className="path-tag">{p}</span>
                                  {i < doc.paths.length - 1 && <ChevronRight className="w-3 h-3 text-gray-800" />}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                          <td className="p-6 text-xs font-bold text-gray-500">
                            {new Date(doc.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-6">
                            <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                              {Math.floor((doc.duration || 0) / 1000)}s
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {view === 'contacts' && (
            <motion.div 
              key="contacts"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-10"
            >
              <h1 className="text-5xl font-black italic text-fire uppercase">CONTACTS</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="glass-card p-10">
                  <h3 className="text-xl font-black text-orange-500 mb-8 uppercase">רישום איש קשר</h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase px-1">שם מלא</label>
                      <input 
                        type="text" 
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="הכנס שם..." 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase px-1">מספר טלפון</label>
                      <input 
                        type="text" 
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="0500000000" 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-700 font-mono"
                      />
                    </div>
                    <button 
                      onClick={addContact}
                      className="w-full btn-primary py-5 rounded-2xl font-black uppercase text-sm mt-4 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      שמור במאגר
                    </button>
                  </div>
                </div>
                <div className="glass-card p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase">הגדרות API</h3>
                    <p className="text-gray-500 text-xs mb-8">ניהול מפתח גישה מול שרתי Call2All</p>
                    <div className="bg-black/60 p-6 rounded-2xl border border-white/5 shadow-inner">
                      <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Access Token</label>
                      <input 
                        type="password" 
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="w-full bg-transparent border-b border-orange-900/40 py-3 text-sm outline-none focus:border-orange-500 font-mono text-orange-500" 
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-700 italic mt-8 text-center uppercase tracking-tighter">Powered by Buerim Tech Engine v3.0</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-10 bg-white text-black font-black px-10 py-4 rounded-2xl shadow-2xl z-[100] border-t-4 border-orange-500"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CallCard({ call, name, onHangup }: { call: Call, name: string, onHangup?: () => void }) {
  const isKnown = name !== 'מבקר לא מזוהה';
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-card p-6 flex justify-between items-center border-r-[6px] hover:scale-[1.02] transition-transform",
        isKnown ? "border-r-orange-500" : "border-r-white/10"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-orange-500 border border-white/5 shadow-inner">
          <Phone className="w-6 h-6" />
        </div>
        <div>
          <div className="font-black text-white text-lg leading-tight">{name}</div>
          <div className="text-[11px] text-orange-500 font-mono font-bold tracking-tight">{call.callerIdNum}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-left bg-black/40 px-4 py-2 rounded-xl border border-white/5">
          <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest">שלוחה</div>
          <div className="text-sm font-black text-white">{call.path || 'ראשי'}</div>
        </div>
        {onHangup && (
          <button 
            onClick={onHangup}
            className="p-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-600/20"
            title="נתק שיחה"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
