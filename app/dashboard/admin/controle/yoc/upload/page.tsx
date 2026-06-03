'use client';

import { useState } from 'react';

export default function YocUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [eventName, setEventName] = useState('YOC');
  const [eventDate, setEventDate] = useState('');
  const [locatie, setLocatie] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return setMsg('Kies eerst een Excel bestand.');

    setBusy(true);
    setMsg('Upload bezig...');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('event_name', eventName);
      fd.append('event_datum', eventDate);
      fd.append('locatie', locatie);

      const res = await fetch('/api/yoc/upload', { method: 'POST', body: fd });
      const json = await res.json();

      setBusy(false);

      if (!res.ok || !json.ok) {
        return setMsg(`Upload mislukt: ${json.error || res.statusText || 'Onbekende fout'}`);
      }

      // De upload-route kan verschillende namen teruggeven. Pak de eerste echte UUID/id.
      const yocEventId = json.yoc_event_id || json.yocId || json.event_id || json.id;

      if (!yocEventId) {
        console.error('[YOC upload] Geen YOC-id ontvangen uit /api/yoc/upload:', json);
        return setMsg(
          `Upload gelukt, maar geen YOC-id ontvangen van de upload-route. Response: ${JSON.stringify(json)}`
        );
      }

      window.location.href = `/dashboard/admin/controle/yoc/${yocEventId}`;
    } catch (err: any) {
      setBusy(false);
      setMsg(`Upload fout: ${err?.message || 'Onbekende fout'}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.yoc-silver-btn, .yoc-silver-btn *{color:#000!important;}`}</style>

      <section className="mx-auto max-w-5xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Controle
              </p>
              <h1 className="text-2xl font-black uppercase">YOC deelnemerscontrole</h1>
              <p className="mt-1 text-sm text-zinc-300">
                Upload hier de YOC deelnemerslijst. Dit is een aparte controleflow zonder matchmaking.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">1</b>
            <p className="text-xs uppercase text-zinc-400">Excel uploaden</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">2</b>
            <p className="text-xs uppercase text-zinc-400">FightPassport check</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">3</b>
            <p className="text-xs uppercase text-zinc-400">Controle draaien</p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-zinc-300">Event naam</span>
              <input
                className="mt-1 w-full border border-zinc-600 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#ff4d00]"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-zinc-300">Eventdatum</span>
              <input
                type="date"
                className="mt-1 w-full border border-zinc-600 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#ff4d00]"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-zinc-300">Locatie</span>
              <input
                className="mt-1 w-full border border-zinc-600 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-[#ff4d00]"
                value={locatie}
                onChange={(e) => setLocatie(e.target.value)}
                placeholder="Plaats / locatie"
              />
            </label>
          </div>

          <div className="mt-5 border border-dashed border-[#ff4d00]/70 bg-[#1c1c1c] p-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#ff4d00]">Deelnemersbestand</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full cursor-pointer border border-zinc-600 bg-white text-sm font-semibold text-black file:mr-4 file:border-0 file:bg-[#ff4d00] file:px-4 file:py-2 file:font-black file:text-black"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <p className="mt-2 text-xs text-zinc-300">Gekozen bestand: {file.name}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              disabled={busy}
              onClick={upload}
              className="border border-[#ff4d00] bg-[#ff4d00] px-5 py-3 text-sm font-black uppercase !text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Upload bezig...' : 'Upload YOC deelnemers'}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = '/dashboard/admin/controle/yoc'}
              className="yoc-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-5 py-3 text-sm font-black uppercase !text-black"
            >
              Terug naar YOC overzicht
            </button>
          </div>

          {msg && (
            <p className="mt-4 border border-zinc-700 bg-[#1c1c1c] p-3 text-sm text-zinc-200">
              {msg}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
