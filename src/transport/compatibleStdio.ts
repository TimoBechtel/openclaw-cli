import process from "node:process";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

type StdioMode = "unknown" | "jsonl" | "content-length";

export class CompatibleStdioServerTransport {
  private buffer: Buffer | undefined;
  private started = false;
  private mode: StdioMode = "unknown";

  private readonly onData = (chunk: Buffer) => {
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
    this.processBuffer();
  };

  private readonly onError = (error: Error) => {
    this.onerror?.(error);
  };

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly stdin = process.stdin,
    private readonly stdout = process.stdout,
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      throw new Error("CompatibleStdioServerTransport already started");
    }
    this.started = true;
    this.stdin.on("data", this.onData);
    this.stdin.on("error", this.onError);
  }

  async close(): Promise<void> {
    this.stdin.off("data", this.onData);
    this.stdin.off("error", this.onError);

    if (this.stdin.listenerCount("data") === 0) {
      this.stdin.pause();
    }

    this.buffer = undefined;
    this.onclose?.();
  }

  send(message: JSONRPCMessage): Promise<void> {
    return new Promise((resolve) => {
      const payload = JSON.stringify(message);
      const output =
        this.mode === "content-length"
          ? `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`
          : `${payload}\n`;

      if (this.stdout.write(output)) {
        resolve();
      } else {
        this.stdout.once("drain", resolve);
      }
    });
  }

  private processBuffer(): void {
    while (true) {
      try {
        const next = this.readMessage();
        if (!next) return;
        this.onmessage?.(JSONRPCMessageSchema.parse(next));
      } catch (error) {
        this.onerror?.(error as Error);
      }
    }
  }

  private readMessage(): unknown | null {
    if (!this.buffer || this.buffer.length === 0) return null;

    if (this.mode === "unknown") {
      const nl = this.buffer.indexOf("\n");
      if (nl === -1) return null;
      const firstLine = this.buffer.toString("utf8", 0, nl).trim();
      this.mode = firstLine.toLowerCase().startsWith("content-length:")
        ? "content-length"
        : "jsonl";
    }

    if (this.mode === "jsonl") {
      const nl = this.buffer.indexOf("\n");
      if (nl === -1) return null;
      const line = this.buffer.toString("utf8", 0, nl).replace(/\r$/, "").trim();
      this.buffer = this.buffer.subarray(nl + 1);
      if (!line) return null;
      return JSON.parse(line);
    }

    const headerEndCRLF = this.buffer.indexOf("\r\n\r\n");
    const headerEndLF = this.buffer.indexOf("\n\n");
    const hasCRLF = headerEndCRLF !== -1;
    const headerEnd = hasCRLF ? headerEndCRLF : headerEndLF;
    if (headerEnd === -1) return null;

    const sepLen = hasCRLF ? 4 : 2;
    const headerText = this.buffer.toString("utf8", 0, headerEnd);
    const contentLengthMatch = headerText.match(/content-length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      throw new Error("Missing Content-Length header");
    }

    const contentLength = Number(contentLengthMatch[1]);
    const bodyStart = headerEnd + sepLen;
    const bodyEnd = bodyStart + contentLength;
    if (this.buffer.length < bodyEnd) return null;

    const body = this.buffer.toString("utf8", bodyStart, bodyEnd);
    this.buffer = this.buffer.subarray(bodyEnd);
    return JSON.parse(body);
  }
}
