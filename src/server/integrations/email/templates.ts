import type { EmailMessage } from "./types";

/** Escapes text for safe interpolation into HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px">${escapeHtml(title)}</h1>${bodyHtml}
<p style="color:#666;font-size:12px;margin-top:32px">If you did not request this, you can ignore this email.</p></body></html>`;
}

export function passwordResetEmail(input: { to: string; name: string; url: string }): EmailMessage {
  const subject = "Reset your password";
  return {
    to: input.to,
    subject,
    text: `Hi ${input.name},\n\nUse this link to choose a new password. It expires in 1 hour.\n\n${input.url}\n`,
    html: layout(
      subject,
      `<p>Hi ${escapeHtml(input.name)},</p><p>Use the button below to choose a new password. The link expires in 1 hour.</p>
<p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Reset password</a></p>`,
    ),
  };
}
