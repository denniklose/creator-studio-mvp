import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'folder'
  | 'chart'
  | 'studio'
  | 'export'
  | 'settings'
  | 'user'
  | 'chevron'
  | 'check'
  | 'play'
  | 'pause'
  | 'volume'
  | 'sparkle'
  | 'wand'
  | 'swap'
  | 'coins'
  | 'save'
  | 'warning'
  | 'upload'
  | 'plus'
  | 'link'
  | 'file'
  | 'close'
  | 'more';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" /><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" /></>,
    folder: <><path d="M3 6.5h6l2 2h10v10.8A1.7 1.7 0 0 1 19.3 21H4.7A1.7 1.7 0 0 1 3 19.3Z" /><path d="M3 9h18" /></>,
    chart: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M2.5 20.5h19" /></>,
    studio: <><path d="M4 7.5h16v12H4z" /><path d="m8 7.5 2-3h4l2 3M9 12l6 3-6 3z" /></>,
    export: <><path d="M12 16V3M7 8l5-5 5 5" /><path d="M4 14v6h16v-6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    play: <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
    volume: <><path d="M4 10h4l5-4v12l-5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    sparkle: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z" /><path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" /></>,
    wand: <><path d="m4 20 10-10" /><path d="m13 4 1 2.5L16.5 8 14 9l-1 2.5L12 9 9.5 8 12 6.5zM19 10l.6 1.4L21 12l-1.4.6L19 14l-.6-1.4L17 12l1.4-.6z" /></>,
    swap: <><path d="M4 7h14l-3-3M20 17H6l3 3" /></>,
    coins: <><ellipse cx="9" cy="6" rx="5" ry="2.5" /><path d="M4 6v4c0 1.4 2.2 2.5 5 2.5S14 11.4 14 10V6M4 10v4c0 1.4 2.2 2.5 5 2.5" /><circle cx="17.5" cy="17.5" r="4" /><path d="M17.5 15.5v4M15.5 17.5h4" /></>,
    save: <><path d="M5 3h12l2 2v16H5z" /><path d="M8 3v6h8V3M8 15h8v6H8z" /></>,
    warning: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17.5h.01" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v5h16v-5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    link: <><path d="m9.5 14.5 5-5" /><path d="M7.5 17.5H6a4 4 0 0 1 0-8h3M16.5 6.5H18a4 4 0 0 1 0 8h-3" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    more: <><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></>,
  };

  return <svg {...common} {...props}>{paths[name]}</svg>;
}
