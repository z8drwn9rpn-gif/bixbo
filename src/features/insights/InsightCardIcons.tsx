import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

function Shadow() {
  return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />;
}

export function InsightFireIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <Shadow />
      <path d="M34 7c3 10-5 12-2 21 4-4 7-8 8-14 9 8 14 17 12 27-2 10-10 16-20 16S14 50 13 40c-1-10 5-18 13-26 0 7 1 11 5 14 1-8 6-12 3-21Z" fill="#f07c23" stroke="#bd5616" strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 31c4 5 8 8 7 14-1 5-4 8-8 8s-8-3-8-8c0-5 3-9 8-14 0 4 1 7 3 9 1-3 0-6-2-9Z" fill="#ffd05a" />
      <path d="M24 18c-2 5-2 10 1 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
    </IconBase>
  );
}

export function InsightChilliIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <Shadow />
      <path d="M38 15c2-5 6-7 11-6-1 5-4 9-9 11" stroke="#68813d" strokeWidth="5" strokeLinecap="round" />
      <path d="M41 17c-4-4-10-5-15-2-9 5-9 18-4 27 5 8 13 12 24 11-6-3-10-7-12-12-2-6 1-12 7-16 3-2 3-6 0-8Z" fill="#dc3f43" stroke="#9f2e31" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 20c4-3 8-3 11-1" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      <path d="M31 43c3 4 6 6 11 8" stroke="#f57d74" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </IconBase>
  );
}

export function InsightPoopIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <Shadow />
      <path d="M27 11c2 6 0 9-4 12 5-1 9 0 12 4 5-2 10 0 12 4 2 3 1 6-1 8 5 1 8 5 7 10-1 5-5 8-11 8H21c-7 0-12-4-12-10 0-5 4-9 9-9-2-3-1-7 2-9 2-2 5-2 8-1-2-4-2-8-1-12Z" fill="#8b5a38" stroke="#654028" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="25" cy="42" r="2.2" fill="#2f261f" />
      <circle cx="39" cy="42" r="2.2" fill="#2f261f" />
      <path d="M26 49c4 3 8 3 12 0" stroke="#2f261f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M19 31c7-3 15-3 22 0" stroke="#aa7650" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="25" cy="27" rx="7" ry="3" transform="rotate(-18 25 27)" fill="#fff" opacity="0.12" />
    </IconBase>
  );
}
