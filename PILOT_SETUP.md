# Creator Studio – einfache Produktions-Checkliste

Diese Anleitung ist für Tim. Arbeite von oben nach unten. Erst wenn ein Schritt abgehakt ist, gehe weiter.

## 0. Was ist schon fertig?

Der Code enthält bereits:

- Login-Sperre für eingeladene Personen
- Datenbank-Migration mit Besitzrechten und Löschkaskaden
- Text-, Skript- und SRT-Eingabe mit Größenlimits
- die KI-Route `POST /api/analysis`
- YouTube-OAuth mit nur lesenden Berechtigungen
- verschlüsselte Speicherung von YouTube-Tokens
- Tages- und Kurzzeitlimit für Analysen
- editierbares Textpaket, JSON-Export und vollständige Datenlöschung

Was fehlt, sind nur die echten Konten und Geheimnisse. Solange sie fehlen, bleibt die App ehrlich deaktiviert.

## 1. Reihenfolge und Verantwortliche

| Aufgabe | Wer | Warum |
| --- | --- | --- |
| Supabase-Projekt, Datenbank und eingeladene E-Mails | Tim | Login und persönliche Daten brauchen ein echtes Zuhause. |
| Vercel-Umgebungsvariablen und AI-Gateway-Budget | Tim | Geheimnisse und Kosten dürfen nur der Eigentümer verwalten. |
| Google-OAuth-Projekt und Testnutzer | Tim | Der YouTube-Zugriff muss zu deinem Google-Projekt gehören. |
| Bedienung komplett testen | Kumpel | So fallen unklare Schritte vor dem Pilot auf. |
| Code, Datenbankstruktur und Checks | bereits umgesetzt | Diese Dateien liegen im Repository. |

## 2. Supabase einrichten

1. Melde dich bei Supabase an und erstelle ein **neues, separates Projekt** für Creator Studio.
2. Wähle eine EU-Region, zum Beispiel Frankfurt, wenn sie verfügbar ist.
3. Warte, bis das Projekt vollständig bereit ist.
4. Öffne im Projekt den **SQL Editor**.
5. Öffne im Repository die Datei `supabase/migrations/20260903103131_create_creator_pilot_schema.sql`.
6. Kopiere den gesamten Inhalt in den SQL Editor und klicke auf **Run**.
7. Prüfe unter **Table Editor**, dass diese Tabellen existieren:
   - `pilot_invites`
   - `profiles`
   - `projects`
   - `sources`
   - `youtube_snapshots`
   - `analysis_runs`
   - `usage_events`
   - `oauth_connections_private`
   - `youtube_oauth_states_private`
8. Öffne **Authentication → URL Configuration**.
9. Trage als Site URL ein:
   `https://creator-studio-mvp-coral.vercel.app`
10. Trage zusätzlich als erlaubte Redirect URL ein:
    `http://localhost:3000`
11. Unter **Authentication → Providers → Email** muss E-Mail-Login aktiviert bleiben.
12. Erstelle für jeden Pilotnutzer zunächst einen Auth-Nutzer unter **Authentication → Users**. Der Nutzer muss existieren, weil die App aus Sicherheitsgründen keine unbekannten Accounts selbst anlegt.
13. Füge danach jede Pilot-E-Mail in die Einladungsliste ein. Ersetze die Beispieladresse durch die echte Adresse:

```sql
insert into public.pilot_invites (email, label, is_active)
values ('creator@example.com', 'Pilot 1', true)
on conflict (email) do update set is_active = true;
```

14. Wiederhole Schritt 12 und 13 für maximal zwei weitere Testpersonen.

Wichtig: Die Migration aktiviert Row Level Security. Ändere diese Regeln nicht im Dashboard „auf gut Glück“. Die Tabellen für Tokens und Einladungen haben absichtlich keine Browser-Rechte.

## 3. Supabase-Werte kopieren

1. Öffne **Project Settings → API**.
2. Kopiere die Project URL.
3. Kopiere den **Publishable Key** (oder den aktuellen öffentlichen anon/publishable Key, je nach Supabase-Oberfläche).
4. Kopiere den **Service Role Key**.
5. Den Service Role Key niemals in eine Datei im Repository, nie in WhatsApp und nie in den Browser einfügen.

## 4. Vercel-Projekt und Variablen einrichten

1. Öffne das Vercel-Projekt `creator-studio-mvp`.
2. Gehe zu **Settings → Environment Variables**.
3. Lege diese Werte für **Production** an:

| Name | Wert | Darf der Browser sehen? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL | Ja |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | öffentlicher Supabase Key | Ja |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | Nein |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Nein |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Nein |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://creator-studio-mvp-coral.vercel.app/api/youtube/callback` | Nein |
| `YOUTUBE_TOKEN_ENCRYPTION_KEY` | neuer 32-Byte-Schlüssel | Nein |
| `APP_BASE_URL` | `https://creator-studio-mvp-coral.vercel.app` | Nein |
| `EXTERNAL_SERVICES_ENABLED` | `true` | Nein |

4. Für `YOUTUBE_TOKEN_ENCRYPTION_KEY` öffne auf deinem Mac ein Terminal und führe genau dies aus:

```bash
openssl rand -base64 32
```

Kopiere die gesamte Ausgabe einmal in Vercel. Bewahre sie in einem Passwortmanager auf. Wenn sie verloren geht, können alte YouTube-Tokens nicht mehr entschlüsselt werden.

5. Lege für **Preview** nur die Browserwerte an, wenn die Vorschau die Login-Sperre anzeigen soll. Setze außerdem:

```text
EXTERNAL_SERVICES_ENABLED=false
```

Eine Preview darf weder KI noch YouTube starten. Das ist absichtlich so.

6. Lege **keinen** `OPENAI_API_KEY` und keinen direkten Provider-Key an.
7. Lege **keinen** `VERCEL_OIDC_TOKEN` manuell an. Vercel stellt ihn für AI Gateway selbst bereit.

## 5. AI Gateway einstellen

1. Öffne im Vercel-Projekt den Bereich **AI Gateway**.
2. Aktiviere die Modellnutzung für `openai/gpt-5.6-luna`.
3. Setze das monatliche Projektbudget auf **8 USD**.
4. Prüfe, dass Budget-Überschreitungen neue Anfragen stoppen. Die App zeigt dann: „Das KI-Budget für diesen Testmonat ist erreicht.“
5. Die App begrenzt zusätzlich pro eingeladener Person auf zwei Analysen je 15 Minuten und fünf Analysen pro Tag.

Die Kosten entstehen nur beim bewussten Start einer Textanalyse. Bild, Stimme und MP4 sind nicht verbunden und verursachen keine Provider-Kosten.

## 6. Google / YouTube einrichten

1. Öffne die Google Cloud Console und erstelle ein neues Projekt, zum Beispiel `Creator Studio Pilot`.
2. Unter **APIs & Services → Library** aktiviere nur:
   - YouTube Data API v3
   - YouTube Analytics API
3. Richte den OAuth Consent Screen als **External / Testing** ein.
4. Trage die Pilot-E-Mail-Adressen als Google-Testnutzer ein.
5. Erstelle unter **Credentials → Create Credentials → OAuth client ID** einen Web Application Client.
6. Trage bei **Authorized redirect URI** exakt ein:

```text
https://creator-studio-mvp-coral.vercel.app/api/youtube/callback
```

7. Für lokale Entwicklung ergänze zusätzlich:

```text
http://localhost:3000/api/youtube/callback
```

8. Übernimm Client ID und Client Secret in die gleichnamigen Vercel-Variablen.

Die App fragt nur diese Berechtigungen an:

- eigenen YouTube-Kanal lesen
- eigene YouTube-Analytics lesen

Sie kann nicht hochladen, löschen, veröffentlichen oder Kommentare schreiben. Sie lädt keine Videos herunter und beobachtet keine fremden Kanäle.

## 7. Produktion veröffentlichen

1. Prüfe lokal zuerst:

```bash
npm run typecheck
npm test
npm run build
```

2. Push den geprüften Stand nach `main`.
3. Die bestehende GitHub–Vercel-Verbindung veröffentlicht `main` automatisch.
4. Öffne danach:

```text
https://creator-studio-mvp-coral.vercel.app/api/health
```

Erwartung in Production:

```json
{"status":"ok","externalServicesEnabled":true,"version":"pilot-1"}
```

Für Preview muss derselbe Wert bei `externalServicesEnabled` **false** sein.

Für einen vollständigen lokalen Test statt der reinen Vite-Oberfläche verwende anschließend `npm run dev:full`. Das startet Vercel Functions und die App auf Port 3000, passend zur lokalen Google-Callback-Adresse. In `.env.local` muss dafür `APP_BASE_URL=http://localhost:3000` stehen und `EXTERNAL_SERVICES_ENABLED=false` bleiben, bis du bewusst einen kontrollierten lokalen Integrationstest machst.

## 8. Erst den sicheren Live-Test machen

Teste mit nur einem Pilotnutzer diesen Ablauf:

1. Nicht eingeladene E-Mail eingeben → Zugriff wird abgelehnt.
2. Eingeladene E-Mail eingeben → E-Mail-Link kommt an.
3. Über den Link anmelden.
4. Profil mit Zielgruppe, Ton und Ziel speichern.
5. Ein 30-Sekunden-Projekt anlegen und Rechte bestätigen.
6. Eine kurze `.txt`, `.md` oder `.srt`-Quelle einfügen.
7. Analyse starten.
8. Prüfen, ob drei Ideen, fünf Hooks, ein Skript, sechs Szenen und Prüfpunkte erscheinen.
9. Einen Hook und eine Szene bearbeiten und den Entwurf speichern.
10. JSON exportieren und die Datei öffnen.
11. Projekt löschen und prüfen, dass es weg ist.
12. Danach einmal freiwillig YouTube verbinden, synchronisieren und wieder trennen.

Erst wenn dieser Ablauf ohne technische Hilfe klappt, die übrigen Pilot-E-Mails freischalten.

## 9. Was bewusst nicht zum Pilot gehört

- keine öffentliche Registrierung
- keine Zahlungen oder Abos
- kein Rohvideo, Roh-Audio, Bild- oder Voice-Upload
- kein MP4-Rendering
- keine Konkurrenzkanäle
- keine automatischen Uploads
- kein Modell-Fine-Tuning

## 10. Wenn etwas nicht funktioniert

| Beobachtung | Erst prüfen |
| --- | --- |
| „Pilot noch nicht aktiviert“ | `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel |
| E-Mail-Link kommt nicht | Auth-Nutzer existiert, E-Mail-Adresse in `pilot_invites`, Supabase Email Provider aktiv |
| „Adresse noch nicht freigeschaltet“ | E-Mail ist in `pilot_invites` klein geschrieben und `is_active=true` |
| Analyse startet nicht | `EXTERNAL_SERVICES_ENABLED=true`, Service Role Key, AI Gateway Budget/Modell |
| Budget-Meldung | AI Gateway-Budget ist tatsächlich erreicht; nicht mit neuen Keys umgehen |
| YouTube verbindet nicht | Redirect URL, Google-Testnutzer, Client ID/Secret, Encryption Key |
| Preview ruft keine KI auf | Richtig: dort muss `EXTERNAL_SERVICES_ENABLED=false` stehen |
