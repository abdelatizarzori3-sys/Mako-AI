import { describe, expect, it } from "vitest";

import {
  buildConversationMarkdown,
  createConversationExportFilename,
} from "@shared/conversationExport";

describe("conversation Markdown export", () => {
  it("exports the supplied messages with a title, UTC dates, and explicit roles", () => {
    const markdown = buildConversationMarkdown(
      {
        title: "Launch plan",
        messages: [
          {
            role: "user",
            content: "First signal\r\nwith a second line.",
            createdAt: "2026-10-31T08:00:00.000Z",
          },
          {
            role: "assistant",
            content: "A concrete reply.",
            createdAt: "2026-10-31T08:01:30.000Z",
          },
        ],
      },
      "2026-10-31T08:02:00.000Z"
    );

    expect(markdown).toContain("# Launch plan");
    expect(markdown).toContain("**Exported (UTC):** 2026-10-31T08:02:00Z");
    expect(markdown).toContain("## User · 2026-10-31T08:00:00Z");
    expect(markdown).toContain("First signal\nwith a second line.");
    expect(markdown).toContain("## Assistant · 2026-10-31T08:01:30Z");
    expect(markdown).toContain("A concrete reply.");
  });

  it("keeps titles to one safe heading and redacts private file links and credentials", () => {
    const markdown = buildConversationMarkdown({
      title: "# Client notes\n## injected heading",
      messages: [
        {
          role: "user",
          content:
            "token=do-not-export https://example.test/manus-storage/private/recording.webm <script>alert(1)</script>",
          createdAt: "2026-10-31T08:00:00.000Z",
        },
      ],
    });

    expect(markdown).toContain("# Client notes ## injected heading");
    expect(markdown).not.toContain("do-not-export");
    expect(markdown).not.toContain("manus-storage/private");
    expect(markdown).toContain("token=[redacted]");
    expect(markdown).toContain("[private file link redacted]");
    expect(markdown).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("uses a portable date-based Markdown filename", () => {
    expect(createConversationExportFilename("2026-10-31T08:02:00.000Z")).toBe(
      "marokecho-conversation-2026-10-31.md"
    );
  });
});
