const fs = require('fs/promises');
const path = require('path');
const { google } = require('googleapis');
const { authorize } = require('./auth');

const OUTPUT_PATH = path.join(__dirname, '..', 'homework-radar', 'assignments.json');
const GMAIL_QUERY = 'from:classroom.google.com newer_than:45d';

function decodeBase64Url(data) {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function extractPlainText(payload) {
  if (!payload) return '';
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts || []) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  for (const part of payload.parts || []) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, ' ');
    }
  }
  for (const part of payload.parts || []) {
    const nested = extractPlainText(part);
    if (nested) return nested;
  }
  return '';
}

function parseTitle(subject) {
  const match = subject.match(/posted (?:a )?new assignment:\s*(.+)/i) || subject.match(/new assignment:\s*(.+)/i);
  return match ? match[1].trim() : subject.trim();
}

function parseClassName(subject, bodyText) {
  const subjectMatch = subject.match(/for\s+([A-Za-z0-9 ]+)$/i);
  if (subjectMatch) return subjectMatch[1].trim();
  const bodyMatch = bodyText.match(/Class:\s*([A-Za-z0-9 ]+)/i);
  return bodyMatch ? bodyMatch[1].trim() : 'Unknown';
}

function parseDueDate(bodyText) {
  const match = bodyText.match(/Due\s+([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?)/i);
  if (!match) return null;
  const raw = match[1].includes(',') ? match[1] : `${match[1]}, ${new Date().getFullYear()}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseSender(fromHeader) {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return (match ? match[1] : fromHeader).trim();
}

async function fetchAssignments() {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const { data: { messages = [] } } = await gmail.users.messages.list({
    userId: 'me',
    q: GMAIL_QUERY,
    maxResults: 100,
  });

  const assignments = [];

  for (const { id } of messages) {
    const { data: message } = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const headers = message.payload.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const bodyText = extractPlainText(message.payload) || message.snippet || '';

    const due = parseDueDate(bodyText);
    if (!due) continue; // skip emails we can't confidently date

    assignments.push({
      title: parseTitle(subject),
      className: parseClassName(subject, bodyText),
      due,
      source: `${parseSender(from)} / Google Classroom`,
      detail: message.snippet || '',
      url: `https://mail.google.com/mail/#all/${id}`,
    });
  }

  // Merge duplicate reminders for the same title + due date.
  const deduped = new Map();
  for (const assignment of assignments) {
    const key = `${assignment.title}|${assignment.due}`;
    if (!deduped.has(key)) deduped.set(key, assignment);
  }

  return [...deduped.values()].sort((a, b) => a.due.localeCompare(b.due));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const assignments = await fetchAssignments();

  if (dryRun) {
    console.log(JSON.stringify(assignments, null, 2));
    console.log(`\n${assignments.length} assignments parsed (dry run, not written).`);
    return;
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(assignments, null, 2));
  console.log(`Wrote ${assignments.length} assignments to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to fetch assignments:', err.message);
  process.exit(1);
});
