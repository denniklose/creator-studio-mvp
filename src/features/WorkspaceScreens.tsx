import { useRef } from 'react';
import type { ImportedAsset, NavKey, Scene } from '../types';
import { Icon } from '../components/Icon';

interface ScreenBaseProps {
  onNavigate: (key: NavKey) => void;
}

export function TodayScreen({ onNavigate }: ScreenBaseProps) {
  return (
    <section className="page-screen">
      <header className="page-heading"><h1>Heute</h1><p>Die nächsten sinnvollen Schritte für dein Musterprojekt.</p></header>
      <div className="task-list">
        <button type="button" onClick={() => onNavigate('analysis')}><span className="task-index">01</span><span><strong>Analyse prüfen</strong><small>Ein Muster in den vorhandenen Kurzvideos wurde erkannt.</small></span><Icon name="chevron" /></button>
        <button type="button" onClick={() => onNavigate('studio')}><span className="task-index">02</span><span><strong>Nächstes Video ausarbeiten</strong><small>Die Idee ist vorbereitet und kann im Studio bearbeitet werden.</small></span><Icon name="chevron" /></button>
        <button type="button" onClick={() => onNavigate('exports')}><span className="task-index">03</span><span><strong>Freigaben kontrollieren</strong><small>Ein lokaler Entwurf wartet auf deine Entscheidung.</small></span><Icon name="chevron" /></button>
      </div>
    </section>
  );
}

interface LibraryScreenProps extends ScreenBaseProps {
  assets: ImportedAsset[];
  onAddAssets: (files: FileList) => void;
  onOpenConnections: () => void;
}

export function LibraryScreen({ assets, onAddAssets, onOpenConnections, onNavigate }: LibraryScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <section className="page-screen">
      <header className="page-heading heading-with-action">
        <div><h1>Bibliothek</h1><p>Videos, Skripte und Kennzahlen als Grundlage deiner Analyse.</p></div>
        <button type="button" className="primary-button compact" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Dateien hinzufügen</button>
      </header>
      <input ref={fileRef} type="file" accept="video/*,audio/*,.txt,.md,.srt" multiple hidden onChange={(event) => event.target.files && onAddAssets(event.target.files)} />
      <button className="connection-banner" type="button" onClick={onOpenConnections}>
        <span className="status-dot" />
        <span><strong>YouTube Musterverbindung</strong><small>Im Prototyp werden keine echten Kanal- oder Leistungsdaten abgerufen.</small></span>
        <Icon name="chevron" />
      </button>
      <div className="asset-list" aria-label="Importierte Dateien">
        {assets.length === 0 ? (
          <div className="empty-state"><Icon name="folder" size={30} /><h2>Noch keine eigenen Dateien</h2><p>Füge ein Video, Skript oder Transkript hinzu. Die sechs Musterszenen bleiben unverändert erhalten.</p><button type="button" onClick={() => fileRef.current?.click()}>Datei auswählen</button></div>
        ) : assets.map((asset) => (
          <button type="button" key={asset.id} onClick={() => onNavigate('analysis')}>
            <span className="asset-icon"><Icon name="file" /></span>
            <span><strong>{asset.name}</strong><small>{asset.kind} · {asset.size}</small></span>
            <span className="asset-status">Bereit</span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

interface AnalysisScreenProps extends ScreenBaseProps {
  scenes: Scene[];
}

export function AnalysisScreen({ scenes, onNavigate }: AnalysisScreenProps) {
  return (
    <section className="page-screen analysis-screen">
      <header className="page-heading heading-with-action"><div><h1>Analyse</h1><p>Musterprojekt · lokale Beispielauswertung ohne externe Plattformdaten.</p></div><button className="primary-button compact" type="button" onClick={() => onNavigate('studio')}>Idee ins Studio übernehmen</button></header>
      <div className="analysis-summary">
        <article><span>Stärkster Hebel</span><h2>Konkreterer Gegensatz in den ersten Sekunden</h2><p>Die Aussage wird schneller verständlich, wenn Problem und gewünschtes Ergebnis direkt nebeneinanderstehen.</p></article>
        <article><span>Offener Prüfpunkt</span><h2>Beleg für Szene 03 fehlt</h2><p>Die Aussage sollte vor einer Veröffentlichung durch eine belastbare Quelle oder eigene Daten abgesichert werden.</p></article>
      </div>
      <div className="analysis-rows">
        <div className="list-heading"><span>Szenenstruktur</span><span>Bewertung</span></div>
        {scenes.map((scene, index) => (
          <button key={scene.id} type="button" onClick={() => onNavigate('studio')}>
            <img src={scene.asset} alt="" />
            <span><strong>{String(scene.id).padStart(2, '0')} {scene.label}</strong><small>{scene.script}</small></span>
            <span className={index === 2 ? 'needs-review' : 'ready'}>{index === 2 ? 'Prüfen' : 'Klar'}</span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

interface ExportsScreenProps extends ScreenBaseProps {
  approved: boolean;
  onDownloadProject: () => void;
}

export function ExportsScreen({ approved, onDownloadProject, onNavigate }: ExportsScreenProps) {
  return (
    <section className="page-screen">
      <header className="page-heading"><h1>Exporte</h1><p>Freigegebene Pakete und lokale Projektdateien.</p></header>
      <div className="export-row">
        <div className="export-preview"><Icon name="studio" size={28} /></div>
        <span><strong>Dein nächstes Video</strong><small>6 Szenen · Aufnahme-Paket und Faceless-Entwurf</small></span>
        <span className={approved ? 'export-ready' : 'export-draft'}>{approved ? 'Freigegeben' : 'Entwurf'}</span>
        <div className="export-actions">
          <button type="button" onClick={() => onNavigate('studio')}>Öffnen</button>
          <button type="button" className="primary-button compact" onClick={onDownloadProject}>Projektdatei laden</button>
        </div>
      </div>
      <p className="provider-note"><Icon name="warning" size={18} /> Ein echtes MP4 wird erst erzeugt, wenn ein Video-Anbieter und ein Renderer konfiguriert wurden. Der Prototyp lädt deshalb ehrlich nur die bearbeitbare Projektdatei herunter.</p>
    </section>
  );
}
