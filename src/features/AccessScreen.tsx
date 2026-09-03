import { FormEvent, useState } from 'react';
import { clientConfig } from '../lib/config';
import { PilotApiError, requestPilotMagicLink } from '../lib/pilot-data';
import { Icon } from '../components/Icon';

interface AccessScreenProps {
  onUseLocalDemo: () => void;
  initialError?: string | null;
}

export function AccessScreen({ onUseLocalDemo, initialError = null }: AccessScreenProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setState('sending');
    try {
      await requestPilotMagicLink(email);
      setState('sent');
    } catch (requestError) {
      setState('idle');
      setError(requestError instanceof PilotApiError ? requestError.message : 'Der E-Mail-Link konnte nicht versendet werden.');
    }
  };

  return (
    <main className="access-screen">
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-mark"><Icon name="sparkle" size={24} /></div>
        <h1 id="access-title">Creator Studio</h1>
        <p className="access-lead">Ein privater Creator Copilot für Texte, Skripte, SRT-Dateien und die freiwillige Analyse des eigenen YouTube-Kanals.</p>

        {clientConfig.isSupabaseConfigured ? (
          state === 'sent' ? (
            <div className="access-success" role="status">
              <Icon name="check" size={20} />
              <div><strong>E-Mail-Link versendet</strong><span>Öffne den Link in deinem Postfach. Danach kommst du direkt zurück ins Studio.</span></div>
            </div>
          ) : (
            <form className="access-form" onSubmit={requestLink}>
              <label htmlFor="pilot-email">Deine freigeschaltete E-Mail-Adresse</label>
              <input id="pilot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@beispiel.de" required autoComplete="email" />
              {(error || initialError) && <p className="form-error" role="alert">{error || initialError}</p>}
              <button className="primary-button" type="submit" disabled={state === 'sending'}>
                <Icon name="mail" /> {state === 'sending' ? 'Link wird versendet …' : 'E-Mail-Link anfordern'}
              </button>
            </form>
          )
        ) : (
          <div className="access-setup" role="status">
            <Icon name="warning" size={22} />
            <div><strong>Pilot noch nicht aktiviert</strong><span>Supabase-Zugangsdaten fehlen. Bis Tim sie sicher in Vercel hinterlegt, werden keine Logins, Quellen oder KI-Aufrufe ausgeführt.</span></div>
          </div>
        )}

        <div className="access-notes">
          <p><Icon name="check" size={16} /> Nur eingeladene Testpersonen erhalten Zugriff.</p>
          <p><Icon name="check" size={16} /> Nur eigene Inhalte und eigene YouTube-Daten.</p>
          <p><Icon name="check" size={16} /> Bild, Stimme und Video sind noch nicht aktiviert.</p>
        </div>

        {!clientConfig.isSupabaseConfigured && (
          <button className="access-demo-link" type="button" onClick={onUseLocalDemo}>Lokalen Musterablauf ansehen</button>
        )}
      </section>
    </main>
  );
}
