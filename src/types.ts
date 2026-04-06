export interface Message {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isBreaking: boolean;
  emojis: {
    like: number;
    sad: number;
    wow: number;
  };
  views: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  displayName: string;
}

export interface AppSettings {
  tickerText: string;
  isMaintenance: boolean;
  siteTitle: string;
}
