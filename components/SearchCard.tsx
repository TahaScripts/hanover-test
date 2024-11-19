"use client";

import { useCallback, KeyboardEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, ArrowRight } from "lucide-react";
import { useSearch } from "@/contexts/SearchContext";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;

export function SearchCard() {
  const {
    currentMessage,
    setCurrentMessage,
    currentFiles,
    addFiles,
    removeFile,
    addQueryToHistory,
  } = useSearch();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      console.log(acceptedFiles[0].name);
      addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addQueryToHistory();
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        rejection.errors.forEach((error) => {
          if (error.code === "file-too-large") {
            alert(`File ${rejection.file.name} is too large. Max size is 5MB`);
          }
        });
      });
    },
  });

  return (
    <Card className="w-full" {...getRootProps()}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <textarea
            placeholder="Ask anything..."
            className="w-full resize-none border-0 bg-transparent p-2 focus:outline-none focus:ring-0"
            rows={3}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyPress={handleKeyPress}
          />

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <input {...getInputProps()} />
              {currentFiles.length > 0 ? (
                <>
                  {currentFiles.length < MAX_FILES && (
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2" size={16} />
                      Add files
                    </Button>
                  )}
                  {currentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="inline-flex items-center gap-1 max-w-[200px] bg-secondary rounded-md px-2 py-1"
                    >
                      <span className="truncate text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ))}
                </>
              ) : (
                <Button variant="outline" size="sm">
                  <Upload className="mr-2" size={16} />
                  Add files
                </Button>
              )}
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                addQueryToHistory();
              }}
            >
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
