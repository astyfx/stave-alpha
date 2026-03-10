import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function resolveMessageSizeClass(size: "base" | "lg" | "xl") {
  if (size === "xl") {
    return "text-xl";
  }
  if (size === "lg") {
    return "text-lg";
  }
  return "text-base";
}

export interface MarkdownMessageProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  isStreaming?: boolean;
  messageFontSize: "base" | "lg" | "xl";
  messageCodeFontSize: "base" | "lg" | "xl";
  onFileLinkClick?: (args: { event: MouseEvent<HTMLAnchorElement>; href?: string }) => void | Promise<void>;
  renderBlockCode?: (args: { code: string; language?: string }) => ReactNode;
}

export function MarkdownMessage({
  content,
  isStreaming,
  messageFontSize,
  messageCodeFontSize,
  onFileLinkClick,
  renderBlockCode,
  className,
  ...props
}: MarkdownMessageProps) {
  return (
    <div
      className={cn(
        "leading-7",
        resolveMessageSizeClass(messageFontSize),
        className,
      )}
      data-streaming={isStreaming ? "true" : undefined}
      {...props}
    >
      {isStreaming ? (
        <div className="whitespace-pre-wrap break-words">{content}</div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="my-2 ml-5 list-disc pl-1 marker:text-muted-foreground [&_ol]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:my-1 [&_ul]:ml-5 [&_ul]:list-disc">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 ml-5 list-decimal pl-1 marker:text-muted-foreground [&_ol]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:my-1 [&_ul]:ml-5 [&_ul]:list-disc">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="my-1 marker:text-muted-foreground [&>p]:my-0">{children}</li>,
            code: ({ className: codeClassName, children }) => {
              const lang = /language-(\w+)/.exec(codeClassName ?? "")?.[1];
              const text = String(children);
              const isBlock = Boolean(lang) || text.includes("\n");
              if (isBlock) {
                if (renderBlockCode) {
                  return renderBlockCode({
                    code: text.replace(/\n$/, ""),
                    language: lang,
                  });
                }
                return <pre><code>{text.replace(/\n$/, "")}</code></pre>;
              }
              return (
                <code
                  className={cn(
                    "rounded bg-muted px-1 py-0.5 font-mono",
                    resolveMessageSizeClass(messageCodeFontSize),
                  )}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <>{children}</>,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => void onFileLinkClick?.({ event, href })}
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <Table className="my-3 w-full table-fixed border-separate border-spacing-0 rounded-md border border-border/70 bg-card text-sm">
                {children}
              </Table>
            ),
            thead: ({ children }) => <TableHeader className="bg-muted/40">{children}</TableHeader>,
            tbody: ({ children }) => <TableBody>{children}</TableBody>,
            tr: ({ children }) => <TableRow className="hover:bg-muted/30">{children}</TableRow>,
            th: ({ children }) => (
              <TableHead className="h-auto border-r border-border/70 px-3 py-2 align-top whitespace-normal break-words [overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_code]:break-all last:border-r-0">
                {children}
              </TableHead>
            ),
            td: ({ children }) => (
              <TableCell className="border-r border-border/70 px-3 py-2 align-top whitespace-normal break-words [overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_code]:break-all last:border-r-0">
                {children}
              </TableCell>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
}
