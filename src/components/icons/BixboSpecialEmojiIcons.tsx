import type { SVGProps } from "react";

export type SpecialIconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: SpecialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/** BIXBO devil — soft 3D purple face with rounded horns. */
export function DevilIcon({ size = 24, ...rest }: SpecialIconProps) {
  return (
    <Svg size={size} {...rest}>
      <ellipse cx="32" cy="56" rx="16" ry="3" fill="#263318" opacity="0.12" />
      <path d="M18 20C12 17 9 11 10 6c6 1 11 4 15 9" fill="#7657A7" stroke="#523B79" strokeWidth="2" strokeLinejoin="round" />
      <path d="M46 20c6-3 9-9 8-14-6 1-11 4-15 9" fill="#7657A7" stroke="#523B79" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="33" r="20" fill="#8E6AC0" stroke="#5C4386" strokeWidth="2" />
      <ellipse cx="25" cy="27" rx="6" ry="4" fill="#BFA6DF" opacity="0.55" transform="rotate(-22 25 27)" />
      <path d="M20 30c3-4 7-5 10-2" stroke="#3F3156" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 30c-3-4-7-5-10-2" stroke="#3F3156" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="32" r="2.4" fill="#32273F" />
      <circle cx="39" cy="32" r="2.4" fill="#32273F" />
      <path d="M22 40c6 7 14 7 20 0" stroke="#3F3156" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 41l2 5M38 41l-2 5" stroke="#F2EAFB" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}
