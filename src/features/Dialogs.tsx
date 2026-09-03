import { useState } from 'react';
import type { CreatorProfile } from '../types';
import type { YoutubeConnectionStatus } from '../lib/pilot-data';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

interface ProfileDialogProps {
  profile: CreatorProfile;
  onSave: (profile: CreatorProfile) => Promise<void> | void;
  onDeleteAccount?: () => Promise<void>;
  onClose: () => void;
}

export function ProfileDialog({ profile, onSave, onDeleteAccount, onClose }: ProfileDialogProps) {
  const [draft, setDraft] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(draft);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Das Profil konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!onDeleteAccount) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Die Daten konnten nicht gelöscht werden.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal title="Creator-Profil" onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="button" disabled={isSaving} onClick={save}>{isSaving ? 'Wird gespeichert …' : 'Profil speichern'}</button></>}>
      <p className="dialog-intro">Diese Angaben geben der Textanalyse Kontext. Sie sind nur in deinem eigenen Pilot-Konto sichtbar.</p>
      <div className="form-grid">
        <label>Projektname / Name<input value={draft.projectName} maxLength={80} onChange={(event) => setDraft({ ...draft, projectName: event.target.value })} /></label>
        <label>Nische<input value={draft.niche} maxLength={120} onChange={(event) => setDraft({ ...draft, niche: event.target.value })} /></label>
        <label>Zielgruppe<input value={draft.audience} maxLength={180} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label>
        <label>Tonalität<input value={draft.tone} maxLength={120} onChange={(event) => setDraft({ ...draft, tone: event.target.value })} /></label>
        <label className="full-field">Ziel<textarea value={draft.goal} maxLength={240} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {onDeleteAccount && <div className="danger-zone">
        <strong>Meine Daten vollständig löschen</strong>
        <p>Das entfernt dein Profil, alle Projekte, Quellen, KI-Ergebnisse und die gespeicherte YouTube-Verbindung dauerhaft.</p>
        {!showDeleteConfirm ? <button className="danger-button" type="button" onClick={() => setShowDeleteConfirm(true)}>Löschen vorbereiten</button> : <button className="danger-button" type="button" disabled={isDeleting} onClick={deleteAccount}>{isDeleting ? 'Daten werden gelöscht …' : 'Endgültig alles löschen'}</button>}
      </div>}
    </Modal>
  );
}

interface ConnectionsDialogProps {
  status: YoutubeConnectionStatus | null;
  hasProject: boolean;
  isBusy?: boolean;
  onConnect: () => void;
  onSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onClose: () => void;
}

export function ConnectionsDialog({ status, hasProject, isBusy = false, onConnect, onSync, onDisconnect, onClose }: ConnectionsDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'sync' | 'disconnect' | null>(null);
  const sync = async () => {
    setError(null);
    setAction('sync');
    try { await onSync(); } catch (syncError) { setError(syncError instanceof Error ? syncError.message : 'YouTube konnte nicht synchronisiert werden.'); } finally { setAction(null); }
  };
  const disconnect = async () => {
    setError(null);
    setAction('disconnect');
    try { await onDisconnect(); } catch (disconnectError) { setError(disconnectError instanceof Error ? disconnectError.message : 'YouTube konnte nicht getrennt werden.'); } finally { setAction(null); }
  };
  const subtitle = !hasProject
    ? 'Lege zuerst ein Projekt an.'
    : status?.connected
      ? `Verbunden${status.lastSyncedAt ? ` · zuletzt synchronisiert ${new Date(status.lastSyncedAt).toLocaleString('de-DE')}` : ''}`
      : 'Noch nicht verbunden';

  return (
    <Modal title="Verbindungen" onClose={onClose} footer={<button className="primary-button" type="button" onClick={onClose}>Schließen</button>}>
      <p className="dialog-intro">Creator Studio liest ausschließlich Daten deines eigenen Kanals. Es lädt keine Videos herunter, veröffentlicht nichts und schreibt keine Kommentare.</p>
      <div className="connection-list">
        <div><span className="provider-mark">YT</span><span><strong>YouTube</strong><small>{subtitle}</small></span>{status?.connected ? <span className="connection-actions"><button type="button" disabled={Boolean(action) || isBusy} onClick={sync}>{action === 'sync' ? 'Lädt …' : 'Synchronisieren'}</button><button type="button" disabled={Boolean(action) || isBusy} onClick={disconnect}>Trennen</button></span> : <button className="connection-chip action" type="button" disabled={!hasProject || isBusy} onClick={onConnect}>Eigenen Kanal verbinden</button>}</div>
        <div><span className="provider-mark">AI</span><span><strong>Textanalyse</strong><small>Vercel AI Gateway · nur bei bewusst gestarteter Analyse</small></span><span className="connection-chip">Pilot-Limit</span></div>
        <div><span className="provider-mark">IMG</span><span><strong>Bilder</strong><small>Vorbereitet, aber kein Anbieter verbunden</small></span><span className="connection-chip sample">Kostenpflichtig</span></div>
        <div><span className="provider-mark">VO</span><span><strong>Stimme</strong><small>Vorbereitet, aber kein Anbieter verbunden</small></span><span className="connection-chip sample">Kostenpflichtig</span></div>
        <div><span className="provider-mark">MP4</span><span><strong>Video</strong><small>Vorbereitet, aber kein Renderer verbunden</small></span><span className="connection-chip sample">Kostenpflichtig</span></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function CostDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Kosten und Grenzen" onClose={onClose} footer={<button className="primary-button" type="button" onClick={onClose}>Verstanden</button>}>
      <div className="cost-state"><Icon name="coins" size={28} /><div><strong>Nur Textanalyse ist im Pilot aktiv</strong><p>Der Server begrenzt jeden Testnutzer auf zwei Analysen je 15 Minuten und fünf Analysen pro Tag. Das globale Monatsbudget wird in Vercel auf 8 USD gesetzt.</p></div></div>
      <div className="cost-table">
        <div><span>Analyse &amp; Textpaket</span><strong>Bei Start der Analyse</strong></div>
        <div><span>YouTube-Synchronisierung</span><strong>Lesend · keine Video-Kosten</strong></div>
        <div><span>Bilder</span><strong>Noch nicht aktiviert</strong></div>
        <div><span>Stimme</span><strong>Noch nicht aktiviert</strong></div>
        <div><span>MP4-Video</span><strong>Noch nicht aktiviert</strong></div>
      </div>
      <p className="dialog-intro">Erreicht das Gateway sein Budget, stoppt die App neue KI-Anfragen und zeigt das klar an. Es gibt keinen versteckten Medienauftrag.</p>
    </Modal>
  );
}
