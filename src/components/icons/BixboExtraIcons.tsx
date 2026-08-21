import type { ComponentType, SVGProps } from "react";
import { Ico as BaseIco, type BixboIconName } from "./BixboIcons";

export * from "./BixboIcons";

export type ExtraIconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: ExtraIconProps) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...rest}>{children}</svg>;
}

function Shadow() { return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />; }
function BixboMoreIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="21" cy="32" r="6" fill="#879b4c"/><circle cx="32" cy="32" r="6" fill="#879b4c"/><circle cx="43" cy="32" r="6" fill="#879b4c"/></Base>; }
function BixboShieldIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 8 50 16v14c0 13-8 21-18 26-10-5-18-13-18-26V16L32 8Z" fill="#8ba7d2" stroke="#5878aa" strokeWidth="2"/><path d="m23 31 6 6 12-13" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></Base>; }
function BixboBanIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="32" r="20" fill="#e7a29a" stroke="#b44c43" strokeWidth="3"/><path d="M19 19 45 45" stroke="#9f3e38" strokeWidth="5" strokeLinecap="round"/></Base>; }
function BixboHandIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M20 36V22c0-3 4-3 4 0v8-13c0-3 4-3 4 0v13-15c0-3 4-3 4 0v15-12c0-3 4-3 4 0v13-8c0-3 4-3 4 0v15c0 10-7 16-16 16-8 0-13-5-16-12-1-3 3-5 5-2l7 6Z" fill="#edb77f" stroke="#b27d50" strokeWidth="2" strokeLinejoin="round"/></Base>; }
function BixboLipsIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M12 32c8-9 14-11 20-6 6-5 12-3 20 6-8 9-14 11-20 11S20 41 12 32Z" fill="#df6b82" stroke="#a7475d" strokeWidth="2"/><path d="M17 32c8 2 22 2 30 0" stroke="#a7475d" strokeWidth="2" strokeLinecap="round"/></Base>; }
function BixboTargetIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="19" fill="#c8afff" stroke="#7247d6" strokeWidth="2.6"/><circle cx="32" cy="31" r="11" fill="#f6f1ff" stroke="#8a5bea" strokeWidth="2"/><circle cx="32" cy="31" r="5" fill="#6d32d8"/><path d="M32 6v10M32 46v10M7 31h10M47 31h10" stroke="#6d32d8" strokeWidth="3.6" strokeLinecap="round"/></Base>; }
function BixboRingIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="18" fill="#d9e3f4" stroke="#718db9" strokeWidth="5"/><circle cx="32" cy="31" r="8" fill="#f6f8fb"/></Base>; }
function BixboPetalIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 10c6 7 10 12 10 19 0 4-2 7-4 10 4-2 8-2 13 0-3 8-9 13-19 14-10-1-16-6-19-14 5-2 9-2 13 0-2-3-4-6-4-10 0-7 4-12 10-19Z" fill="#e996b1" stroke="#bd6682" strokeWidth="2"/></Base>; }
function BixboSpiralIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M14 31c3-13 22-18 33-9 10 8 4 23-9 23-10 0-12-10-6-14 5-4 12 1 8 7" stroke="#8d78bd" strokeWidth="4" fill="none" strokeLinecap="round"/></Base>; }
function BixboBubbleIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="22" cy="34" r="10" fill="#b79ad6"/><circle cx="38" cy="27" r="9" fill="#9d7bc6"/><circle cx="40" cy="42" r="8" fill="#c9b4e0"/><circle cx="22" cy="20" r="5" fill="#dfd1ef"/></Base>; }
function BixboBatteryIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><rect x="16" y="17" width="30" height="34" rx="6" fill="#8fa75d" stroke="#65783e" strokeWidth="2"/><rect x="46" y="27" width="5" height="14" rx="2" fill="#65783e"/><path d="M23 35h16" stroke="#f0cf63" strokeWidth="6" strokeLinecap="round"/></Base>; }
function BixboInfoIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#dce7b1" stroke="#6f8240" strokeWidth="2"/><circle cx="32" cy="23" r="3" fill="#60733a"/><path d="M32 31v13" stroke="#60733a" strokeWidth="4" strokeLinecap="round"/></Base>; }
function BixboWaveIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M9 35c6-9 12-9 18 0s12 9 18 0 10-8 13-4" stroke="#6f9fc8" strokeWidth="5" strokeLinecap="round"/><path d="M12 25c5-6 10-6 15 0" stroke="#b5d6ef" strokeWidth="4" strokeLinecap="round"/></Base>; }
function BixboClockIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#edf4fb" stroke="#7292bb" strokeWidth="3"/><path d="M32 19v13l9 6" stroke="#5278a8" strokeWidth="4" strokeLinecap="round"/></Base>; }
function BixboBothIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="26" cy="31" r="13" fill="#d9cdf0" stroke="#876fb4" strokeWidth="3"/><circle cx="38" cy="31" r="13" fill="#c5b4e3" stroke="#876fb4" strokeWidth="3"/></Base>; }
function BixboIrritationIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="12" fill="#ef9a91"/><path d="M32 9v9M32 44v9M10 31h9M45 31h9M16 15l7 7M41 40l7 7M48 15l-7 7M23 40l-7 7" stroke="#bd544c" strokeWidth="4" strokeLinecap="round"/></Base>; }
function BixboSparklesIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="m31 8 3.5 10.5L45 22l-10.5 3.5L31 36l-3.5-10.5L17 22l10.5-3.5L31 8Z" fill="#b993ff" stroke="#7b4bd4" strokeWidth="2"/><path d="m48 33 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#d9c7ff"/><path d="m15 34 1.7 5.3L22 41l-5.3 1.7L15 48l-1.7-5.3L8 41l5.3-1.7L15 34Z" fill="#a77ae8"/></Base>; }
function BixboStarIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="m32 7 7 14 16 2.3-11.5 11.2 2.7 15.8L32 42.8 17.8 50.3l2.7-15.8L9 23.3 25 21 32 7Z" fill="#f6c945" stroke="#c99421" strokeWidth="2.4" strokeLinejoin="round"/><path d="m25 17 4-7 2 11-7 2 1-6Z" fill="#fff4ad" opacity="0.7"/></Base>; }
function BixboMoonIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M43 12c-10 2-17 10-17 20 0 9 6 16 15 19-4 2-8 3-12 2-12-2-20-13-18-25 2-13 14-21 27-18 2 0 4 1 5 2Z" fill="#8f80d7" stroke="#6657a8" strokeWidth="2"/><circle cx="43" cy="19" r="3" fill="#efe8ff"/><circle cx="49" cy="27" r="2" fill="#efe8ff"/></Base>; }
function BixboSunIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="13" fill="#f2c958" stroke="#c69d32" strokeWidth="2"/><g stroke="#d2a83b" strokeWidth="4" strokeLinecap="round"><path d="M32 7v7M32 48v7M8 31h7M49 31h7M15 14l5 5M44 43l5 5M49 14l-5 5M20 43l-5 5"/></g></Base>; }
function BixboSunflowerIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><g fill="#f5c842" stroke="#d49d23" strokeWidth="1.4"><ellipse cx="32" cy="14" rx="6" ry="11"/><ellipse cx="32" cy="46" rx="6" ry="11"/><ellipse cx="16" cy="30" rx="11" ry="6"/><ellipse cx="48" cy="30" rx="11" ry="6"/><ellipse cx="21" cy="19" rx="6" ry="10" transform="rotate(-45 21 19)"/><ellipse cx="43" cy="19" rx="6" ry="10" transform="rotate(45 43 19)"/><ellipse cx="21" cy="41" rx="6" ry="10" transform="rotate(45 21 41)"/><ellipse cx="43" cy="41" rx="6" ry="10" transform="rotate(-45 43 41)"/></g><circle cx="32" cy="30" r="12" fill="#7b4f25" stroke="#5e3a1d" strokeWidth="2"/><circle cx="27" cy="26" r="2" fill="#b47b35"/><circle cx="36" cy="27" r="2" fill="#b47b35"/><circle cx="31" cy="34" r="2" fill="#b47b35"/></Base>; }
function BixboBrainIcon(p: ExtraIconProps) {
  if (p.size === 30) {
    return <Base {...p}>
      <defs>
        <radialGradient id="mentalBrainPink" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22 17) rotate(48) scale(43 41)">
          <stop stopColor="#ffd7e7"/>
          <stop offset="0.38" stopColor="#f58bb5"/>
          <stop offset="0.72" stopColor="#dd5f96"/>
          <stop offset="1" stopColor="#a83e72"/>
        </radialGradient>
        <linearGradient id="mentalBrainDepth" x1="18" y1="14" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb8d3"/>
          <stop offset="1" stopColor="#a83e72"/>
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="16" ry="3.2" fill="#7c3654" opacity="0.2"/>
      <path d="M25 13c-7 0-12 5-12 11 0 3 1 5 3 7-3 2-4 5-3 8 1 5 5 8 10 8 2 5 8 7 13 4 5 3 11 1 13-4 5 0 9-3 10-8 1-3 0-6-3-8 2-2 3-4 3-7 0-6-5-11-12-11-3-4-8-5-12-2-4-3-9-2-10 2Z" fill="url(#mentalBrainPink)" stroke="#a83e72" strokeWidth="2.2"/>
      <path d="M31 15v34M22 21c4 2 5 5 3 9M42 20c-4 2-5 5-3 9M20 38c4-3 8-2 11 1M44 37c-4-3-8-2-11 1M18 31c4-1 7 1 9 4M46 30c-4-1-7 1-9 4" stroke="url(#mentalBrainDepth)" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M20 18c3-3 8-4 11-1M15 27c2-2 4-3 7-2M37 15c3-2 7-1 10 2" stroke="#ffe8f1" strokeWidth="2.4" strokeLinecap="round" opacity="0.72"/>
      <ellipse cx="22" cy="18" rx="5.5" ry="2.5" transform="rotate(-25 22 18)" fill="#fff" opacity="0.38"/>
      <ellipse cx="45" cy="24" rx="3.2" ry="1.6" transform="rotate(24 45 24)" fill="#fff" opacity="0.28"/>
    </Base>;
  }
  return <Base {...p}><Shadow/><path d="M25 13c-7 0-12 5-12 11 0 3 1 5 3 7-3 2-4 5-3 8 1 5 5 8 10 8 2 5 8 7 13 4 5 3 11 1 13-4 5 0 9-3 10-8 1-3 0-6-3-8 2-2 3-4 3-7 0-6-5-11-12-11-3-4-8-5-12-2-4-3-9-2-10 2Z" fill="#a9b97c" stroke="#71804f" strokeWidth="2"/><path d="M31 16v33M22 21c4 2 5 5 3 9M42 20c-4 2-5 5-3 9M21 38c4-3 8-2 10 1M43 37c-4-3-8-2-10 1" stroke="#71804f" strokeWidth="2.5" strokeLinecap="round"/></Base>;
}
function BixboDropIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 9c10 13 16 22 16 31a16 16 0 0 1-32 0c0-9 6-18 16-31Z" fill="#74add9" stroke="#4f82ad" strokeWidth="2"/><path d="M24 40c2 5 7 7 12 5" stroke="#dff3ff" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboBloodDropIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 9c10 13 16 22 16 31a16 16 0 0 1-32 0c0-9 6-18 16-31Z" fill="#d94b55" stroke="#a72a35" strokeWidth="2"/><path d="M24 40c2 5 7 7 12 5" stroke="#ffd9dc" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboFireIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M35 7c3 10-4 13 1 20 2 3 6 1 8-5 8 9 10 18 5 26-4 6-10 9-18 9-11 0-19-7-19-17 0-8 5-15 12-22 0 8 2 12 6 13 6-4 2-13 5-24Z" fill="#ff5b37" stroke="#d53d23" strokeWidth="2"/><path d="M31 31c5 6 7 10 4 15-2 3-7 4-10 1-4-4-2-10 6-16Z" fill="#ffc443"/><path d="M18 41c1 7 5 10 11 12" stroke="#ffb7a6" strokeWidth="3" strokeLinecap="round" opacity=".7"/></Base>; }
function BixboBlueberryIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M37 16c5-8 11-10 17-8-1 7-6 12-15 13" fill="#76a44d" stroke="#537a34" strokeWidth="2"/><g><circle cx="23" cy="34" r="12" fill="#6574d8" stroke="#4454ad" strokeWidth="2"/><circle cx="39" cy="35" r="13" fill="#5668d1" stroke="#3d4ca8" strokeWidth="2"/><circle cx="31" cy="23" r="11" fill="#7887e6" stroke="#5361bb" strokeWidth="2"/><path d="m31 14 2.2 4 4.5.6-3.3 3.1.9 4.4-4.3-2.2-4.2 2.2.8-4.4-3.2-3.1 4.5-.6L31 14Z" fill="#394789"/></g><circle cx="26" cy="29" r="3" fill="#b8c2ff" opacity=".65"/></Base>; }
function BixboChiliIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M38 16c2-6 7-9 13-8-1 6-5 9-11 10" fill="#6e9d42" stroke="#4d7430" strokeWidth="2"/><path d="M39 17c4 3 7 8 6 14-2 13-14 20-30 18 8-3 12-8 14-14 2-7 1-14 10-18Z" fill="#df3f37" stroke="#ad2b27" strokeWidth="2.3"/><path d="M35 21c-3 6-2 12-7 18" stroke="#ff9b85" strokeWidth="3" strokeLinecap="round" opacity=".75"/></Base>; }
function BixboPoopEyesIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M20 49c-7 0-12-4-12-9 0-4 3-7 8-8-2-7 3-12 10-12 1-6 7-10 13-7 5 2 7 7 5 12 6 1 10 5 10 11 0 7-6 13-15 13H20Z" fill="#8b6338" stroke="#624524" strokeWidth="2.2"/><ellipse cx="26" cy="32" rx="7" ry="7.5" fill="#fffdf6"/><ellipse cx="40" cy="32" rx="7" ry="7.5" fill="#fffdf6"/><circle cx="28" cy="33" r="2.8" fill="#25311d"/><circle cx="38" cy="33" r="2.8" fill="#25311d"/><path d="M26 43c4 3 8 3 12 0" stroke="#4d341d" strokeWidth="2.5" strokeLinecap="round"/></Base>; }
function BixboCoffeeIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M14 19h34v22c0 8-6 13-14 13h-6c-8 0-14-5-14-13V19Z" fill="#7d4de0" stroke="#5730aa" strokeWidth="2.5"/><ellipse cx="31" cy="19" rx="17" ry="5" fill="#b69bfa" stroke="#5730aa" strokeWidth="2.5"/><ellipse cx="31" cy="19" rx="12.5" ry="3" fill="#5a3425"/><path d="M48 26h4c6 0 8 4 8 8s-3 8-9 8h-3" stroke="#7247d6" strokeWidth="4" strokeLinecap="round"/><path d="M20 28v11c0 6 4 9 9 10" stroke="#d9caff" strokeWidth="3" strokeLinecap="round" opacity=".62"/></Base>; }
function BixboFoodIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M11 32h42c-1 12-9 19-21 19S12 44 11 32Z" fill="#f3f1e5" stroke="#87916d" strokeWidth="2"/><path d="M17 31c3-10 8-15 15-15s12 5 15 15" fill="#9fbe6f"/><circle cx="24" cy="27" r="6" fill="#efb55b"/><circle cx="34" cy="24" r="6" fill="#d97872"/><circle cx="41" cy="29" r="5" fill="#78a96b"/></Base>; }
function BixboWorkoutIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M12 38h40" stroke="#607aab" strokeWidth="5" strokeLinecap="round"/><rect x="18" y="25" width="8" height="25" rx="4" fill="#91a9d6"/><rect x="38" y="25" width="8" height="25" rx="4" fill="#91a9d6"/><rect x="9" y="29" width="8" height="17" rx="4" fill="#6c86b8"/><rect x="47" y="29" width="8" height="17" rx="4" fill="#6c86b8"/></Base>; }
function BixboShoeIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M13 34c4-1 8-4 11-10l3-6 8 9c4 4 8 6 14 8l6 2c3 1 5 4 4 7-1 4-5 7-10 7H18c-7 0-11-3-11-8 0-4 2-7 6-9Z" fill="#9fb45f" stroke="#66793a" strokeWidth="2" strokeLinejoin="round"/><path d="M9 43h48c0 5-4 8-10 8H19c-6 0-10-3-10-8Z" fill="#f1edd7" stroke="#8b916f" strokeWidth="2"/><path d="M27 27l9 8M23 31l9 8" stroke="#f7f4e8" strokeWidth="3" strokeLinecap="round"/><path d="M16 37c5-1 9-3 12-6" stroke="#dce6ae" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboMedicineIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><g transform="rotate(-36 32 32)"><rect x="13" y="22" width="38" height="20" rx="10" fill="#f3e2a2" stroke="#b69f58" strokeWidth="2"/><path d="M32 22v20" stroke="#c95d5c" strokeWidth="2"/><path d="M32 22h9a10 10 0 0 1 0 20h-9V22Z" fill="#df6e70"/></g></Base>; }
function BixboNoteIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><rect x="15" y="10" width="34" height="43" rx="7" fill="#f0eee2" stroke="#8b9572" strokeWidth="2"/><path d="M22 22h20M22 30h20M22 38h13" stroke="#7b8568" strokeWidth="3" strokeLinecap="round"/><path d="m38 47 9-9 5 5-9 9-6 1 1-6Z" fill="#8bab5f"/></Base>; }
function BixboCalendarIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><rect x="11" y="15" width="42" height="38" rx="8" fill="#f3eee3" stroke="#87916d" strokeWidth="2"/><path d="M11 25h42" stroke="#c96767" strokeWidth="6"/><path d="M21 10v10M43 10v10" stroke="#7e866d" strokeWidth="4" strokeLinecap="round"/><circle cx="24" cy="36" r="3" fill="#8fa75d"/><circle cx="33" cy="36" r="3" fill="#8fa75d"/><circle cx="42" cy="36" r="3" fill="#8fa75d"/></Base>; }
function BixboCheckIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#82b96d" stroke="#5f8c50" strokeWidth="2"/><path d="m21 32 7 7 15-17" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></Base>; }
function BixboThermometerIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M29 14a7 7 0 0 1 14 0v23a12 12 0 1 1-14 0V14Z" fill="#edf1e5" stroke="#87916d" strokeWidth="2"/><path d="M36 18v25" stroke="#df6f62" strokeWidth="5" strokeLinecap="round"/><circle cx="36" cy="45" r="7" fill="#df6f62"/></Base>; }
function BixboScaleIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><rect x="11" y="13" width="42" height="39" rx="10" fill="#d9e4dc" stroke="#7b8f7c" strokeWidth="2"/><path d="M23 25c5-6 13-6 18 0" stroke="#60755f" strokeWidth="3" strokeLinecap="round"/><path d="m32 25 5 8" stroke="#60755f" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboLeafIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M52 10C31 12 16 21 13 39c-2 11 8 17 18 12 14-7 20-23 21-41Z" fill="#83b566" stroke="#5e8f4c" strokeWidth="2"/><path d="M17 47c10-12 18-18 31-29" stroke="#d9edc7" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboWarningIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M32 9 55 50H9L32 9Z" fill="#efbe62" stroke="#bc8b39" strokeWidth="2" strokeLinejoin="round"/><path d="M32 22v15" stroke="#7b5925" strokeWidth="4" strokeLinecap="round"/><circle cx="32" cy="43" r="2.5" fill="#7b5925"/></Base>; }
function BixboSmileIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#f2d77a" stroke="#c7a84c" strokeWidth="2"/><circle cx="25" cy="27" r="2.5" fill="#6f633d"/><circle cx="39" cy="27" r="2.5" fill="#6f633d"/><path d="M23 36c5 6 13 6 18 0" stroke="#6f633d" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboSadIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><circle cx="32" cy="31" r="20" fill="#9ab0df" stroke="#6f86b9" strokeWidth="2"/><circle cx="25" cy="27" r="2.5" fill="#4f5d82"/><circle cx="39" cy="27" r="2.5" fill="#4f5d82"/><path d="M23 42c5-6 13-6 18 0" stroke="#4f5d82" strokeWidth="3" strokeLinecap="round"/></Base>; }
function BixboLightningIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M35 7 16 35h13l-3 22 22-32H35V7Z" fill="#efc34f" stroke="#b78d27" strokeWidth="2" strokeLinejoin="round"/></Base>; }
function BixboBedIcon(p: ExtraIconProps) { return <Base {...p}><Shadow/><path d="M12 44V20M52 44V30" stroke="#687b9f" strokeWidth="4" strokeLinecap="round"/><rect x="14" y="28" width="38" height="15" rx="5" fill="#aabbe0" stroke="#6f82ac" strokeWidth="2"/><rect x="16" y="21" width="14" height="10" rx="4" fill="#e6ebf7"/></Base>; }

type ExtraIconComponent = ComponentType<ExtraIconProps>;
const EXTRA_SYMBOL_ICONS: Record<string, ExtraIconComponent> = {
  ["💋"]: BixboLipsIcon,
  ["✋"]: BixboHandIcon,
  ["•••"]: BixboMoreIcon,
  ["…"]: BixboMoreIcon,
  ["⋯"]: BixboMoreIcon,
  ["🚫"]: BixboBanIcon,
  ["🛡️"]: BixboShieldIcon,
  ["🛡"]: BixboShieldIcon,
  ["🌊"]: BixboWaveIcon,
  ["🕒"]: BixboClockIcon,
  ["◉"]: BixboBothIcon,
  ["🎯"]: BixboTargetIcon,
  ["○"]: BixboRingIcon,
  ["◯"]: BixboRingIcon,
  ["🌸"]: BixboPetalIcon,
  ["◌"]: BixboIrritationIcon,
  ["💢"]: BixboIrritationIcon,
  ["🫧"]: BixboBubbleIcon,
  ["🔋"]: BixboBatteryIcon,
  ["🌀"]: BixboSpiralIcon,
  ["ℹ️"]: BixboInfoIcon,
  ["ℹ"]: BixboInfoIcon,
  ["⭐"]: BixboStarIcon,
  ["⭐️"]: BixboStarIcon,
  ["🌟"]: BixboStarIcon,
  ["✨"]: BixboSparklesIcon,
  ["🌙"]: BixboMoonIcon,
  ["🌛"]: BixboMoonIcon,
  ["🌜"]: BixboMoonIcon,
  ["☀️"]: BixboSunIcon,
  ["☀"]: BixboSunIcon,
  ["🔅"]: BixboSunIcon,
  ["🌻"]: BixboSunflowerIcon,
  ["🧠"]: BixboBrainIcon,
  ["💧"]: BixboDropIcon,
  ["🩸"]: BixboBloodDropIcon,
  ["🔥"]: BixboFireIcon,
  ["🫐"]: BixboBlueberryIcon,
  ["🌶️"]: BixboChiliIcon,
  ["🌶"]: BixboChiliIcon,
  ["💩"]: BixboPoopEyesIcon,
  ["☕"]: BixboCoffeeIcon,
  ["🥗"]: BixboFoodIcon,
  ["🥣"]: BixboFoodIcon,
  ["🏋️"]: BixboWorkoutIcon,
  ["🏋"]: BixboWorkoutIcon,
  ["🏃"]: BixboWorkoutIcon,
  ["👟"]: BixboShoeIcon,
  ["💊"]: BixboMedicineIcon,
  ["💉"]: BixboMedicineIcon,
  ["📝"]: BixboNoteIcon,
  ["📓"]: BixboNoteIcon,
  ["📅"]: BixboCalendarIcon,
  ["🗓"]: BixboCalendarIcon,
  ["✅"]: BixboCheckIcon,
  ["✔️"]: BixboCheckIcon,
  ["✔"]: BixboCheckIcon,
  ["🌡️"]: BixboThermometerIcon,
  ["🌡"]: BixboThermometerIcon,
  ["⚖️"]: BixboScaleIcon,
  ["⚖"]: BixboScaleIcon,
  ["🍃"]: BixboLeafIcon,
  ["🌿"]: BixboLeafIcon,
  ["⚠️"]: BixboWarningIcon,
  ["⚠"]: BixboWarningIcon,
  ["🙂"]: BixboSmileIcon,
  ["😊"]: BixboSmileIcon,
  ["🙁"]: BixboSadIcon,
  ["😟"]: BixboSadIcon,
  ["⚡"]: BixboLightningIcon,
  ["🛏️"]: BixboBedIcon,
  ["🛏"]: BixboBedIcon,
  ["💤"]: BixboBedIcon,
};

const SEMANTIC_SYMBOL_ALIASES: Record<string, string> = {
  pain: "🔥",
  "pain intensity": "🔥",
  period: "🫐",
  "period flow": "🩸",
  flow: "🩸",
  symptoms: "🔅",
  "hot flash": "🌡️",
  "hot flashes": "🌡️",
  headache: "🧠",
  headaches: "🧠",
  pressure: "💢",
  "pressure intensity": "💢",
  bowel: "💩",
  "bowel symptoms": "💩",
  panic: "✨",
  "panic attack": "✨",
  "panic attacks": "✨",
  "panic intensity": "✨",
  tetany: "⚡",
  "tetany episode": "⚡",
  "tetany episodes": "⚡",
  workout: "👟",
  workouts: "👟",
  pcos: "🌻",
  histamine: "🌶️",
  "histamine flare": "🌶️",
  caffeine: "☕",
};

function resolveExtraIcon(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.normalize("NFC");
  const noVariation = normalized.replace(/\uFE0F/g, "");
  const direct = EXTRA_SYMBOL_ICONS[trimmed] ?? EXTRA_SYMBOL_ICONS[normalized] ?? EXTRA_SYMBOL_ICONS[noVariation];
  if (direct) return direct;
  const alias = SEMANTIC_SYMBOL_ALIASES[noVariation.toLowerCase()];
  return alias ? EXTRA_SYMBOL_ICONS[alias] : undefined;
}

export function Ico({ name, e, size = 20, className }: { name?: BixboIconName; e?: string; size?: number; className?: string }) {
  if (!name && (e === "❤️" || e === "❤" || e === "💗" || e === "💖")) {
    return <BaseIco e={e} size={size} className={className} />;
  }
  if (!name && e) {
    const Extra = resolveExtraIcon(e);
    if (Extra) return <Extra size={size} className={["inline-block shrink-0 align-[-0.15em]", className].filter(Boolean).join(" ")} />;
  }
  return <BaseIco name={name} e={e} size={size} className={className} />;
}