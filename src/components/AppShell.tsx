import type { ReactNode } from 'react';
import type { NavKey } from '../types';
import { Icon, type IconName } from './Icon';

const navigation: Array<{ key: NavKey; label: string; icon: IconName }> = [
  { key: 'today', label: 'Heute', icon: 'home' },
  { key: 'library', label: 'Bibliothek', icon: 'folder' },
  { key: 'analysis', label: 'Analyse', icon: 'chart' },
  { key: 'studio', label: 'Studio', icon: 'studio' },
  { key: 'exports', label: 'Exporte', icon: 'export' },
];

interface AppShellProps {
  active: NavKey;
  projectName: string;
  youtubeConnected: boolean;
  isLocalDemo?: boolean;
  children: ReactNode;
  onNavigate: (key: NavKey) => void;
  onOpenProfile: () => void;
  onOpenConnections: () => void;
}

export function AppShell({ active, projectName, youtubeConnected, isLocalDemo = false, children, onNavigate, onOpenProfile, onOpenConnections }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <button className="wordmark" type="button" onClick={() => onNavigate('studio')}>STUDIO</button>
        <nav className="side-nav">
          {navigation.map((item) => (
            <button
              type="button"
              className={`nav-item ${active === item.key ? 'is-active' : ''}`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              aria-current={active === item.key ? 'page' : undefined}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="collapse-label" type="button" aria-label="Seitenleiste einklappen">
          <span>«</span> Einklappen
        </button>
      </aside>

      <header className="topbar">
        <button className="project-switcher" type="button" onClick={onOpenProfile}>
          <span>{projectName}</span>
          <Icon name="chevron" size={16} className="chevron-down" />
        </button>
        <button className="connection-status desktop-status" type="button" onClick={onOpenConnections} title={youtubeConnected ? 'Eigener Kanal ist lesend verbunden.' : 'Optional: eigenen YouTube-Kanal lesend verbinden.'}>
          <span className={`status-dot ${youtubeConnected ? '' : 'is-off'}`} />
          {isLocalDemo ? 'Lokale Musteransicht' : youtubeConnected ? 'YouTube verbunden' : 'YouTube optional'}
        </button>
        <div className="top-actions">
          <button className="icon-button" type="button" aria-label="Verbindungen öffnen" onClick={onOpenConnections}>
            <Icon name="settings" size={22} />
          </button>
          <button className="profile-button" type="button" aria-label="Creator-Profil öffnen" onClick={onOpenProfile}>
            <span className="avatar"><Icon name="user" size={21} /></span>
            <Icon name="chevron" size={15} className="chevron-down" />
          </button>
          <button className="mobile-more" type="button" aria-label="Weitere Einstellungen" onClick={onOpenConnections}>
            <Icon name="more" size={24} />
          </button>
        </div>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav" aria-label="Mobile Hauptnavigation">
        {navigation.filter((item) => item.key !== 'analysis').map((item) => (
          <button
            type="button"
            className={active === item.key ? 'is-active' : ''}
            key={item.key}
            onClick={() => onNavigate(item.key)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
