export interface Call {
  id: string;
  callerIdNum: string;
  path?: string;
}

export interface Session {
  startTime: number;
  endTime?: number;
  duration?: number;
  callerId: string;
  name: string;
  paths: string[];
}

export interface Statistics {
  [path: string]: number;
}

export interface Phonebook {
  [phone: string]: string;
}

export interface QueueEntry {
  id: string;
  callerIdNum: string;
  enterTime: string;
  position: number;
}

export type View = 'dashboard' | 'history' | 'contacts' | 'queues';
