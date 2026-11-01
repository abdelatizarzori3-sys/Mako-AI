export type ConversationExportRole = "user" | "assistant";

export type ConversationExportMessage = {
  role: ConversationExportRole;
  content: string;
  createdAt: string;
};

export type ConversationExportInput = {
  title: string;
  messages: ConversationExportMessage[];
};

const PRIVATE_STORAGE_LINK =
  /(?:https?:\/\/[^\s<>()]+)?\/manus-storage\/[^\s<>()]+/gi;
const SIGNED_URL =
  /https?:\/\/[^\s<>()]+[?&](?:X-Amz-(?:Signature|Credential|Security-Token)|access_token|token|signature)=[^\s<>()]+/gi;
const SECRET_ASSIGNMENT =
  /\b(api[_-]?key|token|secret|password|authorization)\b(\s*(?::|=)\s*)([^\s`"']+)/gi;

function formatUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown UTC";
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function markdownSafeTitle(title: string): string {
  const normalized = title
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^#+\s*/, "");

  return (normalized || "Marokecho conversation")
    .slice(0, 120)
    .replace(/[\\`*_[\]<>]/g, "\\$&");
}

/**
 * Preserve the user's actual words while keeping credentials and private storage
 * locations out of a downloaded file that could be shared elsewhere.
 */
export function redactSensitiveExportContent(content: string): string {
  const redacted = content
    .replace(/\r\n?/g, "\n")
    .replace(PRIVATE_STORAGE_LINK, "[private file link redacted]")
    .replace(SIGNED_URL, "[signed URL redacted]")
    .replace(SECRET_ASSIGNMENT, "$1$2[redacted]");

  return redacted
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildConversationMarkdown(
  input: ConversationExportInput,
  exportedAt: string = new Date().toISOString()
): string {
  const header = [
    `# ${markdownSafeTitle(input.title)}`,
    "",
    `- **Exported (UTC):** ${formatUtc(exportedAt)}`,
    `- **Messages:** ${input.messages.length}`,
    "",
    "---",
  ];

  const entries = input.messages.map(message => {
    const role = message.role === "user" ? "User" : "Assistant";
    const content =
      redactSensitiveExportContent(message.content).trim() || "[Empty message]";
    return [
      "",
      `## ${role} · ${formatUtc(message.createdAt)}`,
      "",
      content,
    ].join("\n");
  });

  return [...header, ...entries, ""].join("\n");
}

export function createConversationExportFilename(
  exportedAt: string = new Date().toISOString()
): string {
  const date = new Date(exportedAt);
  const day = Number.isNaN(date.getTime())
    ? "conversation"
    : date.toISOString().slice(0, 10);
  return `marokecho-conversation-${day}.md`;
}
