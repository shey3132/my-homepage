import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn } from '../lib/utils';
import { Share2, ThumbsUp, Frown, Zap, Eye, Clock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function NewsFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(news);
    });
  }, []);

  const handleReaction = async (messageId: string, type: 'like' | 'sad' | 'wow') => {
    try {
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, {
        [`emojis.${type}`]: increment(1)
      });
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleShare = (message: Message) => {
    if (navigator.share) {
      navigator.share({
        title: message.title,
        text: message.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('הקישור הועתק ללוח', 'info');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black tracking-tighter italic flex items-center gap-2">
          <div className="w-2 h-8 bg-blue-600" />
          מבזקים אחרונים
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          שידור חי
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.article
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md",
                msg.isBreaking && "border-red-200 ring-1 ring-red-100"
              )}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">
                      {msg.isBreaking ? 'מתפרץ' : 'מבזק'}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    <Eye className="w-3 h-3" />
                    {msg.views || 0}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                  {msg.title}
                </h3>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                  {msg.content}
                </p>

                {msg.imageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden aspect-video bg-gray-100">
                    <img
                      src={msg.imageUrl}
                      alt={msg.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleReaction(msg.id, 'like')}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs font-bold">{msg.emojis?.like || 0}</span>
                    </button>
                    <button
                      onClick={() => handleReaction(msg.id, 'sad')}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      <Frown className="w-4 h-4" />
                      <span className="text-xs font-bold">{msg.emojis?.sad || 0}</span>
                    </button>
                    <button
                      onClick={() => handleReaction(msg.id, 'wow')}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-bold">{msg.emojis?.wow || 0}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleShare(msg)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
