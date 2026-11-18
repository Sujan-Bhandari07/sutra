import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.3V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.09C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

export function GmailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#EA4335"
        d="M2 6.5v11A1.5 1.5 0 0 0 3.5 19H6V9.9l6 4.5 6-4.5V19h2.5a1.5 1.5 0 0 0 1.5-1.5v-11c0-1.86-2.12-2.92-3.6-1.8L12 9.6 5.6 4.7C4.12 3.58 2 4.64 2 6.5z"
      />
    </svg>
  );
}

export function GoogleCalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" />
      <path fill="#4285F4" d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3z" />
      <text x="12" y="18" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4285F4" fontFamily="sans-serif">
        31
      </text>
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="sutra-ig" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEDA75" />
          <stop offset=".35" stopColor="#FA7E1E" />
          <stop offset=".65" stopColor="#D62976" />
          <stop offset="1" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="url(#sutra-ig)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="url(#sutra-ig)" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="url(#sutra-ig)" />
    </svg>
  );
}
