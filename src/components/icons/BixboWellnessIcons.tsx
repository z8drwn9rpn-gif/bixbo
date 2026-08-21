import type { SVGProps } from "react";

export type BixboWellnessIconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: BixboWellnessIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

function Shadow() {
  return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />;
}

export function BixboEyeIcon(props: BixboWellnessIconProps) {
  return (
    <Base {...props}>
      <Shadow />
      <path
        d="M7 31c6.5-10.5 15-16 25-16s18.5 5.5 25 16c-6.5 10.5-15 16-25 16S13.5 41.5 7 31Z"
        fill="#f7f5eb"
        stroke="#71804f"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="31" r="11" fill="#91b8b5" stroke="#5c8682" strokeWidth="2.4" />
      <circle cx="32" cy="31" r="5.2" fill="#34443a" />
      <circle cx="28.5" cy="27.5" r="2.2" fill="#fff" opacity="0.9" />
      <path d="M13 22c5-6 11-9 19-9 7 0 13 2 18 7" stroke="#a9b97c" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
    </Base>
  );
}

export function BixboEyePainIcon({ level, ...props }: BixboWellnessIconProps & { level: 0 | 1 | 2 | 3 | 4 }) {
  const iris = ["#91b8b5", "#a6b77c", "#d5bd69", "#d4966f", "#c66f68"][level];
  const accent = ["#5c8682", "#71804f", "#9b8138", "#a76548", "#934944"][level];
  return (
    <Base {...props}>
      <Shadow />
      <path
        d="M7 29c6.5-9.5 15-14.5 25-14.5S50.5 19.5 57 29c-6.5 9.5-15 14.5-25 14.5S13.5 38.5 7 29Z"
        fill="#f7f5eb"
        stroke="#71804f"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="29" r="9.5" fill={iris} stroke={accent} strokeWidth="2.2" />
      <circle cx="32" cy="29" r="4.5" fill="#34443a" />
      <circle cx="28.8" cy="26" r="1.9" fill="#fff" opacity="0.9" />
      <g transform="translate(18 48)">
        {[0, 1, 2, 3].map((index) => (
          <rect
            key={index}
            x={index * 8}
            y={index < level ? 0 : 2}
            width="5"
            height={index < level ? 7 : 3}
            rx="1.5"
            fill={index < level ? accent : "#dfe4d4"}
          />
        ))}
      </g>
    </Base>
  );
}

export type BixboEyeSensitivityVariant = "light" | "screen" | "watery" | "strain" | "twitch" | "other" | "custom";

export function BixboEyeSensitivityIcon({
  variant,
  ...props
}: BixboWellnessIconProps & { variant: BixboEyeSensitivityVariant }) {
  const stroke = "#71804f";
  const dark = "#34443a";
  const cream = "#f7f5eb";
  const soft = "#dfe4d4";
  const blue = "#91b8b5";
  const gold = "#d5bd69";

  const eye = (
    <>
      <path
        d="M13 32c5-7.5 11.3-11.2 19-11.2S46 24.5 51 32c-5 7.5-11.3 11.2-19 11.2S18 39.5 13 32Z"
        fill={cream}
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="7.4" fill={blue} stroke={stroke} strokeWidth="2.1" />
      <circle cx="32" cy="32" r="3.2" fill={dark} />
      <circle cx="29.7" cy="29.7" r="1.35" fill="#fff" opacity="0.9" />
    </>
  );

  return (
    <Base {...props}>
      {variant === "light" ? (
        <>
          <circle cx="32" cy="16" r="6" fill={gold} stroke="#9b8138" strokeWidth="2" />
          {[0, 45, 90, 135].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 32 16)`}>
              <path d="M32 5v5" stroke="#9b8138" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M32 22v5" stroke="#9b8138" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          ))}
          <g transform="translate(0 10)">{eye}</g>
        </>
      ) : null}

      {variant === "screen" ? (
        <>
          <rect x="10" y="12" width="44" height="34" rx="6" fill={cream} stroke={stroke} strokeWidth="2.6" />
          <g transform="translate(0 -3)">{eye}</g>
          <path d="M24 53h16M28 46v7M36 46v7" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : null}

      {variant === "watery" ? (
        <>
          <g transform="translate(0 -5)">{eye}</g>
          <path d="M24 43c0 4-2.7 7-5.6 7s-5.4-2.2-5.4-5.2c0-2.7 3-6 5.4-9.8 2.5 3.8 5.6 6.2 5.6 8Z" fill="#b9d8dc" stroke="#5c8682" strokeWidth="2" />
          <path d="M50 44c0 3.3-2.2 5.8-4.8 5.8-2.4 0-4.5-1.9-4.5-4.4 0-2.3 2.4-5.1 4.5-8.2 2 3.2 4.8 5.2 4.8 6.8Z" fill="#b9d8dc" stroke="#5c8682" strokeWidth="2" />
        </>
      ) : null}

      {variant === "strain" ? (
        <>
          {eye}
          <path d="M8 21c4-3.5 7-3.5 11 0M6 43c4 3.5 7 3.5 11 0M56 21c-4-3.5-7-3.5-11 0M58 43c-4 3.5-7 3.5-11 0" stroke="#9b8138" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 50c5 2.2 11 2.2 16 0" stroke={soft} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}

      {variant === "twitch" ? (
        <>
          <g transform="translate(0 7)">{eye}</g>
          <path d="M35 4 24 19h9l-4 12 14-18h-9l1-9Z" fill={gold} stroke="#9b8138" strokeWidth="1.8" strokeLinejoin="round" />
        </>
      ) : null}

      {variant === "other" ? (
        <>
          {eye}
          <circle cx="22" cy="51" r="2.4" fill={stroke} />
          <circle cx="32" cy="51" r="2.4" fill={stroke} />
          <circle cx="42" cy="51" r="2.4" fill={stroke} />
        </>
      ) : null}

      {variant === "custom" ? (
        <>
          <circle cx="32" cy="31" r="18" fill={cream} stroke={stroke} strokeWidth="2.6" />
          <path d="M32 21v20M22 31h20" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M46 13l1.7 4.3L52 19l-4.3 1.7L46 25l-1.7-4.3L40 19l4.3-1.7L46 13Z" fill={gold} stroke="#9b8138" strokeWidth="1.2" />
        </>
      ) : null}
    </Base>
  );
}

export function BixboBatteryLevelIcon({ level, ...props }: BixboWellnessIconProps & { level: 1 | 2 | 3 | 4 | 5 }) {
  const fill = ["#c66f68", "#d4966f", "#d5bd69", "#a6b77c", "#7f9b59"][level - 1];
  return (
    <Base {...props}>
      <Shadow />
      <rect x="16" y="13" width="32" height="40" rx="8" fill="#f4f5ec" stroke="#65783e" strokeWidth="2.5" />
      <rect x="26" y="8" width="12" height="6" rx="2.5" fill="#65783e" />
      {[0, 1, 2, 3, 4].map((index) => {
        const active = index < level;
        return (
          <rect
            key={index}
            x="21"
            y={45 - index * 6}
            width="22"
            height="4.5"
            rx="2.25"
            fill={active ? fill : "#dfe4d4"}
            opacity={active ? 1 : 0.7}
          />
        );
      })}
      <path d="M27 22h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </Base>
  );
}
