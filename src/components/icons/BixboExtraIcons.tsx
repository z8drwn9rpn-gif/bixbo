import type { SVGProps } from "react";

export type ExtraIconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: ExtraIconProps) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...rest}>{children}</svg>;
}

function Shadow() { return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />; }

export function BixboMoreIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="21" cy="32" r="6" fill="#879b4c"/><circle cx="32" cy="32" r="6" fill="#879b4c"/><circle cx="43" cy="32" r="6" fill="#879b4c"/></Base>; }
export function BixboShieldIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 8 50 16v14c0 13-8 21-18 26-10-5-18-13-18-26V16L32 8Z" fill="#8ba7d2" stroke="#5878aa" strokeWidth="2"/><path d="m23 31 6 6 12-13" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></Base>; }
export function BixboBanIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="32" r="20" fill="#e7a29a" stroke="#b44c43" strokeWidth="3"/><path d="M19 19 45 45" stroke="#9f3e38" strokeWidth="5" strokeLinecap="round"/></Base>; }
export function BixboHandIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M20 36V22c0-3 4-3 4 0v8-13c0-3 4-3 4 0v13-15c0-3 4-3 4 0v15-12c0-3 4-3 4 0v13-8c0-3 4-3 4 0v15c0 10-7 16-16 16-8 0-13-5-16-12-1-3 3-5 5-2l7 6Z" fill="#edb77f" stroke="#b27d50" strokeWidth="2" strokeLinejoin="round"/></Base>; }
export function BixboLipsIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M12 32c8-9 14-11 20-6 6-5 12-3 20 6-8 9-14 11-20 11S20 41 12 32Z" fill="#df6b82" stroke="#a7475d" strokeWidth="2"/><path d="M17 32c8 2 22 2 30 0" stroke="#a7475d" strokeWidth="2" strokeLinecap="round"/></Base>; }
export function BixboTargetIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="19" fill="#f3c1ca" stroke="#b95f73" strokeWidth="2"/><circle cx="32" cy="31" r="11" fill="#fff0f3"/><circle cx="32" cy="31" r="5" fill="#d86178"/></Base>; }
export function BixboRingIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="18" fill="#d9e3f4" stroke="#718db9" strokeWidth="5"/><circle cx="32" cy="31" r="8" fill="#f6f8fb"/></Base>; }
export function BixboPetalIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 10c6 7 10 12 10 19 0 4-2 7-4 10 4-2 8-2 13 0-3 8-9 13-19 14-10-1-16-6-19-14 5-2 9-2 13 0-2-3-4-6-4-10 0-7 4-12 10-19Z" fill="#e996b1" stroke="#bd6682" strokeWidth="2"/></Base>; }
export function BixboSpiralIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M14 31c3-13 22-18 33-9 10 8 4 23-9 23-10 0-12-10-6-14 5-4 12 1 8 7" stroke="#8d78bd" strokeWidth="4" fill="none" strokeLinecap="round"/></Base>; }
export function BixboBubbleIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="22" cy="34" r="10" fill="#b79ad6"/><circle cx="38" cy="27" r="9" fill="#9d7bc6"/><circle cx="40" cy="42" r="8" fill="#c9b4e0"/><circle cx="22" cy="20" r="5" fill="#dfd1ef"/></Base>; }
export function BixboBatteryIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><rect x="16" y="17" width="30" height="34" rx="6" fill="#8fa75d" stroke="#65783e" strokeWidth="2"/><rect x="46" y="27" width="5" height="14" rx="2" fill="#65783e"/><path d="M23 35h16" stroke="#f0cf63" strokeWidth="6" strokeLinecap="round"/></Base>; }
export function BixboInfoIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#dce7b1" stroke="#6f8240" strokeWidth="2"/><circle cx="32" cy="23" r="3" fill="#60733a"/><path d="M32 31v13" stroke="#60733a" strokeWidth="4" strokeLinecap="round"/></Base>; }
