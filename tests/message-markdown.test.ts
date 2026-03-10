import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownMessage } from "@/components/ai-elements/message-markdown";

describe("MarkdownMessage", () => {
  test("renders GFM tables as HTML table markup", () => {
    const html = renderToStaticMarkup(createElement(MarkdownMessage, {
      content: [
        "Key improvements:",
        "",
        "| Before | After |",
        "| --- | --- |",
        "| Generic | Concrete |",
      ].join("\n"),
      messageFontSize: "base",
      messageCodeFontSize: "base",
    }));

    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("<td");
  });
});
