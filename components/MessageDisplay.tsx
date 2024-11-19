"use client";

import { Message, Source } from "@/lib/types";
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "./ui/table";
import { Button } from "./ui/button";

interface SourceCardProps {
  source: Source;
  sourceIndex: number;
}

function SourceCard({ source, sourceIndex }: SourceCardProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:no-underline"
    >
      <Card className="p-4 hover:bg-accent transition-colors">
        <div className="flex gap-4 relative overflow-hidden">
          {source.thumbnail && (
            <img
              src={source.thumbnail}
              alt={source.title}
              className="w-24 h-24 object-cover rounded-md"
            />
          )}
          <div className="flex-1 min-w-0 max-w-full">
            <h3 className="font-medium text-sm text-foreground truncate">
              {source.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {source.siteName}
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs max-w-xs text-muted-foreground truncate"
            >
              {source.url}
            </a>
          </div>
        </div>
      </Card>
    </a>
  );
}

interface MessageDisplayProps {
  message: Message;
}

export function CitationToolTip({
  source,
  sourceIndex,
}: {
  source: Source;
  sourceIndex: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="mx-1 inline-flex h-4 w-4 -translate-y-0.5 items-center justify-center rounded-full border-transparent bg-secondary p-0.5 text-xs text-foreground no-underline">
        {sourceIndex}
      </TooltipTrigger>
      <TooltipContent className="flex bg-transparent ">
        <SourceCard source={source} sourceIndex={sourceIndex} />
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageDisplay({ message }: MessageDisplayProps) {
  if (message.type === "query") {
    return (
      <div className="space-y-2">
        <p className="text-lg font-medium">{message.message}</p>
      </div>
    );
  }

  const processMarkdownContent = (content: string) => {
    const uuidPattern = /\[\[([\w-]+)\]\]/g;

    const convertedContent = content.replace(uuidPattern, (match, uuid) => {
      const source = message.sources?.find((source) => source.id === uuid);

      console.log(source);
      console.log(match, uuid);

      if (source) {
        const sourceFileIndex = message.sources?.findIndex(
          (source) => source.id === uuid
        );

        if (sourceFileIndex && sourceFileIndex !== -1) {
          return `[${sourceFileIndex + 1}](${source.id})`;
        }
      }
      return "";
    });
    console.log(convertedContent);
    return convertedContent;
  };

  console.log(message);

  return (
    <div className="space-y-4">
      {message.isLoading ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{message.statusLabel}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {message.searchTerms && (
              <span className="text-xs text-muted-foreground inline-flex gap-1 flex-wrap">
                {message.searchTerms.map((term, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-secondary/50"
                  >
                    {term}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {message.sources && (
            <Accordion type="single" collapsible>
              <AccordionItem value="sources">
                <AccordionTrigger className="text-sm font-medium">
                  View Sources ({message.sources.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {message.sources.map((source, i) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        sourceIndex={i + 1}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {message.message && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                a: (props) => {
                  if (
                    props.href &&
                    !["https://", "http://"].includes(props.href)
                  ) {
                    const source = message.sources?.find(
                      (source) => source.id === props.href
                    );

                    if (source) {
                      const sourceFileIndex = message.sources?.findIndex(
                        (source) => source.id === props.href
                      );

                      if (sourceFileIndex && sourceFileIndex !== -1) {
                        return (
                          <CitationToolTip
                            source={source}
                            sourceIndex={sourceFileIndex + 1}
                          />
                        );
                      }
                    }
                    return null;
                  } else {
                    return <a href={props.href}>{props.children}</a>;
                  }
                },
                table: (props) => {
                  return (
                    <div className="w-full max-w-4xl overflow-x-scroll">
                      <div className="w-full space-y-2">
                        <div className="relative h-fit !rounded-md border border-input p-3">
                          <Table className="!my-0 !py-0">
                            {props.children}
                          </Table>
                        </div>
                      </div>
                    </div>
                  );
                },
                thead: (props) => {
                  return <TableHeader>{props.children}</TableHeader>;
                },
                th: (props) => {
                  return (
                    <TableHead className="text-left">
                      <span className="p-2 font-bold">{props.children}</span>
                    </TableHead>
                  );
                },
                tr: (props) => {
                  return <TableRow>{props.children}</TableRow>;
                },
                tbody: (props) => {
                  return <TableBody>{props.children}</TableBody>;
                },
                td: (props) => {
                  return (
                    <TableCell>
                      <span className="p-2">{props.children}</span>
                    </TableCell>
                  );
                },
              }}
            >
              {processMarkdownContent(message.message)}
            </ReactMarkdown>
          )}
        </>
      )}
    </div>
  );
}
