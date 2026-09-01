import hookAsset from '../assets/scene-01-hook.jpg';
import problemAsset from '../assets/scene-02-problem.jpg';
import turnAsset from '../assets/scene-03-turn.jpg';
import solutionAsset from '../assets/scene-04-solution.jpg';
import exampleAsset from '../assets/scene-05-example.jpg';
import finishAsset from '../assets/scene-06-finish.jpg';
import type { Scene } from '../types';

export const initialScenes: Scene[] = [
  {
    id: 1,
    label: 'Hook',
    duration: '0:04',
    asset: hookAsset,
    script: 'Wusstest du, dass 90 % der Menschen diesen einen Fehler jeden Tag machen?',
    generationHint: 'Dramatische Frage als Text-Overlay, dunkler Hintergrund, schneller Zoom auf den Gegensatz.',
  },
  {
    id: 2,
    label: 'Problem',
    duration: '0:06',
    asset: problemAsset,
    script: 'Du produzierst regelmäßig – trotzdem bleibt oft unklar, warum ein Video funktioniert und das nächste nicht.',
    generationHint: 'Ruhige Nahaufnahme, wenig Bewegung, spürbare Überforderung ohne übertriebene Dramatik.',
  },
  {
    id: 3,
    label: 'Wendepunkt',
    duration: '0:05',
    asset: turnAsset,
    script: 'Der Wendepunkt beginnt, sobald du Inhalt und echte Reaktion gemeinsam betrachtest.',
    generationHint: 'Silhouette vor aufbrechendem Licht; langsame Vorwärtsbewegung und klarer visueller Richtungswechsel.',
  },
  {
    id: 4,
    label: 'Lösung',
    duration: '0:06',
    asset: solutionAsset,
    script: 'Analysiere Hook, Aufbau und Zuschauerreaktion – und leite daraus nur den nächsten sinnvollen Schritt ab.',
    generationHint: 'Eine einzelne Lichtquelle, klare Komposition, kein generischer Technik-Look.',
  },
  {
    id: 5,
    label: 'Beispiel',
    duration: '0:07',
    asset: exampleAsset,
    script: 'Aus einem starken Thema werden so sechs klare Szenen statt zwanzig lose Ideen.',
    generationHint: 'Storyboard im Notizbuch; sanfter Top-down-Zoom, warme Arbeitsatmosphäre.',
  },
  {
    id: 6,
    label: 'Abschluss',
    duration: '0:04',
    asset: finishAsset,
    script: 'Nicht mehr raten. Den nächsten Inhalt bewusst produzieren.',
    generationHint: 'Ruhiger Abschluss am Horizont; genug Raum für eine kurze Handlungsaufforderung.',
  },
];

export const stages = ['Idee', 'Skript', 'Szenen', 'Stimme', 'Prüfung'] as const;
