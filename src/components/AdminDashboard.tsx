import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Message, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Plus, Trash2, Edit2, AlertCircle, Image as ImageIcon, Save } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const { profile, isEditor } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditor) return;

    const qMsg = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const qCat = query(collection(db, 'categories'), orderBy('order', 'asc'));

    const unsubMsg = onSnapshot(qMsg, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });

    const unsubCat = onSnapshot(qCat, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    return () => {
      unsubMsg();
      unsubCat();
    };
  }, [isEditor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !categoryId) {
      showToast('נא למלא את כל שדות החובה', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'messages'), {
        title,
        content,
        imageUrl,
        categoryId,
        isBreaking,
        authorId: profile?.uid,
        authorName: profile?.displayName,
        createdAt: new Date().toISOString(),
        emojis: { like: 0, sad: 0, wow: 0 },
        views: 0
      });
      
      setTitle('');
      setContent('');
      setImageUrl('');
      setIsBreaking(false);
      showToast('המבזק פורסם בהצלחה', 'success');
    } catch (error) {
      showToast('שגיאה בפרסום המבזק', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מבזק זה?')) return;
    try {
      await deleteDoc(doc(db, 'messages', id));
      showToast('המבזק נמחק', 'info');
    } catch (error) {
      showToast('שגיאה במחיקה', 'error');
    }
  };

  if (!isEditor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">אין לך הרשאות לגשת לדף זה</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-red-600" />
            מבזק חדש
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">כותרת</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                placeholder="כותרת המבזק..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">תוכן</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="תוכן המבזק..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">קטגוריה</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">בחר קטגוריה...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">כתובת תמונה (אופציונלי)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="isBreaking"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="isBreaking" className="text-sm font-bold text-red-600">סמן כמתפרץ</label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'מפרסם...' : 'פרסם עכשיו'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-black mb-6">ניהול מבזקים קיימים</h2>
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.isBreaking && <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                    <h3 className="font-bold text-gray-900 truncate">{msg.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
