interface Props {
  size?: number;
  className?: string;
}

export function NightscoutLogo({ size = 48, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="Nightscout"
      role="img"
    >
      <circle cx="50" cy="50" r="50" fill="#0f172a" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#22c55e" strokeWidth="3" />
      <path
        d="M50 18 C50 18 30 42 30 56 C30 67 39 76 50 76 C61 76 70 67 70 56 C70 42 50 18 50 18 Z"
        fill="#22c55e"
      />
      <ellipse
        cx="43" cy="46" rx="5" ry="8"
        fill="white" opacity="0.25"
        transform="rotate(-20 43 46)"
      />
      <path
        d="M50 68 L50 42 M50 42 L43 52 M50 42 L57 52"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
