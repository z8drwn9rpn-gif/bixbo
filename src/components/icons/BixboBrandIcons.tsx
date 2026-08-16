import { useId, type ReactNode, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function useSvgId() {
  return `bx${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

function Shadow({ cy = 56, rx = 17, ry = 4 }: { cy?: number; rx?: number; ry?: number }) {
  return <ellipse cx="32" cy={cy} rx={rx} ry={ry} fill="#1c2a12" opacity="0.10" />;
}

/* BIXBO-specific brand and health icons kept separate to keep the core registry lean. */

/** BIXBO Connect — a soft three-node brand mark inspired by the supplied symbol. */
export function BixboConnectIcon(p: IconProps) {
  const a = useSvgId();
  const b = useSvgId();
  const c = useSvgId();
  const mini = (p.size ?? 24) <= 16;

  if (mini) {
    return (
      <Svg {...p}>
        <g stroke="#53642d" strokeWidth="5" strokeLinecap="round">
          <path d="m23 30 17-10" />
          <path d="m23 34 17 10" />
        </g>
        <circle cx="19" cy="32" r="8" fill="#91a752" />
        <circle cx="44" cy="18" r="8" fill="#b9cf76" />
        <circle cx="44" cy="46" r="8" fill="#789142" />
      </Svg>
    );
  }

  return (
    <Svg {...p}>
      <defs>
        <radialGradient id={a} cx="0.3" cy="0.22" r="0.9">
          <stop stopColor="#dceaa1" />
          <stop offset="0.5" stopColor="#a9c462" />
          <stop offset="1" stopColor="#71863a" />
        </radialGradient>
        <radialGradient id={b} cx="0.3" cy="0.22" r="0.9">
          <stop stopColor="#eff6c8" />
          <stop offset="0.54" stopColor="#c4db7d" />
          <stop offset="1" stopColor="#80983f" />
        </radialGradient>
        <radialGradient id={c} cx="0.3" cy="0.22" r="0.9">
          <stop stopColor="#c5dd7f" />
          <stop offset="0.5" stopColor="#8fa950" />
          <stop offset="1" stopColor="#5f7532" />
        </radialGradient>
      </defs>
      <Shadow cy={57} rx={20} ry={3.8} />
      <g stroke="#50602b" strokeWidth="5.2" strokeLinecap="round">
        <path d="m23.5 30.4 16.7-10.1" />
        <path d="m23.5 33.6 16.7 10.1" />
      </g>
      <circle cx="18.8" cy="32" r="11.6" fill={`url(#${a})`} stroke="#52612c" strokeWidth="1.4" />
      <circle cx="44.2" cy="17.2" r="11.2" fill={`url(#${b})`} stroke="#52612c" strokeWidth="1.4" />
      <circle cx="44.2" cy="46.8" r="11.2" fill={`url(#${c})`} stroke="#52612c" strokeWidth="1.4" />
      <ellipse cx="14.8" cy="27.4" rx="3.8" ry="2.1" transform="rotate(-32 14.8 27.4)" fill="#fff" opacity="0.42" />
      <ellipse cx="40.5" cy="12.8" rx="3.6" ry="2" transform="rotate(-32 40.5 12.8)" fill="#fff" opacity="0.52" />
      <ellipse cx="40.4" cy="42.5" rx="3.6" ry="2" transform="rotate(-32 40.4 42.5)" fill="#fff" opacity="0.34" />
    </Svg>
  );
}

/** Brain — a true BIXBO health and insights icon, not a profile placeholder. */
export function BrainIcon(p: IconProps) {
  const left = useSvgId();
  const right = useSvgId();
  const mini = (p.size ?? 24) <= 16;

  if (mini) {
    return (
      <Svg {...p}>
        <path d="M31.7 12.6c-2.5-4.1-8.6-4.9-12.3-1.3-5.2-.4-9.2 3.7-9.1 8.7-4.6 1.8-6.7 7.3-4.1 11.6-2.6 4.8-.3 10.7 4.8 12.5-.1 5.3 4.7 9.3 9.8 8.3 3 4.2 9.2 4.1 11.1-.8z" fill="#8ba348" />
        <path d="M32.3 12.6c2.5-4.1 8.6-4.9 12.3-1.3 5.2-.4 9.2 3.7 9.1 8.7 4.6 1.8 6.7 7.3 4.1 11.6 2.6 4.8.3 10.7-4.8 12.5.1 5.3-4.7 9.3-9.8 8.3-3 4.2-9.2 4.1-11.1-.8z" fill="#71873a" />
        <path d="M32 14v37" stroke="#50612b" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      </Svg>
    );
  }

  return (
    <Svg {...p}>
      <defs>
        <radialGradient id={left} cx="0.3" cy="0.22" r="0.88">
          <stop stopColor="#dceba0" />
          <stop offset="0.42" stopColor="#b7cf70" />
          <stop offset="1" stopColor="#70863a" />
        </radialGradient>
        <radialGradient id={right} cx="0.3" cy="0.22" r="0.88">
          <stop stopColor="#cfdf87" />
          <stop offset="0.46" stopColor="#9fb85a" />
          <stop offset="1" stopColor="#627834" />
        </radialGradient>
      </defs>
      <Shadow cy={57} rx={18} ry={3.8} />
      <path d="M31.7 12.6c-2.5-4.1-8.6-4.9-12.3-1.3-5.2-.4-9.2 3.7-9.1 8.7-4.6 1.8-6.7 7.3-4.1 11.6-2.6 4.8-.3 10.7 4.8 12.5-.1 5.3 4.7 9.3 9.8 8.3 3 4.2 9.2 4.1 11.1-.8z" fill={`url(#${left})`} />
      <path d="M32.3 12.6c2.5-4.1 8.6-4.9 12.3-1.3 5.2-.4 9.2 3.7 9.1 8.7 4.6 1.8 6.7 7.3 4.1 11.6 2.6 4.8.3 10.7-4.8 12.5.1 5.3-4.7 9.3-9.8 8.3-3 4.2-9.2 4.1-11.1-.8z" fill={`url(#${right})`} />
      <path d="M32 13.5v38.5" stroke="#5a6e31" strokeWidth="2.4" strokeLinecap="round" opacity="0.62" />
      <g fill="none" stroke="#647933" strokeWidth="2.8" strokeLinecap="round" opacity="0.76">
        <path d="M20.5 16.7c-3.6 1.4-5.3 4-4.8 7" />
        <path d="M16.8 28.2c-4.1.8-5.8 3.7-4.9 7.1" />
        <path d="M23.6 26.2c-3 1.4-4.1 4.1-3 7" />
        <path d="M20.6 39c-3.3.3-5.3 2.4-5.2 5.1" />
        <path d="M43.5 16.7c3.6 1.4 5.3 4 4.8 7" />
        <path d="M47.2 28.2c4.1.8 5.8 3.7 4.9 7.1" />
        <path d="M40.4 26.2c3 1.4 4.1 4.1 3 7" />
        <path d="M43.4 39c3.3.3 5.3 2.4 5.2 5.1" />
      </g>
      <path d="M16.6 15.6c4.1-3.7 8.7-4 11.3-2.2" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      <ellipse cx="21.2" cy="20.2" rx="6.2" ry="3.1" transform="rotate(-30 21.2 20.2)" fill="#fff" opacity="0.14" />
    </Svg>
  );
}
