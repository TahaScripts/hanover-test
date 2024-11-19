export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  siteName: string;
  content?: string;
  thumbnail?: string;
}

export interface BaseMessage {
  id: string;
  timestamp: Date;
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  message: string;
}

export interface AssistantMessage extends BaseMessage {
  type: "assistant";
  isLoading: boolean;
  message?: string;
  sources?: Source[];
  searchTerms?: string[];
  statusLabel?: string;
}

export type Message = QueryMessage | AssistantMessage;

export interface SearchContextType {
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  currentFiles: UploadedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  messages: Message[];
  addQueryToHistory: () => void;
}
