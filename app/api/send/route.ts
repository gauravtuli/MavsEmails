import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import Handlebars from 'handlebars';

export const dynamic = 'force-dynamic'; // ensure serverless execution
export const maxDuration = 300; // up to 5 minutes for larger batches

function encodeSSE(obj: any) {
  return JSON.stringify(obj) + '\n';
}

function compileSafe(tpl: string, ctx: Record<string, any>) {
  try {
    const compiled = Handlebars.compile(tpl, { noEscape: false });
    return compiled(ctx);
  } catch (e) {
    return tpl;
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const form = await req.formData();

    const fromEmail = String(form.get('fromEmail') || '').trim();
    const appPassword = String(form.get('appPassword') || '').trim();
    const fromName = String(form.get('fromName') || '').trim();
    const replyTo = String(form.get('replyTo') || '').trim();

    const subjectTpl = String(form.get('subjectTpl') || '');
    const bodyTpl = String(form.get('bodyTpl') || '');
    const isHtml = String(form.get('isHtml') || 'false') === 'true';
    const emailColumn = String(form.get('emailColumn') || '').trim();

    const throttleMs = parseInt(String(form.get('throttleMs') || '1000')); // default 1s
    const dryRun = String(form.get('dryRun') || 'true') === 'true';

    const contactsFile = form.get('contacts') as File | null;
    const attachment = form.get('attachment') as File | null;

    if (!fromEmail || !appPassword) {
      return new Response('Missing Gmail email or App Password.', { status: 400 });
    }
    if (!contactsFile) {
      return new Response('Contacts file is required.', { status: 400 });
    }
    if (!emailColumn) {
      return new Response('Email column is required.', { status: 400 });
    }

    const contactsBuf = Buffer.from(await contactsFile.arrayBuffer());
    const wb = contactsFile.name.toLowerCase().endsWith('.csv')
      ? XLSX.read(contactsBuf.toString('utf8'), { type: 'string' })
      : XLSX.read(contactsBuf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Prepare transport for Gmail SMTP using App Password
    // NOTE: Do NOT log credentials.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: fromEmail,
        pass: appPassword,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 1000,
    });

    // Preload attachment if any
    let nmAttachment: any[] | undefined = undefined;
    if (attachment) {
      const content = Buffer.from(await attachment.arrayBuffer());
      nmAttachment = [{ filename: attachment.name, content }];
    }

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const send = (obj: any) => controller.enqueue(encoder.encode(encodeSSE(obj)));

        send({ type: 'log', message: `Loaded ${rows.length} contacts.` });
        send({ type: 'log', message: `Dry run: ${dryRun}. HTML: ${isHtml}. Throttle: ${throttleMs}ms` });

        let sent = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const to = String(row[emailColumn] || '').trim();
          if (!to) {
            send({ type: 'log', message: `Row ${i + 1}: skipped (missing email).` });
            continue;
          }

          const subject = compileSafe(subjectTpl, row);
          const body = compileSafe(bodyTpl, row);

          try {
            if (!dryRun) {
              await transporter.sendMail({
                from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
                to,
                subject,
                [isHtml ? 'html' : 'text']: body,
                replyTo: replyTo || undefined,
                attachments: nmAttachment,
              });
            }
            sent += 1;
            send({ type: 'log', message: `Row ${i + 1}: ${dryRun ? 'previewed' : 'sent'} → ${to}` });
            send({ type: 'progress', sent });
          } catch (err: any) {
            send({ type: 'error', message: `Row ${i + 1}: failed for ${to} — ${err?.message || String(err)}` });
          }

          // Throttle between sends
          if (throttleMs > 0) {
            await new Promise((r) => setTimeout(r, throttleMs));
          }
        }

        send({ type: 'log', message: `Done. Processed ${rows.length} row(s).` });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: any) {
    return new Response(`Server error: ${e?.message || String(e)}`, { status: 500 });
  }
}