"use client";

import { SearchCard } from "@/components/SearchCard";
import { MessageDisplay } from "@/components/MessageDisplay";
import { FollowUpInput } from "@/components/FollowUpInput";
import { useSearch } from "@/contexts/SearchContext";

export default function Home() {
  const { messages } = useSearch();
  const hasMessages = messages.length > 0;

  return (
    <main className="min-h-screen">
      {hasMessages ? (
        <>
          <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="max-w-3xl mx-auto px-4 py-8">
              <h1 className="text-2xl font-medium">
                {messages[0].type === "query" ? messages[0].message : "Search"}
              </h1>
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 pb-24">
            <div className="space-y-8">
              {messages.slice(1).map((message) => (
                <MessageDisplay key={message.id} message={message} />
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background to-background/0 pt-8 pb-4">
            <div className="max-w-3xl mx-auto px-4">
              <FollowUpInput />
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <SearchCard />
          </div>
        </div>
      )}
    </main>
  );
}
