"use client";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { KeyboardEvent } from "react";

export function FollowUpInput() {
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // TODO: Handle follow-up
    }
  };

  return (
    <Card className="sticky bottom-4 w-full shadow-lg">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <textarea
            disabled
            placeholder="Ask a follow-up question..."
            className="flex-1 resize-none border-0 bg-transparent p-2 focus:outline-none focus:ring-0"
            rows={1}
            onKeyPress={handleKeyPress}
          />
          <Button disabled size="sm" className="self-end">
            <ArrowRight size={18} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
