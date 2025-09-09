"use client";
import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

type Row = Record<string, string | number | boolean | null>;

type PreviewItem = {
  index: number;
  email: string;
  subject: string;
  body: string;
};

export default function HomePage() {
  const [fromEmail, setFromEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const [subjectTpl, setSubjectTpl] = useState('Hello {{FirstName}}');
  const [bodyTpl, setBodyTpl] = useState('Hi {{FirstName}},\n\nThis is a test from {{Company}}.');
  const [isHtml, setIsHtml] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [emailColumn, setEmailColumn] = useState<string>('');

  const [attachment, setAttachment] = useState<File | null>(null);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [throttleMs, setThrottleMs] = useState(1000);

  const fileInput = useRef<HTMLInputElement | null>(null);

  function log(msg: string) {
    setLogs((prev) => [msg, ...prev].slice(0, 500));
  }

  async function handleContactsUpload(file: File) {
    const buf = await file.arrayBuffer();
    let wb: XLSX.WorkBook;
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(new Uint8Array(buf));
      wb = XLSX.read(text, { type: 'string' });
    } else {
      wb = XLSX.read(buf);
    }
    const first = wb.SheetNames[0];
    const data: Row[] = XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: '' });
    setRows(data);
    const cols = Object.keys(data[0] || {});
    setColumns(cols);
    const emailGuess = cols.find((c) => c.toLowerCase() === 'email' || c.toLowerCase() === 'e-mail') || '';
    setEmailColumn(emailGuess);
    log(`Loaded ${data.length} rows with columns: ${cols.join(', ')}`);
  }

  const previews: PreviewItem[] = useMemo(() => {
    const compile = (tpl: string, row: Row) =>
      tpl.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => String(row[key] ?? ''));
    return rows.slice(0, 5).map((row, i) => ({
      index: i,
      email: String(row[emailColumn] ?? ''),
      subject: compile(subjectTpl, row),
      body: compile(bodyTpl, row),
    }));
  }, [rows, emailColumn, subjectTpl, bodyTpl]);

  async function onSubmit() {
    if (!fromEmail || !appPassword) {
      alert('Please enter your Gmail address and App Password.');
      return;
    }
    if (!rows.length) {
      alert('Please upload a contacts file (.xlsx or .csv).');
      return;
    }
    if (!emailColumn) {
      alert('Please choose which column contains recipient emails.');
      return;
    }

    setSending(true);
    setProgress(0);
    setLogs([]);

    const form = new FormData();
    form.set('fromEmail', fromEmail.trim());
    form.set('appPassword', appPassword.trim());
    form.set('fromName', fromName.trim());
    form.set('replyTo', replyTo.trim());
    form.set('subjectTpl', subjectTpl);
    form.set('bodyTpl', bodyTpl);
    form.set('isHtml', String(isHtml));
    form.set('emailColumn', emailColumn);
    form.set('throttleMs', String(throttleMs));
    form.set('dryRun', String(dryRun));

    // Include the original uploaded file so server can render with Handlebars for ALL rows
    // Rebuild a CSV on the fly to avoid sending huge JSON.
    const header = columns.join(',');
    const csvBody = rows
      .map((r) => columns.map((c) => String(r[c] ?? '').replaceAll('"', '""')).map((v) => `"${v}"`).join(','))
      .join('\n');
    const csvFull = header + '\n' + csvBody;
    form.set('contacts', new File([csvFull], 'contacts.csv', { type: 'text/csv' }));

    if (attachment) form.set('attachment', attachment);

    try {
      const res = await fetch('/api/send', { method: 'POST', body: form });
      if (!res.body) {
        const text = await res.text();
        throw new Error(text || 'No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let total = rows.length;
      let sent = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        chunk.split('\n').forEach((line) => {
          if (!line.trim()) return;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'log') log(evt.message);
            if (evt.type === 'progress') {
              sent = evt.sent;
              setProgress(Math.round((sent / total) * 100));
            }
            if (evt.type === 'error') log(`ERROR: ${evt.message}`);
          } catch {}
        });
      }

      log('Done.');
    } catch (err: any) {
      log('ERROR: ' + (err?.message || String(err)));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bulk Gmail Sender (No OAuth)</h1>
      <p className="text-sm text-gray-700">
        Uses Gmail SMTP with an <strong>App Password</strong>. We do <em>not</em> store your credentials.
      </p>

      <section className="space-y-3">
        <h2 className="font-semibold">1) Your Gmail Credentials</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="Your Gmail address" value={fromEmail} onChange={e=>setFromEmail(e.target.value)} />
          <input className="border p-2 rounded" placeholder="16-char App Password" value={appPassword} onChange={e=>setAppPassword(e.target.value)} />
          <input className="border p-2 rounded" placeholder="From name (optional)" value={fromName} onChange={e=>setFromName(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Reply-To (optional)" value={replyTo} onChange={e=>setReplyTo(e.target.value)} />
        </div>
        <p className="text-xs text-gray-600">Create one at Google Account → Security → App passwords. Choose App: Mail.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">2) Contacts File (.xlsx or .csv)</h2>
        <input type="file" accept=".xlsx,.csv" ref={fileInput} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleContactsUpload(f); }} />
        {columns.length>0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm">Email column
              <select className="border p-2 rounded w-full" value={emailColumn} onChange={(e)=>setEmailColumn(e.target.value)}>
                <option value="">Select…</option>
                {columns.map((c)=> <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Throttle (ms)
              <input type="number" className="border p-2 rounded w-full" value={throttleMs} onChange={(e)=>setThrottleMs(parseInt(e.target.value)||0)} />
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={dryRun} onChange={(e)=>setDryRun(e.target.checked)} /> Dry run (no emails sent)
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">3) Compose</h2>
        <input className="border p-2 rounded w-full" placeholder="Subject (supports {{Column}})" value={subjectTpl} onChange={(e)=>setSubjectTpl(e.target.value)} />
        <textarea className="border p-2 rounded w-full h-40" placeholder="Body (supports {{Column}})" value={bodyTpl} onChange={(e)=>setBodyTpl(e.target.value)} />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={isHtml} onChange={(e)=>setIsHtml(e.target.checked)} /> Send as HTML
        </label>
        <div>
          <label className="text-sm">Attachment (optional): </label>
          <input type="file" onChange={(e)=>setAttachment(e.target.files?.[0]||null)} />
        </div>
      </section>

      {previews.length>0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Preview (first 5)</h2>
          <ul className="text-sm border rounded divide-y">
            {previews.map((p)=> (
              <li key={p.index} className="p-2">
                <div><strong>To:</strong> {p.email || <em>(missing email)</em>}</div>
                <div><strong>Subject:</strong> {p.subject}</div>
                <div className="whitespace-pre-wrap"><strong>Body:</strong> {p.body}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <button disabled={sending} onClick={onSubmit} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {sending ? 'Working…' : (dryRun ? 'Run Dry Preview' : 'Send Emails')}
        </button>
        <div className="text-sm">Progress: {progress}%</div>
        <div className="text-xs border rounded h-40 overflow-auto p-2 bg-gray-50">
          {logs.map((l, i)=> <div key={i}>{l}</div>)}
        </div>
      </section>
    </main>
  );
}