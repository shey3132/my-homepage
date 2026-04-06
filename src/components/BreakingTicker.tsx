import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Message } from '../types';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

export default function BreakingTicker() {
  const [breakingNews, setBreakingNews] = useState<Message[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    return onSnapshot(q, (snapshot) => {
      const news = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .filter(m => m.isBreaking);
      setBreakingNews(news);
    });
  }, []);

  if (breakingNews.length === 0) return null;

  return (
    <div className="bg-blue-600 text-white py-2 overflow-hidden relative h-10 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 bg-blue-700 px-4 z-10 flex items-center font-bold italic uppercase tracking-tighter">
        <AlertTriangle className="w-4 h-4 mr-2 animate-pulse" />
        מתפרץ
      </div>
      <div className="flex whitespace-nowrap animate-marquee pl-[120px]">
        {breakingNews.map((news) => (
          <span key={news.id} className="mx-8 font-bold text-lg">
            {news.title}
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {breakingNews.map((news) => (
          <span key={`${news.id}-dup`} className="mx-8 font-bold text-lg">
            {news.title}
          </span>
        ))}
      </div>
    </div>
  );
}
