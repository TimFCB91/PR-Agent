/**
 * Build a one-click "search the mailbox" URL for a media contact, so the team
 * can jump straight to the relevant thread instead of searching by hand.
 * No mailbox integration — just a deep link into Gmail/Outlook web search.
 */
export function mailboxSearchUrl(opts: {
  email?: string | null;
  subject?: string | null;
  channel?: string | null;
}): string | null {
  const email = opts.email?.trim();
  if (!email) return null;
  const query = [email, opts.subject?.trim()].filter(Boolean).join(" ");
  const enc = encodeURIComponent(query);
  if (opts.channel === "OUTLOOK") {
    return `https://outlook.office.com/mail/search/?q=${enc}`;
  }
  // Default: Gmail web search.
  return `https://mail.google.com/mail/u/0/#search/${enc}`;
}
