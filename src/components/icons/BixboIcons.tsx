/**
 * BIXBO icon system — original soft-3D SVG icon family.
 * No unicode emoji: every symbol in the app renders through this library.
 * Shared language: 64x64 viewBox, rounded volumes, top-left key light,
 * soft contact shadow, gentle gradients.
 */
import { useId, type SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Stable, SSR-safe gradient ids (no colons so url(#id) stays valid). */
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

/** soft ground shadow shared by all icons */
function Shadow({ cy = 56, rx = 17, ry = 4 }: { cy?: number; rx?: number; ry?: number }) {
  return <ellipse cx="32" cy={cy} rx={rx} ry={ry} fill="#1c2a12" opacity="0.10" />;
}

/* ---------------------------------------------------------------- BRAND */

/** BIXBO logo — soft 3D chili. Brand only, never a symptom icon. */
export function ChiliIcon(p: IconProps) {
  const a = useSvgId(), b = useSvgId(), c = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="20" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff6b5e" /><stop offset="0.55" stopColor="#e8342c" /><stop offset="1" stopColor="#a81616" />
        </linearGradient>
        <linearGradient id={b} x1="28" y1="6" x2="44" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fd66a" /><stop offset="1" stopColor="#3f8f36" />
        </linearGradient>
        <linearGradient id={c} x1="20" y1="26" x2="34" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.85" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Shadow />
      <path
        d="M41 17c6 3 10 10 10 18 0 13-10 21-22 21-9 0-16-4-19-9-1-2 1-4 3-3 4 2 8 2 12 0 7-3 11-9 12-17 .4-4 1.4-8 4-10z"
        fill={`url(#${a})`}
      />
      <path d="M38 18c-1-5 1-10 5-12 1.6-.8 3 1 2.2 2.5-1.3 2.4-1.4 4.6-.4 6.6.9 1.8-.6 3.6-2.4 3.9l-2 .3c-1.2.2-2.2-.2-2.4-1.3z" fill={`url(#${b})`} />
      <path d="M43 6.4c2.6-2.3 6-3 8.6-1.7 1.3.7.9 2.6-.6 2.9-2.4.4-4.2 1.6-5.4 3.4-.9 1.4-3 .8-3.1-.9l-.1-2c0-.7.2-1.3.6-1.7z" fill="#5aa842" />
      <path d="M26 27c3 4 2 12-4 17-2 1.6-4-.6-3-2.6 2.4-4.6 3.4-9 3-13.4-.2-2 2.8-2.6 4-1z" fill={`url(#${c})`} opacity="0.7" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- CYCLE */

/** Cycle / period / flow / discharge — three blueberries + two leaves. */
export function BlueberryIcon(p: IconProps) {
  const a = useSvgId(), b = useSvgId(), l = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <radialGradient id={a} cx="0.35" cy="0.3" r="0.85">
          <stop stopColor="#8aa4f2" /><stop offset="0.5" stopColor="#4a5fd6" /><stop offset="1" stopColor="#2b2f8f" />
        </radialGradient>
        <radialGradient id={b} cx="0.35" cy="0.3" r="0.85">
          <stop stopColor="#7d97ea" /><stop offset="0.55" stopColor="#3f52c6" /><stop offset="1" stopColor="#232a7d" />
        </radialGradient>
        <linearGradient id={l} x1="20" y1="6" x2="44" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#95dd6e" /><stop offset="1" stopColor="#46943a" />
        </linearGradient>
      </defs>
      <Shadow cy={57} rx={18} ry={3.5} />
      <path d="M31 20c-4-7-11-10-17-9-1.4.2-1.8 1.8-.7 2.7 4.6 3.6 7.4 7.6 8.8 12.2.5 1.7 2.7 2 3.8.7l4.6-5.2c.6-.6.8-1.5.5-2.2z" fill={`url(#${l})`} />
      <path d="M33 20c3-7 9.6-11 16-10.6 1.4.1 2 1.7.9 2.7-4.2 3.8-6.8 8-8 12.7-.4 1.7-2.6 2.2-3.8.9l-4.6-4.8c-.6-.6-.8-1.4-.5-2z" fill="#5fb046" />
      <circle cx="21" cy="38" r="12" fill={`url(#${b})`} />
      <circle cx="43" cy="38" r="12" fill={`url(#${b})`} />
      <circle cx="32" cy="31" r="12.5" fill={`url(#${a})`} />
      <g fill="#1d2270" opacity="0.55">
        <circle cx="32" cy="26" r="3.2" /><circle cx="16.5" cy="34" r="2.6" /><circle cx="47.5" cy="34" r="2.6" />
      </g>
      <g fill="#fff" opacity="0.5">
        <ellipse cx="26" cy="25" rx="3.6" ry="2.4" transform="rotate(-28 26 25)" />
        <ellipse cx="15.5" cy="33" rx="2.6" ry="1.7" transform="rotate(-28 15.5 33)" />
        <ellipse cx="37.5" cy="33" rx="2.6" ry="1.7" transform="rotate(-28 37.5 33)" />
      </g>
    </Svg>
  );
}

/* ---------------------------------------------------------------- PAIN */

/** Pain — soft 3D flame (never the chili). */
export function FlameIcon(p: IconProps) {
  const a = useSvgId(), b = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="24" y1="6" x2="42" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb03a" /><stop offset="0.45" stopColor="#ff6a2e" /><stop offset="1" stopColor="#d81f4a" />
        </linearGradient>
        <linearGradient id={b} x1="28" y1="26" x2="38" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff2a8" /><stop offset="1" stopColor="#ffab2e" />
        </linearGradient>
      </defs>
      <Shadow />
      <path
        d="M33 5c1 8-3 11-8 16-6 6-9 11-9 18 0 9 7.5 15 16 15s16-6 16-15c0-7-3.5-12-8-16.5-.6 3-2.4 5-4.6 5.6-2 .6-3.4-1-3-3C33 20 35 13 33 5z"
        fill={`url(#${a})`}
      />
      <path d="M32.5 33c1 4 5 6 5 11 0 4.4-3.3 7.4-7 7.4S23 48.4 23 44c0-5 5.4-6.6 6.6-11 .5-1.8 2.4-1.8 2.9 0z" fill={`url(#${b})`} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- BOWEL */

/** Bowel — friendly soft 3D poop with small eyes. */
export function PoopIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="16" y1="14" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b98354" /><stop offset="0.5" stopColor="#8f5c34" /><stop offset="1" stopColor="#5f3a1f" />
        </linearGradient>
      </defs>
      <Shadow />
      <g fill={`url(#${a})`}>
        <path d="M32 8c5 0 8 3.4 8 7.4 0 1.6-.5 3-1.3 4.2h.8c5 0 8.5 3.4 8.5 7.6 0 2-.8 3.8-2.2 5.2 5 .6 8.4 4 8.4 8.2 0 2.2-1 4.2-2.6 5.6 2.6 1.2 4.4 3.6 4.4 6.4 0 4-3.6 7.4-8 7.4H16c-4.4 0-8-3.4-8-7.4 0-2.8 1.8-5.2 4.4-6.4A7.4 7.4 0 0 1 9.8 40.6c0-4.2 3.4-7.6 8.4-8.2A6.8 6.8 0 0 1 16 27.2c0-4.2 3.5-7.6 8.5-7.6h.8A7 7 0 0 1 24 15.4C24 11.4 27 8 32 8z" />
      </g>
      <g fill="#fff">
        <ellipse cx="25" cy="40" rx="4.2" ry="4.6" /><ellipse cx="39" cy="40" rx="4.2" ry="4.6" />
      </g>
      <g fill="#2c1a0d">
        <ellipse cx="25.6" cy="40.6" rx="2.1" ry="2.4" /><ellipse cx="39.6" cy="40.6" rx="2.1" ry="2.4" />
      </g>
      <path d="M27 48c2.6 2.2 7.4 2.2 10 0" stroke="#3a2312" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M20 24c3-2 7-2.6 10-1.6" stroke="#fff" strokeOpacity="0.28" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- MEDS */

export function PillIcon(p: IconProps) {
  const a = useSvgId(), b = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="12" y1="14" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8a7a" /><stop offset="1" stopColor="#e03c34" />
        </linearGradient>
        <linearGradient id={b} x1="30" y1="30" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff3c4" /><stop offset="1" stopColor="#f0cf6a" />
        </linearGradient>
      </defs>
      <Shadow />
      <g transform="rotate(-40 32 32)">
        <rect x="10" y="21" width="44" height="22" rx="11" fill={`url(#${b})`} />
        <path d="M21 21h11v22H21a11 11 0 0 1 0-22z" fill={`url(#${a})`} />
        <rect x="10" y="21" width="22" height="22" rx="11" fill={`url(#${a})`} />
        <rect x="15" y="25" width="12" height="5" rx="2.5" fill="#fff" opacity="0.45" />
      </g>
    </Svg>
  );
}

/* ---------------------------------------------------------------- LOVE */

export function HeartIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8fa8" /><stop offset="0.5" stopColor="#f0325c" /><stop offset="1" stopColor="#b4102f" />
        </linearGradient>
      </defs>
      <Shadow cy={57} rx={15} ry={3.5} />
      <path d="M32 53C16 42 8 34 8 24.5 8 16.5 14.2 11 21.4 11c4.6 0 8.4 2.3 10.6 5.8C34.2 13.3 38 11 42.6 11 49.8 11 56 16.5 56 24.5 56 34 48 42 32 53z" fill={`url(#${a})`} />
      <ellipse cx="21" cy="22" rx="5.5" ry="3.6" transform="rotate(-32 21 22)" fill="#fff" opacity="0.45" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- FOOD */

export function FoodIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="10" y1="32" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdfdfd" /><stop offset="1" stopColor="#c8cdd4" />
        </linearGradient>
      </defs>
      <Shadow />
      <g>
        <circle cx="22" cy="28" r="7" fill="#7fc25a" /><circle cx="34" cy="24" r="6.5" fill="#e8674f" />
        <circle cx="44" cy="29" r="6" fill="#f2b13c" /><circle cx="29" cy="30" r="5.5" fill="#4f9f3f" />
      </g>
      <path d="M8 32h48c0 11-10.8 18-24 18S8 43 8 32z" fill={`url(#${a})`} />
      <path d="M14 36c2 7 9 11 18 11" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
    </Svg>
  );
}

/* ------------------------------------------------------- NEURO / EPISODES */

/** Tetany — energy bolt. */
export function BoltIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="22" y1="6" x2="44" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe27a" /><stop offset="0.55" stopColor="#ffb524" /><stop offset="1" stopColor="#e07a12" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M37 4 18 33c-.8 1.2 0 2.8 1.5 2.8h9.6L25 58c-.3 1.8 2 2.9 3.2 1.5L47 30c1-1.2.1-3-1.5-3h-9.8L40 6.4C40.4 4.5 38.2 3.4 37 4z" fill={`url(#${a})`} />
      <path d="M33 12 23 28h6" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Panic attack — head with spiral of anxiety. */
export function PanicIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="16" y1="16" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c7b4f5" /><stop offset="1" stopColor="#7a5fd6" />
        </linearGradient>
      </defs>
      <Shadow />
      <circle cx="32" cy="34" r="19" fill={`url(#${a})`} />
      <path d="M22 30c0-5 4.5-8.6 10-8.6 4.6 0 8 2.6 8 6 0 3-2.4 5-5.6 5-2.4 0-4-1.2-4-2.8 0-1.4 1.1-2.3 2.5-2.3"
        stroke="#fff" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" fill="none" />
      <g fill="#3b2a70">
        <circle cx="25" cy="40" r="2.3" /><circle cx="39" cy="40" r="2.3" />
      </g>
      <path d="M27 47c2.4-2 7.4-2 10 0" stroke="#3b2a70" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="26" rx="5" ry="3.2" transform="rotate(-30 24 26)" fill="#fff" opacity="0.3" />
    </Svg>
  );
}

/** Hot flashes — flushed face with heat waves. */
export function HotFlashIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="16" y1="16" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb37a" /><stop offset="1" stopColor="#e8542f" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke="#f2803c" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M20 12c2-2 2-4 0-6" /><path d="M32 11c2-2 2-4.5 0-6.5" /><path d="M44 12c2-2 2-4 0-6" />
      </g>
      <circle cx="32" cy="35" r="18" fill={`url(#${a})`} />
      <g fill="#7a2b12">
        <path d="M22 32c1.6-1.6 4.4-1.6 6 0" stroke="#7a2b12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M36 32c1.6-1.6 4.4-1.6 6 0" stroke="#7a2b12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </g>
      <path d="M26 42c3 3 9 3 12 0" stroke="#7a2b12" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="26" rx="5" ry="3" transform="rotate(-30 24 26)" fill="#fff" opacity="0.35" />
    </Svg>
  );
}

/** Headache. */
export function HeadacheIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="14" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9fd7f0" /><stop offset="1" stopColor="#4a8fc4" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M32 12c11 0 18 8 18 18 0 6-3 9-3 13 0 3-2 5-6 5H26c-9 0-14-7-14-16 0-11 8-20 20-20z" fill={`url(#${a})`} />
      <g fill="none" stroke="#e2413f" strokeLinecap="round">
        <circle cx="34" cy="27" r="4" strokeWidth="3" /><circle cx="34" cy="27" r="9" strokeWidth="2.6" opacity="0.6" />
        <circle cx="34" cy="27" r="14" strokeWidth="2.2" opacity="0.3" />
      </g>
      <ellipse cx="21" cy="24" rx="5" ry="3" transform="rotate(-30 21 24)" fill="#fff" opacity="0.4" />
    </Svg>
  );
}

/* ------------------------------------------------------------ THERAPIES */

export function HeatIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="20" y1="8" x2="44" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff9f5e" /><stop offset="1" stopColor="#e0402f" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={`url(#${a})`} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M20 52c-4-6-4-11 0-16s4-10 0-16" />
        <path d="M32 54c-4-7-4-13 0-19s4-12 0-19" />
        <path d="M44 52c-4-6-4-11 0-16s4-10 0-16" />
      </g>
    </Svg>
  );
}

export function ColdIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bfefff" /><stop offset="1" stopColor="#3f9fd6" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={`url(#${a})`} strokeWidth="5.5" strokeLinecap="round">
        <path d="M32 8v48" /><path d="M11 20l42 24" /><path d="M53 20L11 44" />
      </g>
      <g stroke={`url(#${a})`} strokeWidth="4.5" strokeLinecap="round">
        <path d="M32 16l-6-5M32 16l6-5M32 48l-6 5M32 48l6 5" />
      </g>
    </Svg>
  );
}

export function TensIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="16" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff0a8" /><stop offset="1" stopColor="#8fd0f5" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M32 6c2 12 6.5 16.5 18.5 18.5C38.5 26.5 34 31 32 43c-2-12-6.5-16.5-18.5-18.5C25.5 22.5 30 18 32 6z" fill={`url(#${a})`} />
      <path d="M47 40c1 6 3.2 8.2 9 9-5.8.8-8 3-9 9-1-6-3.2-8.2-9-9 5.8-.8 8-3 9-9z" fill={`url(#${a})`} opacity="0.85" />
    </Svg>
  );
}

/* ------------------------------------------------------------- ACTIVITY */

export function WorkoutIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="10" y1="24" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7fb8f2" /><stop offset="1" stopColor="#2f5fc0" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M9 42c0-6 3-9 6-13l4-6c1-1.6 3.4-1.6 4.4 0l2 3.4c2.4 4 6 6.6 10.4 8.6l14 6.4c2.6 1.2 4.2 3.6 4.2 6.2v1.4c0 1.6-1.4 3-3 3H12c-1.6 0-3-1.4-3-3v-7z" fill={`url(#${a})`} />
      <path d="M22 30c3.4 3.4 8 6 13 8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none" />
      <rect x="9" y="46" width="45" height="6" rx="3" fill="#fff" opacity="0.75" />
    </Svg>
  );
}

export function SleepIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="10" x2="46" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c9c3f7" /><stop offset="1" stopColor="#6a5bc4" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M44 40c-12 0-21-8.6-21-20 0-4 1.2-7.6 3-10.4C16 12.2 9 20.6 9 31c0 12.2 9.8 21 22 21 8.4 0 15.6-4.4 19-11.6-1.8.4-3.8.6-6 .6z" fill={`url(#${a})`} />
      <g fill="#f5d872">
        <path d="M46 8l1.8 4.4L52 14l-4.2 1.6L46 20l-1.8-4.4L40 14l4.2-1.6z" />
        <path d="M55 22l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" />
      </g>
    </Svg>
  );
}

export function ThermometerIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="24" y1="10" x2="40" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8f7a" /><stop offset="1" stopColor="#d8324a" />
        </linearGradient>
      </defs>
      <Shadow />
      <rect x="25" y="6" width="14" height="38" rx="7" fill="#e8ecef" />
      <circle cx="32" cy="46" r="11" fill="#e8ecef" />
      <circle cx="32" cy="46" r="7.5" fill={`url(#${a})`} />
      <rect x="29" y="18" width="6" height="24" rx="3" fill={`url(#${a})`} />
      <rect x="27" y="9" width="3.4" height="30" rx="1.7" fill="#fff" opacity="0.8" />
    </Svg>
  );
}

export function WeightIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="10" y1="16" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7f9fb" /><stop offset="1" stopColor="#b9c2cc" />
        </linearGradient>
      </defs>
      <Shadow />
      <rect x="8" y="14" width="48" height="38" rx="12" fill={`url(#${a})`} />
      <circle cx="32" cy="33" r="12" fill="#eef2f6" />
      <path d="M32 33l7-7" stroke="#e0526a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="33" r="2.6" fill="#5b6672" />
      <rect x="14" y="18" width="16" height="4" rx="2" fill="#fff" opacity="0.8" />
    </Svg>
  );
}

export function NoteIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="12" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffdf5" /><stop offset="1" stopColor="#dcd6c2" />
        </linearGradient>
      </defs>
      <Shadow />
      <rect x="12" y="8" width="36" height="48" rx="8" fill={`url(#${a})`} />
      <g stroke="#a8b08f" strokeWidth="3" strokeLinecap="round">
        <path d="M20 22h20M20 31h20M20 40h12" />
      </g>
      <path d="M42 44l12-12 5 5-12 12-6 1z" fill="#8fb95f" />
    </Svg>
  );
}

export function WarningIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd166" /><stop offset="1" stopColor="#e88a1a" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M28.5 9.5 7.6 47c-1.9 3.4.6 7.5 4.5 7.5h39.8c3.9 0 6.4-4.1 4.5-7.5L35.5 9.5c-1.9-3.4-5.1-3.4-7 0z" fill={`url(#${a})`} />
      <rect x="29" y="21" width="6" height="17" rx="3" fill="#fff" />
      <circle cx="32" cy="45" r="3.4" fill="#fff" />
    </Svg>
  );
}

export function LeafIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a8e17c" /><stop offset="1" stopColor="#4a8f3a" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M52 10C28 10 12 21 12 39c0 5 1.6 9 4 12C22 34 32 26 46 22 34 29 24 39 20 54c22 4 32-14 32-44z" fill={`url(#${a})`} />
    </Svg>
  );
}

export function TaskIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a3e07d" /><stop offset="1" stopColor="#3f8f3c" />
        </linearGradient>
      </defs>
      <Shadow />
      <circle cx="32" cy="32" r="24" fill={`url(#${a})`} />
      <path d="M21 33l8 8 15-17" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="22" cy="20" rx="6" ry="3.6" transform="rotate(-30 22 20)" fill="#fff" opacity="0.3" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="10" y1="14" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdfcf7" /><stop offset="1" stopColor="#d9d6c4" />
        </linearGradient>
      </defs>
      <Shadow />
      <rect x="8" y="12" width="48" height="44" rx="10" fill={`url(#${a})`} />
      <path d="M8 22a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v4H8v-4z" fill="#e0574f" />
      <g fill="#8a6a4a">
        <rect x="18" y="4" width="6" height="14" rx="3" /><rect x="40" y="4" width="6" height="14" rx="3" />
      </g>
      <g fill="#a8b08f">
        <circle cx="21" cy="36" r="3.4" /><circle cx="32" cy="36" r="3.4" /><circle cx="43" cy="36" r="3.4" />
        <circle cx="21" cy="46" r="3.4" /><circle cx="32" cy="46" r="3.4" />
      </g>
    </Svg>
  );
}

export function StarIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="14" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe486" /><stop offset="1" stopColor="#f0a326" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M32 6l7.6 15.6L57 24l-12.6 12.3L47.4 54 32 45.8 16.6 54l3-17.7L7 24l17.4-2.4z" fill={`url(#${a})`} />
    </Svg>
  );
}

function makeDot(from: string, to: string) {
  return function DotIcon(p: IconProps) {
    const a = useSvgId();
    return (
      <Svg {...p}>
        <defs>
          <radialGradient id={a} cx="0.35" cy="0.3" r="0.85">
            <stop stopColor={from} /><stop offset="1" stopColor={to} />
          </radialGradient>
        </defs>
        <Shadow cy={54} rx={14} ry={3} />
        <circle cx="32" cy="30" r="22" fill={`url(#${a})`} />
        <ellipse cx="24" cy="20" rx="7" ry="4.4" transform="rotate(-30 24 20)" fill="#fff" opacity="0.4" />
      </Svg>
    );
  };
}
export const DotGreenIcon = makeDot("#a9ea86", "#3f9a3c");
export const DotYellowIcon = makeDot("#ffe888", "#e8b62a");
export const DotOrangeIcon = makeDot("#ffc07a", "#e8752a");
export const DotRedIcon = makeDot("#ff9b95", "#d32a2a");

export function WaterIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="20" y1="8" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b8ecff" /><stop offset="1" stopColor="#2f8fd6" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M32 6c9 12 16 20 16 28 0 9-7 16-16 16s-16-7-16-16c0-8 7-16 16-28z" fill={`url(#${a})`} />
      <ellipse cx="24" cy="36" rx="4" ry="6" fill="#fff" opacity="0.4" />
    </Svg>
  );
}

export function CoffeeIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <defs>
        <linearGradient id={a} x1="12" y1="20" x2="44" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffdf8" /><stop offset="1" stopColor="#ddd6c8" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M10 22h34v16c0 8-7 14-17 14s-17-6-17-14V22z" fill={`url(#${a})`} />
      <path d="M44 26h5a7 7 0 0 1 0 14h-5" stroke="#c8c0b0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="27" cy="25" rx="15" ry="4" fill="#7a4a28" />
    </Svg>
  );
}

export function WineIcon(p: IconProps) {
  const a = useSvgId();
  return (
    <Svg {...p}>
      <Shadow />
      <path d="M20 8h24l-2 16c-.8 6-5 10-10 10s-9.2-4-10-10z" fill="#c22a4a" />
      <path d="M30 34h4v16h-4z" fill="#dcd6c2" />
      <rect x="20" y="50" width="24" height="5" rx="2.5" fill="#dcd6c2" />
    </Svg>
  );
}

/* ------------------------------------------------------------ REGISTRY */

export const BIXBO_ICONS = {
  chili: ChiliIcon,
  blueberry: BlueberryIcon,
  flame: FlameIcon,
  poop: PoopIcon,
  pill: PillIcon,
  heart: HeartIcon,
  food: FoodIcon,
  bolt: BoltIcon,
  panic: PanicIcon,
  hotflash: HotFlashIcon,
  headache: HeadacheIcon,
  heat: HeatIcon,
  cold: ColdIcon,
  tens: TensIcon,
  workout: WorkoutIcon,
  sleep: SleepIcon,
  thermometer: ThermometerIcon,
  weight: WeightIcon,
  note: NoteIcon,
  warning: WarningIcon,
  leaf: LeafIcon,
  task: TaskIcon,
  calendar: CalendarIcon,
  star: StarIcon,
  dotGreen: DotGreenIcon,
  dotYellow: DotYellowIcon,
  dotOrange: DotOrangeIcon,
  dotRed: DotRedIcon,
  water: WaterIcon,
  coffee: CoffeeIcon,
  wine: WineIcon,
} as const;

export type BixboIconName = keyof typeof BIXBO_ICONS;

/** Legacy emoji → branded icon. Used to migrate every old symbol in the UI. */
export const EMOJI_ICON: Record<string, BixboIconName> = {
  "🌶️": "chili", "🌶": "chili",
  "🫐": "blueberry",
  "🔥": "flame",
  "💩": "poop",
  "💊": "pill", "💉": "pill",
  "❤️": "heart", "❤": "heart", "💗": "heart", "💖": "heart",
  "🍽️": "food", "🍽": "food", "🥗": "food", "🍵": "food",
  "⚡": "bolt", "⚡️": "bolt",
  "🫯": "panic", "😱": "panic",
  "🥵": "hotflash",
  "🤕": "headache",
  "♨️": "heat", "♨": "heat",
  "🧊": "cold",
  "✨": "tens",
  "🧘🏼‍♀️": "workout", "🧘": "workout", "👟": "workout", "🏃": "workout", "🚶🏼": "workout", "💪": "workout",
  "😴": "sleep", "🌙": "sleep",
  "🌡️": "thermometer", "🌡": "thermometer",
  "⚖️": "weight", "⚖": "weight",
  "📝": "note", "📄": "note",
  "⚠️": "warning", "⚠": "warning",
  "🥑": "leaf", "🌿": "leaf",
  "✅": "task", "☑️": "task", "✔️": "task",
  "📅": "calendar", "🗓️": "calendar",
  "⭐": "star", "🌟": "star",
  "🟢": "dotGreen", "🟡": "dotYellow", "🟠": "dotOrange", "🔴": "dotRed",
  "💧": "water", "☕": "coffee", "🍷": "wine",
};

/**
 * Render a branded icon by name or by the legacy emoji it replaces.
 * Unmapped symbols fall back to their original text so nothing disappears.
 */
export function Ico({
  name, e, size = 20, className,
}: { name?: BixboIconName; e?: string; size?: number; className?: string }) {
  const key = name ?? (e ? EMOJI_ICON[e] : undefined);
  if (!key) return e ? <span className={className}>{e}</span> : null;
  const C = BIXBO_ICONS[key];
  return <C size={size} className={`inline-block shrink-0 align-[-0.15em] ${className ?? ""}`} />;
}


const EMOJI_RE = new RegExp(
  `(${Object.keys(EMOJI_ICON).sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g",
);

/** Renders a string, swapping any legacy emoji inside it for branded icons. */
export function IcoText({ text, size = 16, className }: { text: string; size?: number; className?: string }) {
  const parts = text.split(EMOJI_RE);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        EMOJI_ICON[part]
          ? <Ico key={i} e={part} size={size} />
          : <span key={i}>{part}</span>,
      )}
    </span>
  );
}
