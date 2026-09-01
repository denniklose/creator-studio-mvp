import { useState } from 'react';
import type { CreatorProfile } from '../types';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

interface ProfileDialogProps {
  profile: CreatorProfile;
  onSave: (profile: CreatorProfile) => void;
  onClose: () => void;
}

export function ProfileDialog({ profile, onSave, onClose }: ProfileDialogProps) {
  const [draft, setDraft] = useState(profile);
  return (
    <Modal title="Creator-Profil" onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="button" onClick={() => { onSave(draft); onClose(); }}>Profil speichern</button></>}>
      <p className="dialog-intro">Diese Angaben steuern Ton, Empfehlungen und neue Inhaltsideen. Sie bleiben in diesem MVP lokal in deinem Browser.</p>
      <div className="form-grid">
        <label>Projektname<input value={draft.projectName} onChange={(event) => setDraft({ ...draft, projectName: event.target.value })} /></label>
        <label>Nische<input value={draft.niche} onChange={(event) => setDraft({ ...draft, niche: event.target.value })} /></label>
        <label>Zielgruppe<input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label>
        <label>Tonalität<input value={draft.tone} onChange={(event) => setDraft({ ...draft, tone: event.target.value })} /></label>
        <label className="full-field">Ziel<textarea value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /></label>
      </div>
    </Modal>
  );
}

export function ConnectionsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Verbindungen" onClose={onClose} footer={<button className="primary-button" type="button" onClick={onClose}>Verstanden</button>}>
      <p className="dialog-intro">Hier wird nichts vorgetäuscht: Der aktuelle Stand verwendet lokale Musterdaten. Zugangsdaten gehören später verschlüsselt auf einen Server und niemals offen in den Browser.</p>
      <div className="connection-list">
        <div><span className="provider-mark">YT</span><span><strong>YouTube</strong><small>OAuth und Analytics API noch nicht konfiguriert</small></span><span className="connection-chip sample">Muster</span></div>
        <div><span className="provider-mark">OA</span><span><strong>OpenAI</strong><small>Analyse, Transkription und Bilder</small></span><span className="connection-chip">Nicht verbunden</span></div>
        <div><span className="provider-mark">G</span><span><strong>Google Video</strong><small>Videoerzeugung</small></span><span className="connection-chip">Nicht verbunden</span></div>
        <div><span className="provider-mark">11</span><span><strong>ElevenLabs</strong><small>Optionale feste Stimme</small></span><span className="connection-chip">Optional</span></div>
      </div>
    </Modal>
  );
}

export function CostDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Kosten vor der Generierung" onClose={onClose} footer={<button className="primary-button" type="button" onClick={onClose}>Schließen</button>}>
      <div className="cost-state"><Icon name="coins" size={28} /><div><strong>Aktueller Prototyp: 0,00 €</strong><p>Die Vorschau verwendet ausschließlich lokale Bilder und löst keinen externen AI-Aufruf aus.</p></div></div>
      <div className="cost-table">
        <div><span>Analyse &amp; Skript</span><strong>Nicht verbunden</strong></div>
        <div><span>Bilder</span><strong>Lokale Musterszenen</strong></div>
        <div><span>Stimme</span><strong>Nicht verbunden</strong></div>
        <div><span>Video</span><strong>Nicht verbunden</strong></div>
      </div>
      <p className="dialog-intro">Vor einem späteren bezahlten Auftrag zeigt die Anwendung Anbieter, Modell und geschätzte Kosten und verlangt eine ausdrückliche Bestätigung.</p>
    </Modal>
  );
}
