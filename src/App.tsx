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
  Zap
} from 'lucide-react';
import { ref, onValue, set, push, remove, runTransaction } from 'firebase/database';
import { db } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Call, Session, Phonebook, View } from './types';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [liveCalls, setLiveCalls] = useState<Call[]>([]);
  const [phonebook, setPhonebook] = useState<Phonebook>({});
  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Session[]>([]);
  const [apiToken, setApiToken] = useState('097642194:*5473');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [sparks, setSparks] = useState<{id: number, left: string, delay: string, duration: string}[]>([]);

  const activeSessionsRef = useRef<Record<string, Session>>({});

  useEffect(() => {
    // Generate sparks
    setSparks(Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 5 + 5}s`
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

  const processTracking = (calls: Call[]) => {
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
  };

  const updateCalls = async () => {
    if (!apiToken) return;
    try {
      const res = await fetch(`/api/proxy/calls?token=${encodeURIComponent(apiToken)}`);
      const data = await res.json();
      const calls = Array.isArray(data) ? data : (data.calls || []);
      
      setLiveCalls(calls);
      processTracking(calls);
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  useEffect(() => {
    const interval = setInterval(updateCalls, 2000);
    updateCalls();
    return () => clearInterval(interval);
  }, [apiToken, phonebook]);

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
    <div className="flex h-screen w-full overflow-hidden bg-bg-dark text-gray-100 font-sans grid-bg" dir="rtl">
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
      <aside className="sidebar w-[300px] h-full flex flex-col z-50 shadow-[20px_0_50px_rgba(0,0,0,0.8)]">
        <div className="p-12 flex flex-col items-center border-b border-white/5">
          <div className="relative group">
            <div className="absolute inset-0 blur-3xl bg-orange-600/30 rounded-full group-hover:bg-orange-600/50 transition-all"></div>
            <img 
              src="https://raw.githubusercontent.com/shey3132/-22/refs/heads/main/image__1_-removebg-preview.png" 
              alt="Logo" 
              className="w-40 relative drop-shadow-[0_0_20px_rgba(255,77,0,0.5)]"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-4xl font-display mt-8 tracking-tighter text-fire italic">
            בוערים <span className="text-orange-500">3.0</span>
          </h2>
        </div>

        <nav className="flex-1 mt-10">
          <NavItem 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')}
            icon={<LayoutDashboard className="w-6 h-6" />}
            label="DASHBOARD"
          />
          <NavItem 
            active={view === 'history'} 
            onClick={() => setView('history')}
            icon={<HistoryIcon className="w-6 h-6" />}
            label="HISTORY"
          />
          <NavItem 
            active={view === 'contacts'} 
            onClick={() => setView('contacts')}
            icon={<Users className="w-6 h-6" />}
            label="CONTACTS"
          />
        </nav>

        <div className="p-10 border-t border-white/5">
          <div className="bg-orange-600/5 p-5 border border-orange-500/20 flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </div>
            <span className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">LIVE CONNECTION</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-16 z-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="space-y-16"
            >
              <div className="flex justify-between items-end border-b-4 border-white pb-10">
                <div>
                  <h1 className="text-[120px] text-fire leading-none">MONITOR</h1>
                  <div className="flex items-center gap-4 mt-4">
                    <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                    <p className="text-orange-500 font-black text-sm uppercase tracking-[0.5em]">Real-time Network Intelligence</p>
                  </div>
                </div>
                <div className="flex gap-10">
                  <StatCard label="TOTAL ENTRIES" value={totalEntries} />
                  <StatCard label="ACTIVE CALLS" value={liveCalls.length} highlight />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-8 space-y-10">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-2 bg-orange-500"></div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Live Stream</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {liveCalls.length === 0 ? (
                      <div className="py-32 text-center border-2 border-dashed border-white/10 bg-white/[0.02]">
                        <p className="text-gray-700 text-sm font-black uppercase tracking-[0.4em] italic">Waiting for incoming data packets...</p>
                      </div>
                    ) : (
                      liveCalls.map((call: Call) => (
                        <CallCard 
                          key={call.id} 
                          call={call} 
                          name={phonebook[call.callerIdNum] || 'מבקר לא מזוהה'} 
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="glass-card p-10 brutalist-border">
                    <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Path Ranking</h3>
                      <button 
                        onClick={resetStats}
                        className="text-[10px] font-black text-orange-900 hover:text-orange-500 transition-colors uppercase"
                      >
                        Reset Data
                      </button>
                    </div>
                    <div className="space-y-8">
                      {sortedStats.length === 0 ? (
                        <p className="text-center text-gray-800 text-xs font-black py-10 uppercase italic">No statistics available</p>
                      ) : (
                        sortedStats.map(stat => (
                          <div key={stat.path} className="space-y-3">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-black text-white/50 uppercase tracking-widest">Path {stat.path}</span>
                              <span className="text-xl font-display text-orange-500">{stat.count}</span>
                            </div>
                            <div className="stat-bar"><motion.div initial={{ width: 0 }} animate={{ width: `${stat.perc}%` }} className="stat-fill" /></div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end border-b-4 border-white pb-10">
                <div>
                  <h1 className="text-[120px] text-fire leading-none">LOGS</h1>
                  <p className="text-orange-500 font-black text-sm uppercase tracking-[0.5em] mt-4">Full session history archive</p>
                </div>
                <button 
                  onClick={clearHistory}
                  className="btn-primary px-10 py-5 text-sm"
                >
                  Clear Archive
                </button>
              </div>
              <div className="glass-card brutalist-border overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-white/[0.05] border-b-2 border-orange-500/20">
                    <tr>
                      <th className="p-8 text-xs font-black text-gray-500 uppercase tracking-widest">Visitor ID</th>
                      <th className="p-8 text-xs font-black text-gray-500 uppercase tracking-widest">Network Path</th>
                      <th className="p-8 text-xs font-black text-gray-500 uppercase tracking-widest">Entry Time</th>
                      <th className="p-8 text-xs font-black text-gray-500 uppercase tracking-widest">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-32 text-center text-gray-800 font-black italic uppercase tracking-[0.4em]">
                          Archive is empty
                        </td>
                      </tr>
                    ) : (
                      history.map((doc, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                          <td className="p-8">
                            <div className="font-black text-white text-xl leading-none mb-2">{doc.name || 'לא ידוע'}</div>
                            <div className="text-xs text-orange-500 font-mono font-bold">{doc.callerId}</div>
                          </td>
                          <td className="p-8">
                            <div className="flex flex-wrap gap-3 items-center">
                              {doc.paths.map((p, i) => (
                                <React.Fragment key={i}>
                                  <span className="path-tag">{p}</span>
                                  {i < doc.paths.length - 1 && <ChevronRight className="w-4 h-4 text-orange-900" />}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                          <td className="p-8 text-sm font-black text-gray-500">
                            {new Date(doc.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-8">
                            <span className="bg-orange-500 text-black px-4 py-1 font-black text-xs">
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-16"
            >
              <h1 className="text-[120px] text-fire leading-none">DATABASE</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="glass-card p-12 brutalist-border">
                  <h3 className="text-2xl font-black text-orange-500 mb-10 uppercase italic">Add Entry</h3>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="IDENTIFY VISITOR..." 
                        className="w-full bg-black border-2 border-white/10 p-5 text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-800 font-black"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Phone Number</label>
                      <input 
                        type="text" 
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="05XXXXXXXX" 
                        className="w-full bg-black border-2 border-white/10 p-5 text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-800 font-mono font-bold"
                      />
                    </div>
                    <button 
                      onClick={addContact}
                      className="w-full btn-primary py-6 text-lg flex items-center justify-center gap-4"
                    >
                      <Plus className="w-6 h-6" />
                      Commit to Database
                    </button>
                  </div>
                </div>
                <div className="glass-card p-12 brutalist-border flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-4 uppercase italic">API Configuration</h3>
                    <p className="text-gray-600 text-sm mb-12 font-bold uppercase tracking-widest leading-relaxed">Secure access gateway to Call2All network infrastructure.</p>
                    <div className="bg-black p-8 border-2 border-orange-900/20">
                      <label className="text-[10px] text-orange-900 font-black uppercase tracking-[0.4em] mb-4 block">System Access Token</label>
                      <input 
                        type="password" 
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-orange-900/40 py-4 text-xl outline-none focus:border-orange-500 font-mono text-orange-500 font-bold" 
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-gray-800 font-black uppercase tracking-widest">Engine v3.0 // Fire Edition</span>
                    <RefreshCw className="w-4 h-4 text-orange-900 animate-spin-slow" />
                  </div>
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
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-10 right-10 bg-orange-500 text-black font-black px-12 py-6 shadow-[10px_10px_0px_#000] z-[100] border-2 border-black"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <div 
      onClick={onClick} 
      className={cn(
        "nav-item flex items-center gap-6 py-6 px-12 cursor-pointer transition-all duration-300",
        active 
          ? "active text-white font-black" 
          : "text-gray-600 hover:text-orange-500"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-125 text-orange-500")}>
        {icon}
      </div>
      <span className="text-sm font-black tracking-[0.2em]">{label}</span>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string, value: number | string, highlight?: boolean }) {
  return (
    <div className={cn(
      "glass-card px-12 py-8 text-center min-w-[200px] brutalist-border",
      highlight && "bg-orange-600/10"
    )}>
      <span className={cn(
        "block text-6xl font-display leading-none mb-2",
        highlight ? "text-orange-500" : "text-white"
      )}>
        {value}
      </span>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-[0.3em]",
        highlight ? "text-orange-400" : "text-gray-600"
      )}>
        {label}
      </span>
    </div>
  );
}

function CallCard({ call, name }: { call: Call, name: string }) {
  const isKnown = name !== 'מבקר לא מזוהה';
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "glass-card p-10 flex justify-between items-center border-r-[12px] group",
        isKnown ? "border-r-orange-500" : "border-r-white/10"
      )}
    >
      <div className="flex items-center gap-8">
        <div className="w-20 h-20 bg-black flex items-center justify-center text-orange-500 border-2 border-orange-500/20 group-hover:border-orange-500 transition-all duration-500">
          <Phone className="w-10 h-10" />
        </div>
        <div>
          <div className="font-black text-white text-4xl leading-none tracking-tighter mb-2 uppercase italic">{name}</div>
          <div className="text-sm text-orange-500 font-mono font-bold tracking-[0.2em] opacity-60">{call.callerIdNum}</div>
        </div>
      </div>
      <div className="text-left bg-black px-8 py-4 border-2 border-white/5">
        <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-2">Active Path</div>
        <div className="text-2xl font-display text-white italic">{call.path || 'ראשי'}</div>
      </div>
    </motion.div>
  );
}
