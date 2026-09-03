import type { NavKey } from '../types';
import type { PilotAnalysisRun, PilotProject, PilotSource, YoutubeConnectionStatus } from '../lib/pilot-data';
import { platformLabel } from '../lib/creator';
import { Icon } from '../components/Icon';

interface ScreenBaseProps {
  onNavigate: (key: NavKey) => void;
}

interface TodayScreenProps extends ScreenBaseProps {
  project: PilotProject | null;
  sources: PilotSource[];
  analysis: PilotAnalysisRun | null;
  onCreateProject: () => void;
}

export function TodayScreen({ project, sources, analysis, onNavigate, onCreateProject }: TodayScreenProps) {
  if (!project) {
    return <section className="page-screen"><header className="page-heading"><h1>Willkommen im Pilot</h1><p>Lege dein erstes Kurzvideo-Projekt an. Danach fügst du eigene Texte oder SRT-Untertitel hinzu.</p></header><div className="empty-state"><Icon name="plus" size={30} /><h2>Noch kein Projekt</h2><p>Der Pilot startet bewusst klein: ein Kurzvideo, eigene Quellen, ein klares Textpaket.</p><button type="button" onClick={onCreateProject}>Erstes Projekt anlegen</button></div></section>;
  }

  const steps = [
    { label: 'Quellen hinzufügen', text: sources.length ? `${sources.length} von maximal 3 Quellen liegen bereit.` : 'Füge Text, Skript oder SRT aus deinen eigenen Inhalten hinzu.', nav: 'library' as const },
    { label: 'Textpaket analysieren', text: analysis?.result ? 'Eine echte Analyse liegt vor und kann im Studio bearbeitet werden.' : 'Starte erst nach der Quellenprüfung eine echte Analyse.', nav: 'analysis' as const },
    { label: 'Prüfen und exportieren', text: analysis?.result ? 'Bearbeite die sechs Szenen und exportiere dein Textpaket als JSON.' : 'Der Export wird freigeschaltet, sobald ein Textpaket vorhanden ist.', nav: 'studio' as const },
  ];

  return (
    <section className="page-screen">
      <header className="page-heading"><h1>Heute</h1><p>{project.title} · {platformLabel(project.platform)} · {project.durationSeconds} Sekunden</p></header>
      <div className="task-list">
        {steps.map((step, index) => <button type="button" key={step.label} onClick={() => onNavigate(step.nav)}><span className="task-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{step.label}</strong><small>{step.text}</small></span><Icon name="chevron" /></button>)}
      </div>
    </section>
  );
}

interface LibraryScreenProps extends ScreenBaseProps {
  project: PilotProject | null;
  sources: PilotSource[];
  youtubeStatus: YoutubeConnectionStatus | null;
  onOpenSourceDialog: () => void;
  onDeleteSource: (sourceId: string) => Promise<void>;
  onOpenConnections: () => void;
}

export function LibraryScreen({ project, sources, youtubeStatus, onOpenSourceDialog, onDeleteSource, onOpenConnections, onNavigate }: LibraryScreenProps) {
  return (
    <section className="page-screen">
      <header className="page-heading heading-with-action">
        <div><h1>Bibliothek</h1><p>Nur eigene Texte, Skripte und SRT-Untertitel. Rohvideo und Roh-Audio werden nicht verarbeitet.</p></div>
        <button type="button" className="primary-button compact" disabled={!project || sources.length >= 3} onClick={onOpenSourceDialog}><Icon name="upload" /> Quelle hinzufügen</button>
      </header>
      <button className="connection-banner" type="button" disabled={!project} onClick={onOpenConnections}>
        <span className={`status-dot ${youtubeStatus?.connected ? '' : 'is-off'}`} />
        <span><strong>{youtubeStatus?.connected ? 'Eigener YouTube-Kanal verbunden' : 'Optional: eigenen YouTube-Kanal verbinden'}</strong><small>{youtubeStatus?.connected ? 'Nur lesend · keine Uploads oder Veröffentlichungen.' : 'Es werden nur deine eigenen Kanal- und Analytics-Daten gelesen.'}</small></span>
        <Icon name="chevron" />
      </button>
      <div className="asset-list" aria-label="Eigene Textquellen">
        {sources.length === 0 ? (
          <div className="empty-state"><Icon name="file" size={30} /><h2>Noch keine Quelle</h2><p>Füge maximal drei Texte, Skripte oder SRT-Dateien hinzu. Sie werden ausschließlich für dieses Projekt verwendet.</p>{project && <button type="button" onClick={onOpenSourceDialog}>Erste Quelle hinzufügen</button>}</div>
        ) : sources.map((source) => (
          <div className="asset-row" key={source.id}>
            <span className="asset-icon"><Icon name="file" /></span>
            <button type="button" className="asset-main" onClick={() => onNavigate('analysis')}><span><strong>{source.filename || `${source.kind.toUpperCase()}-Quelle`}</strong><small>{source.kind.toUpperCase()} · {source.content.length.toLocaleString('de-DE')} Zeichen</small></span></button>
            <span className="asset-status">Bereit</span>
            <button className="row-delete" type="button" aria-label={`${source.filename || 'Quelle'} löschen`} onClick={() => void onDeleteSource(source.id)}><Icon name="close" size={17} /></button>
          </div>
        ))}
      </div>
      {sources.length >= 3 && <p className="provider-note"><Icon name="warning" size={18} /> Für eine Analyse sind maximal drei Quellen erlaubt. Entferne zuerst eine Quelle, wenn du eine andere verwenden möchtest.</p>}
    </section>
  );
}

interface AnalysisScreenProps extends ScreenBaseProps {
  project: PilotProject | null;
  sources: PilotSource[];
  analysis: PilotAnalysisRun | null;
  isAnalyzing: boolean;
  error: string | null;
  rightsConfirmed: boolean;
  onStartAnalysis: () => Promise<void>;
  onRightsConfirmedChange: (confirmed: boolean) => void;
  onFeedback: (feedback: NonNullable<PilotAnalysisRun['feedback']>) => Promise<void>;
}

export function AnalysisScreen({ project, sources, analysis, isAnalyzing, error, rightsConfirmed, onStartAnalysis, onRightsConfirmedChange, onFeedback, onNavigate }: AnalysisScreenProps) {
  const result = analysis?.result;
  const canAnalyze = Boolean(project && sources.length > 0 && rightsConfirmed && !isAnalyzing);
  return (
    <section className="page-screen">
      <header className="page-heading heading-with-action"><div><h1>Analyse</h1><p>{result ? 'Dein echtes Textpaket aus den ausgewählten eigenen Quellen.' : 'Starte erst, wenn deine Quellen vollständig und korrekt sind.'}</p></div><button type="button" className="primary-button compact" disabled={!canAnalyze} onClick={() => void onStartAnalysis()}><Icon name="sparkle" /> {isAnalyzing ? 'Analyse läuft …' : result ? 'Neu analysieren' : 'Analyse starten'}</button></header>
      {error && <div className="inline-error" role="alert"><Icon name="warning" /> {error}</div>}
      {project && sources.length > 0 && <label className="analysis-rights"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => onRightsConfirmedChange(event.target.checked)} /> Ich bestätige für diese Analyse erneut: Ich darf diese eigenen Inhalte und Daten verwenden.</label>}
      {!project ? <div className="empty-state"><Icon name="plus" size={30} /><h2>Erst ein Projekt anlegen</h2><p>Ohne Projekt kann keine Quelle und keine Analyse sicher zugeordnet werden.</p><button type="button" onClick={() => onNavigate('today')}>Zu Heute</button></div> : sources.length === 0 ? <div className="empty-state"><Icon name="folder" size={30} /><h2>Keine Quelle ausgewählt</h2><p>Füge in der Bibliothek mindestens einen eigenen Text, ein Skript oder SRT-Untertitel hinzu.</p><button type="button" onClick={() => onNavigate('library')}>Bibliothek öffnen</button></div> : !result ? <div className="empty-state"><Icon name="sparkle" size={30} /><h2>Bereit für das Textpaket</h2><p>{sources.length} Quelle{sources.length === 1 ? '' : 'n'} werden zusammen analysiert. Bild, Stimme und Video bleiben deaktiviert.</p><button type="button" disabled={!canAnalyze} onClick={() => void onStartAnalysis()}>{isAnalyzing ? 'Analyse läuft …' : 'Analyse jetzt starten'}</button></div> : <>
        <div className="analysis-summary"><article><span>Zusammenfassung</span><h2>{project.title}</h2><p>{result.summary}</p></article><article><span>Bitte beachten</span><h2>{result.claimsToVerify.length ? `${result.claimsToVerify.length} Punkt${result.claimsToVerify.length === 1 ? '' : 'e'} prüfen` : 'Keine offenen Faktenhinweise'}</h2><p>{result.claimsToVerify[0] || 'Prüfe dein Ergebnis vor der Veröffentlichung trotzdem selbst.'}</p></article></div>
        <div className="analysis-rows"><div className="list-heading"><span>Drei Content-Winkel</span><span>Studio</span></div>{result.contentAngles.map((angle, index) => <button key={angle.title} type="button" onClick={() => onNavigate('studio')}><span className="task-index">0{index + 1}</span><span><strong>{angle.title}</strong><small>{angle.rationale}</small></span><span className="ready">Ausarbeiten</span><Icon name="chevron" size={18} /></button>)}</div>
        <div className="analysis-feedback"><span>Wie passt dieses Textpaket?</span><div><button type="button" className={analysis.feedback === 'accepted' ? 'is-selected' : ''} onClick={() => void onFeedback('accepted')}>Übernommen</button><button type="button" className={analysis.feedback === 'edited' ? 'is-selected' : ''} onClick={() => void onFeedback('edited')}>Bearbeitet</button><button type="button" className={analysis.feedback === 'not_a_fit' ? 'is-selected' : ''} onClick={() => void onFeedback('not_a_fit')}>Nicht passend</button></div><small>Das Feedback verbessert später nur Produktlogik und Prompts – kein Modell-Fine-Tuning.</small></div>
      </>}
    </section>
  );
}

interface ExportsScreenProps extends ScreenBaseProps {
  project: PilotProject | null;
  analysis: PilotAnalysisRun | null;
  approved: boolean;
  onDownloadProject: () => void;
  onDeleteProject: () => Promise<void>;
}

export function ExportsScreen({ project, analysis, approved, onDownloadProject, onDeleteProject, onNavigate }: ExportsScreenProps) {
  if (!project || !analysis?.result) {
    return <section className="page-screen"><header className="page-heading"><h1>Exporte</h1><p>Ein JSON-Export wird freigeschaltet, sobald ein Textpaket vorliegt.</p></header><div className="empty-state"><Icon name="export" size={30} /><h2>Noch kein Textpaket</h2><p>Erstelle zuerst eine echte Analyse. Ein MP4-Export ist bewusst noch nicht aktiviert.</p><button type="button" onClick={() => onNavigate('analysis')}>Zur Analyse</button></div></section>;
  }
  return (
    <section className="page-screen">
      <header className="page-heading"><h1>Exporte</h1><p>Dein bearbeitbares Textpaket – ohne vorgetäuschten Video-Export.</p></header>
      <div className="export-row"><div className="export-preview"><Icon name="studio" size={28} /></div><span><strong>{project.title}</strong><small>6 Szenen · Hooks · Skript · Prüfliste · JSON</small></span><span className={approved ? 'export-ready' : 'export-draft'}>{approved ? 'Freigegeben' : 'Entwurf'}</span><div className="export-actions"><button type="button" onClick={() => onNavigate('studio')}>Öffnen</button><button type="button" className="primary-button compact" onClick={onDownloadProject}>JSON herunterladen</button></div></div>
      <button className="danger-link" type="button" onClick={() => void onDeleteProject()}>Dieses Projekt mit allen Quellen und Ergebnissen löschen</button>
      <p className="provider-note"><Icon name="warning" size={18} /> Bilder, Stimme und MP4-Video sind sichtbar vorbereitet, aber nicht aktiviert. Deshalb entsteht hier kein versteckter kostenpflichtiger Auftrag.</p>
    </section>
  );
}
