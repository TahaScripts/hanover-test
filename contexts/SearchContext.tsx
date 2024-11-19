"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  SearchContextType,
  UploadedFile,
  QueryMessage,
  Message,
  AssistantMessage,
} from "@/lib/types";
import {
  generateSearchTerms,
  performSearch,
  generateFinalResponse,
} from "@/app/actions/process-query";

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    setCurrentFiles((prevFiles) => {
      if (prevFiles.length + newFiles.length > MAX_FILES) {
        alert(`Maximum ${MAX_FILES} files allowed`);
        return prevFiles;
      }

      const validFiles = newFiles.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          alert(`File ${file.name} exceeds 5MB limit`);
          return false;
        }
        return true;
      });

      const newUploadedFiles = validFiles.map((file) => ({
        id: uuidv4(),
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      return [...prevFiles, ...newUploadedFiles];
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setCurrentFiles((prevFiles) =>
      prevFiles.filter((file) => file.id !== fileId)
    );
  }, []);

  const updateAssistantMessage = useCallback(
    (messageId: string, updates: Partial<AssistantMessage>) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.type === "assistant"
            ? { ...message, ...updates }
            : message
        )
      );
    },
    []
  );

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  const addQueryToHistory = useCallback(async () => {
    if (!currentMessage.trim()) return;

    const queryMessage: QueryMessage = {
      id: uuidv4(),
      type: "query",
      message: currentMessage,
      timestamp: new Date(),
    };

    const assistantMessage: AssistantMessage = {
      id: uuidv4(),
      type: "assistant",
      isLoading: true,
      timestamp: new Date(),
      statusLabel: "Analyzing query...",
    };

    setMessages((prev) => [...prev, queryMessage, assistantMessage]);
    setCurrentMessage("");
    setCurrentFiles([]);

    try {
      // Step 1: Generate search terms
      updateAssistantMessage(assistantMessage.id, {
        statusLabel: "Generating search terms...",
      });
      const searchTerms = await generateSearchTerms(queryMessage);

      // Step 2: Perform search
      updateAssistantMessage(assistantMessage.id, {
        statusLabel: "Searching the web...",
        searchTerms,
      });
      const sources = await performSearch(searchTerms);

      // Step 3: Generate final response
      updateAssistantMessage(assistantMessage.id, {
        statusLabel: "Processing results...",
        sources,
      });
      const finalMessage = await generateFinalResponse(sources, queryMessage);

      // Step 4: Complete
      updateAssistantMessage(assistantMessage.id, {
        isLoading: false,
        message: finalMessage,
        sources,
        searchTerms,
        statusLabel: "Complete",
      });
    } catch (error) {
      console.error("Failed to process query:", error);
      updateAssistantMessage(assistantMessage.id, {
        isLoading: false,
        message: "Sorry, there was an error processing your query.",
        statusLabel: "Error",
      });
    }
  }, [currentMessage, updateAssistantMessage]);

  const value: SearchContextType = {
    currentMessage,
    setCurrentMessage,
    currentFiles,
    addFiles,
    removeFile,
    messages,
    addQueryToHistory,
  };

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
