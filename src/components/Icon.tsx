export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    fit: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /><path d="m8 8-5-5m13 5 5-5M8 16l-5 5m13-5 5 5" /></>,
    orbit: <><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)" /><circle cx="12" cy="12" r="3" /><path d="m17 3 3 1-1 3" /></>,
    fly: <><path d="m3 10 18-7-7 18-3-8-8-3Z" /><path d="m11 13 10-10" /></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /><path d="m3 7 9 5 9-5M12 12v10" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m9 3-.6 3-2.6 1.5L3 7v4l2.7 1.4.2 2.8L4 17.5l3 3 2.8-1.3 2.5 1.1 1.2 2.7h3l.8-3 2.3-1.7 2.9.2 1-3-2.4-1.9-.1-2.8L23 8l-2-2.5-3 .7-2.4-1.4L15 2h-4Z" /></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 3v7h7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m8 4 13 8-13 8V4Z" />,
    pause: <><path d="M8 4v16M16 4v16" /></>,
    sound: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    muted: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="m16 9 6 6m-6 0 6-6" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    expand: <><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" /></>,
    target: <><circle cx="12" cy="12" r="7" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /></>,
    drop: <><path d="M12 2v12m-4-4 4 4 4-4M4 19h16" /><circle cx="12" cy="19" r="2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.cube}</svg>;
}
