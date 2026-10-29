export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always provided so every client can render the message. */
  text: string;
  /** Optional HTML body. Build it with the helpers in templates.ts, which escape user data. */
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}
