import { useMemo, useState } from 'react';
import { stages } from '../data/scenes';
import type { AnalysisOutput } from '../lib/creator';
import type { OutputMode, Scene, Stage } from '../types';
import { Icon } from '../components/Icon';

interface StudioScreenProps {
  scenes: Scene[];
  analysis: AnalysisOutput | null;
  sourceCount: number;
  isAnalyzing: boolean;
  isLocalDemo?: boolean;
  selectedSceneId: number;
  onSelectScene: (id: number) => void;
  onUpdateScene: (id: number, patch: Partial<Scene>) => void;
  onStartAnalysis: () => Promise<void>;
  onSaveDraft: () => Promise<void> | void;
  onOpenCost: () => void;
  onApprove: () => void;
  onNotify: (message: string) => void;
}

export function StudioScreen({ scenes, analysis, sourceCount, isAnalyzing, isLocalDemo = false, selectedSceneId, onSelectScene, onUpdateScene, onStartAnalysis, onSaveDraft, onOpenCost, onApprove, onNotify }: StudioScreenProps) {
  const [stage, setStage] = useState<Stage>(analysis ? 'Szenen' : 'Idee');
  const [mode, setMode] = useState<OutputMode>('faceless');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [reviewed, setReviewed] = useState<boolean[]>([false, false, false, false, false]);
  const activeScene = useMemo(() => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0], [scenes, selectedSceneId]);
  const reviewItems = analysis?.reviewChecklist?.slice(0, 5) ?? ['Hook verständlich', 'Aussagen geprüft', 'Untertitel geprüft', 'Szenenabfolge geprüft', 'Veröffentlichung bewusst entschieden'];
  const allReviewed = reviewItems.every((_, index) => reviewed[index] ?? false);

  const update = (patch: Partial<Scene>) => {
    if (!analysis) {
      onNotify('Starte zuerst eine echte Analyse. Die Musteransicht wird nicht als KI-Ergebnis gespeichert.');
      return;
    }
    onUpdateScene(activeScene.id, patch);
  };

  const useRecommendedHook = () => {
    if (!analysis?.recommendedHook) return onNotify('Starte zuerst eine Analyse, um konkrete Hook-Vorschläge zu erhalten.');
    onUpdateScene(1, { script: analysis.recommendedHook });
    onSelectScene(1);
    onNotify('Der empfohlene Hook wurde in Szene 01 übernommen.');
  };

  const useAlternativeHook = () => {
    const alternative = analysis?.hooks.find((hook) => hook !== analysis.recommendedHook);
    if (!alternative) return onNotify('Nach einer Analyse erscheinen hier Alternativen für deinen Hook.');
    onUpdateScene(1, { script: alternative });
    onSelectScene(1);
    onNotify('Eine alternative Hook-Fassung wurde in Szene 01 übernommen.');
  };

  const startAnalysis = async () => {
    if (!sourceCount) {
      onNotify('Füge zuerst mindestens eine eigene Text-, Skript- oder SRT-Quelle hinzu.');
      return;
    }
    await onStartAnalysis();
    setStage('Szenen');
  };

  return (
    <>
      <section className="desktop-studio" aria-label="Creator Studio">
        <header className="workspace-heading">
          <h1>{analysis ? 'Dein Textpaket' : 'Dein nächstes Kurzvideo'}</h1>
          <div className="stage-progress" aria-label="Produktionsfortschritt">
            {stages.map((item, index) => {
              const activeIndex = stages.indexOf(stage);
              const complete = Boolean(analysis) && index < activeIndex;
              const isUnavailable = item === 'Stimme';
              return <button key={item} type="button" className={`${item === stage ? 'is-active' : ''} ${complete ? 'is-complete' : ''} ${isUnavailable ? 'is-unavailable' : ''}`} onClick={() => setStage(item)} title={isUnavailable ? 'Stimme ist vorbereitet, aber noch nicht aktiviert.' : undefined}><span className="stage-marker">{complete ? <Icon name="check" size={13} /> : null}</span><span>{item}{isUnavailable ? ' · später' : ''}</span></button>;
            })}
          </div>
          <div className="mode-tabs" role="tablist" aria-label="Ausgabeformat">
            <button type="button" role="tab" aria-selected={mode === 'record'} className={mode === 'record' ? 'is-active' : ''} onClick={() => setMode('record')}><Icon name="studio" size={18} /> Selbst aufnehmen</button>
            <button type="button" role="tab" aria-selected={mode === 'faceless'} className={mode === 'faceless' ? 'is-active' : ''} onClick={() => setMode('faceless')}><Icon name="user" size={18} /> Faceless</button>
          </div>
        </header>

        <div className="studio-grid">
          <aside className="scene-rail" aria-label="Szenen">
            {scenes.map((scene) => <button key={scene.id} type="button" className={`scene-row ${scene.id === selectedSceneId ? 'is-active' : ''}`} onClick={() => onSelectScene(scene.id)}><span className="drag-dots" aria-hidden="true">⋮</span><img src={scene.asset} alt="" /><span className="scene-label">{String(scene.id).padStart(2, '0')} {scene.label}</span><span className="scene-duration">{scene.duration}</span></button>)}
          </aside>

          <section className="editor-pane" aria-label="Skript und spätere Medienhinweise">
            <div className="editor-title-row"><h2>{String(activeScene.id).padStart(2, '0')} {activeScene.label}</h2><span>Dauer: {activeScene.duration}</span></div>
            {isLocalDemo && <div className="studio-notice"><Icon name="warning" size={18} /> Lokale Musteransicht: Diese Analyse ist ein Beispiel. Es wurde keine KI aufgerufen und nichts an einen Dienst gesendet.</div>}
            {!isLocalDemo && !analysis && <div className="studio-notice"><Icon name="warning" size={18} /> Starte eine echte Analyse erst, nachdem du deine eigenen Quellen geprüft hast.</div>}
            <label className="field-label" htmlFor="scene-script">Skript / Voiceover</label>
            <textarea id="scene-script" className="script-field" value={activeScene.script} maxLength={600} onChange={(event) => update({ script: event.target.value })} />
            <div className="character-count">{activeScene.script.length} / 600</div>
            <div className="suggestion-heading">Entwicklungspartner</div>
            <div className="suggestion-list">
              <button type="button" disabled={!analysis} onClick={useRecommendedHook}><span>{analysis?.winningPatterns[0] || 'Analyse starten, um konkrete Muster zu erhalten'}</span><strong>Hook übernehmen</strong></button>
              <button type="button" disabled={!analysis} onClick={useAlternativeHook}><span>{analysis?.hooks[1] || 'Alternative Hook-Fassung nach der Analyse'}</span><strong>Übernehmen</strong></button>
            </div>
            <label className="field-label hint-label" htmlFor="generation-hint">Hinweise für Bild / Stimme / Video <span className="field-badge">Noch nicht aktiviert</span></label>
            <textarea id="generation-hint" className="hint-field" value={activeScene.generationHint} maxLength={400} onChange={(event) => update({ generationHint: event.target.value })} />
            <div className="character-count">{activeScene.generationHint.length} / 400 · Es wird kein Medienanbieter gestartet.</div>
          </section>

          <section className="preview-pane" aria-label="Visuelles Szenenboard">
            <div className="video-frame"><img src={activeScene.asset} alt={`Szenenbild ${activeScene.id}: ${activeScene.label}`} /><div className="frame-format">9:16 Szenenboard</div><div className="caption-overlay">{activeScene.script}</div><div className="static-preview-label"><Icon name="warning" size={15} /> Kein MP4 · nur Text- und Szenenvorschau</div></div>
          </section>

          <aside className="partner-pane" aria-label="Entwicklungspartner">
            <div className="partner-title"><h2>Entwicklungspartner</h2><Icon name="sparkle" size={21} /></div>
            <div className="partner-message"><span className="partner-symbol"><Icon name="sparkle" size={16} /></span><p>{analysis?.winningPatterns[0] || 'Nach der Analyse zeigt dir der Partner Muster aus deinen eigenen Quellen und deinem optionalen YouTube-Snapshot.'}</p></div>
            <button type="button" className="partner-action" disabled={!analysis} onClick={useRecommendedHook}><Icon name="wand" /> <span>Empfohlenen Hook nutzen</span> <Icon name="chevron" size={17} /></button>
            <button type="button" className="partner-action" disabled={!analysis} onClick={useAlternativeHook}><Icon name="swap" /> <span>Alternative anzeigen</span> <Icon name="chevron" size={17} /></button>
            <div className="media-lock"><Icon name="warning" size={18} /><span><strong>Bild, Stimme und Video</strong><small>Vorbereitet · kostenpflichtig · nicht aktiviert</small></span></div>
          </aside>
        </div>

        <footer className="studio-footer">
          <button className="cost-link" type="button" onClick={onOpenCost}><Icon name="coins" /> Kosten und Nutzungsgrenzen anzeigen</button>
          <div className="footer-actions"><button className="secondary-button" type="button" disabled={!analysis} onClick={() => void onSaveDraft()}><Icon name="save" /> Entwurf speichern</button><button className="primary-button" type="button" disabled={isAnalyzing || !sourceCount} onClick={() => void startAnalysis()}><Icon name="sparkle" /> {isAnalyzing ? 'Analyse läuft …' : analysis ? 'Textpaket aktualisieren' : 'Analyse starten'}</button></div>
        </footer>
      </section>

      <section className="mobile-review" aria-label="Prüfen und freigeben">
        <h1>{analysis ? 'Prüfen & freigeben' : 'Textpaket vorbereiten'}</h1>
        <div className="mobile-video-frame"><img src={activeScene.asset} alt={`Szenenbild ${activeScene.id}: ${activeScene.label}`} /><span className="frame-format">9:16 Szenenboard</span><div className="caption-overlay">{activeScene.script}</div><div className="mobile-static-label">Kein MP4 · nur Textvorschau</div><div className="mobile-scene-strip">{scenes.map((scene) => <button type="button" key={scene.id} className={scene.id === selectedSceneId ? 'is-active' : ''} onClick={() => onSelectScene(scene.id)}><img src={scene.asset} alt="" /><span>{String(scene.id).padStart(2, '0')}</span></button>)}</div></div>
        <div className="success-line"><span className="round-check"><Icon name="check" size={17} /></span>{analysis ? 'Textpaket mit 6 editierbaren Szenen' : 'Analyse noch nicht gestartet'}</div>
        <div className="mobile-partner"><h2>Entwicklungspartner</h2><button type="button" className="warning-action" disabled={!analysis} onClick={useRecommendedHook}><span><Icon name="sparkle" size={22} /></span><p>{analysis?.winningPatterns[0] || 'Starte die Analyse, um Empfehlungen aus deinen eigenen Quellen zu erhalten.'}</p><strong>Empfohlenen Hook öffnen <Icon name="chevron" size={18} /></strong></button></div>
        <div className={`review-checklist ${checklistOpen ? 'is-open' : ''}`}><button type="button" onClick={() => setChecklistOpen((value) => !value)}><span className="round-check muted"><Icon name="check" size={16} /></span>Prüfliste {reviewItems.filter((_, index) => reviewed[index]).length} von {reviewItems.length} erledigt<Icon name="chevron" size={18} className="chevron-down" /></button>{checklistOpen && <div className="checklist-items">{reviewItems.map((label, index) => <label key={label}><input type="checkbox" checked={reviewed[index] ?? false} onChange={() => setReviewed((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))} /> {label}</label>)}</div>}</div>
        <button className="mobile-cost-link" type="button" onClick={onOpenCost}>Kosten und verwendete Modelle anzeigen</button>
        <div className="mobile-approval-actions"><button className="secondary-button" type="button" onClick={() => onSelectScene(1)}>Ändern</button><button className="primary-button" type="button" disabled={!analysis || !allReviewed} onClick={onApprove}>Freigeben & exportieren</button></div>
      </section>
    </>
  );
}
