# Creator Studio – privater Pilot

Creator Studio hilft eingeladenen Creatorn dabei, aus eigenen Texten, Skripten und SRT-Untertiteln ein editierbares Kurzvideo-Textpaket zu erstellen. Es ist bewusst kein automatischer Content-Fabrik- oder Video-Renderer.

Die App ist als React/Vite-Frontend mit Supabase und Vercel Functions aufgebaut:

- Passwortloser E-Mail-Link für freigeschaltete Pilotnutzer
- Projekte für 15, 30, 45 oder 60 Sekunden
- Maximal drei eigene `.txt`, `.md` oder `.srt`-Quellen pro Projekt
- Echte, strukturierte Textanalyse über Vercel AI Gateway
- Drei Ideen, fünf Hooks, ein Skript, sechs Szenen und eine Prüfliste
- Optional: lesende Verbindung zum eigenen YouTube-Kanal
- Bearbeiten, JSON exportieren und vollständig löschen

Bild, Stimme und MP4-Video sind absichtlich sichtbar vorbereitet, aber deaktiviert. Sie erzeugen keine versteckten Kosten.

## Live-Adresse

[creator-studio-mvp-coral.vercel.app](https://creator-studio-mvp-coral.vercel.app)

Ohne hinterlegte Produktionszugänge zeigt die Adresse nur die sichere Zugangssperre bzw. eine klar gekennzeichnete lokale Musteransicht. Sie ruft keine KI und kein YouTube auf.

## Was vor dem echten Pilot noch erledigt werden muss

Die komplette, einfache Schritt-für-Schritt-Anleitung liegt in [PILOT_SETUP.md](PILOT_SETUP.md).

Kurz gesagt: Tim richtet Supabase, Vercel AI Gateway und Google OAuth ein und trägt die Secrets nur in Vercel ein. Danach können die 1–3 Pilot-E-Mail-Adressen freigeschaltet werden.

## Lokal starten

```bash
npm install
npm run dev
```

Das startet nur die visuelle Oberfläche auf Port 5173. Für Login, KI und YouTube lokal zuerst `.env.example` nach `.env.local` kopieren, die Werte eintragen und dann `npm run dev:full` verwenden. Dieser vollständige lokale Server läuft auf Port 3000. Niemals `.env.local` committen.

## Prüfen

```bash
npm run typecheck
npm test
npm run build
```

## Sicherheitsgrundsätze

- Keine Schlüssel, Tokens oder Pilottexte gehören in GitHub, Chat oder Messenger.
- Der Browser erhält nur die Supabase-Projektadresse und den öffentlichen Publishable Key.
- Die Service-Role, Google-Secret und YouTube-Tokens bleiben ausschließlich auf dem Server.
- Row Level Security sorgt dafür, dass ein Nutzer nur seine eigenen Daten sieht.
- Nicht eingeladene E-Mail-Adressen erhalten keinen Pilotzugang.
- Das Modell liefert Vorschläge, keine Fakten- oder Erfolgs-Garantie.
