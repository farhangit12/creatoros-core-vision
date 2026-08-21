const RESEND_API_URL = "https://api.resend.com/emails";

// Resend's shared testing domain. Swap for a verified custom domain's address
// before production launch.
const FROM_ADDRESS = "CreatorOS <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPasswordResetEmailHtml(params: { name: string; url: string }): string {
  const safeName = escapeHtml(params.name || "there");
  const safeUrl = escapeHtml(params.url);
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
      <p style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 24px;">CreatorOS</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px;">
        Hi ${safeName}, we received a request to reset the password for your CreatorOS account.
        Click the button below to choose a new password.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 10px 20px; border-radius: 8px;">
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
        This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.
      </p>
      <p style="font-size: 12px; line-height: 1.6; color: #9ca3af; margin: 24px 0 0; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br />${safeUrl}
      </p>
    </div>
  `;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "Reset your CreatorOS password",
      html: buildPasswordResetEmailHtml({ name: params.name, url: params.url }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }
}

function buildChangeEmailVerificationHtml(params: { name: string; url: string }): string {
  const safeName = escapeHtml(params.name || "there");
  const safeUrl = escapeHtml(params.url);
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
      <p style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 24px;">CreatorOS</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Confirm your new email</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px;">
        Hi ${safeName}, someone requested to change the email on your CreatorOS account to this
        address. Click the button below to confirm the change.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 10px 20px; border-radius: 8px;">
          Confirm new email
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
        This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email — your address won't change unless this link is clicked.
      </p>
      <p style="font-size: 12px; line-height: 1.6; color: #9ca3af; margin: 24px 0 0; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br />${safeUrl}
      </p>
    </div>
  `;
}

function buildFeedbackEmailHtml(params: {
  fromName: string;
  fromEmail: string;
  route: string;
  message: string;
}): string {
  const safeName = escapeHtml(params.fromName || "there");
  const safeEmail = escapeHtml(params.fromEmail);
  const safeRoute = escapeHtml(params.route);
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br />");
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
      <p style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin: 0 0 24px;">CreatorOS &middot; In-app feedback</p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 16px;">
        From <strong>${safeName}</strong> (${safeEmail}), sent from <code>${safeRoute}</code>.
      </p>
      <div style="font-size: 14px; line-height: 1.6; color: #111827; background: #f3f4f6; border-radius: 8px; padding: 16px; white-space: pre-wrap;">
        ${safeMessage}
      </div>
    </div>
  `;
}

/**
 * Sends an in-app feedback/bug-report submission to the support inbox via
 * the same Resend REST call every other transactional email in this file
 * uses. No new provider, no new env var -- reuses RESEND_API_KEY.
 */
export async function sendFeedbackEmail(params: {
  fromName: string;
  fromEmail: string;
  route: string;
  message: string;
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const supportAddress = process.env["SUPPORT_EMAIL"] || "edev351@gmail.com";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: supportAddress,
      reply_to: params.fromEmail,
      subject: `CreatorOS feedback from ${params.fromName}`,
      html: buildFeedbackEmailHtml(params),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }
}

export async function sendChangeEmailVerification(params: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "Confirm your new CreatorOS email address",
      html: buildChangeEmailVerificationHtml({ name: params.name, url: params.url }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }
}
