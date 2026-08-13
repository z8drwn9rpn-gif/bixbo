import { useId, type SVGProps } from "react";

export type BixboSemanticIconName =
  | "oral" | "masturbation" | "more" | "prohibited" | "shield"
  | "great" | "good" | "okay" | "uncomfortable" | "bad"
  | "painYes" | "during" | "after" | "both"
  | "lowerBelly" | "pelvis" | "vagina" | "vulva" | "lowerBack"
  | "cramps" | "pelvicPain" | "vaginalPain" | "burning" | "irritation"
  | "dryness" | "itching" | "spotting" | "bleeding" | "discharge"
  | "bloating" | "nausea" | "headache" | "dizziness" | "fatigue"
  | "hotFlash" | "tetany" | "panic" | "urinary" | "none"
  | "orgasmYes" | "orgasmNo" | "privacy";

type Props = SVGProps<SVGSVGElement> & { name: BixboSemanticIconName; size?: number };

const palette = {
  olive: "#7f9346",
  oliveDark: "#53692f",
  oliveLight: "#c7d58d",
  cream: "#eef2d1",
  pink: "#de6688",
  rose: "#c94f63",
  peach: "#e7a479",
  red: "#d84a46",
  blue: "#7197c6",
  teal: "#62a7a0",
  purple: "#9374c5",
  gold: "#d8b45d",
  ink: "#334023",
};

function Base({ size = 18, children, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...rest}>{children}</svg>;
}

function Shadow() { return <ellipse cx="32" cy="56" rx="15" ry="3.2" fill="#1f2b14" opacity=".12" />; }

function Bubble({ fill = palette.cream }: { fill?: string }) {
  return <><circle cx="32" cy="31" r="23" fill={fill}/><circle cx="25" cy="23" r="7" fill="#fff" opacity=".28"/></>;
}

function Face({ mood }: { mood: "great" | "good" | "okay" | "uncomfortable" | "bad" }) {
  const fill = mood === "bad" ? "#9eb4d7" : mood === "uncomfortable" ? "#e4b277" : mood === "okay" ? "#dfc783" : "#e6ca68";
  const mouth = mood === "great" ? "M21 38c5 7 17 7 22 0" : mood === "good" ? "M23 39c4 4 14 4 18 0" : mood === "okay" ? "M23 40h18" : "M22 43c5-5 15-5 20 0";
  return <><Shadow/><Bubble fill={fill}/><circle cx="24" cy="29" r="2.8" fill={palette.ink}/><circle cx="40" cy="29" r="2.8" fill={palette.ink}/><path d={mouth} stroke={palette.ink} strokeWidth="3" strokeLinecap="round"/></>;
}

export function BixboSemanticIcon({ name, size = 18, ...rest }: Props) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = `bxsem${gid}`;
  const shell = (children: React.ReactNode) => <Base size={size} {...rest}><defs><linearGradient id={grad} x1="14" y1="10" x2="50" y2="54"><stop stopColor="#fff" stopOpacity=".42"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient></defs>{children}</Base>;

  if (["great","good","okay","uncomfortable","bad"].includes(name)) return shell(<Face mood={name as "great"|"good"|"okay"|"uncomfortable"|"bad"}/>);

  switch (name) {
    case "oral": return shell(<><Shadow/><path d="M10 33c7-10 15-14 22-7 7-7 15-3 22 7-7 11-16 16-22 16S17 44 10 33Z" fill={palette.pink}/><path d="M13 33c10 1 28 1 38 0" stroke="#a33c58" strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="24" cy="25" rx="7" ry="3" fill="#fff" opacity=".35"/></>);
    case "masturbation": return shell(<><Shadow/><path d="M20 47V29c0-3 4-3 4 0V18c0-3 4-3 4 0v10V14c0-3 4-3 4 0v14V16c0-3 4-3 4 0v15-9c0-3 4-3 4 0v18c0 10-6 15-14 15-7 0-12-3-16-8l-5-7c-2-3 2-6 5-4l10 7" fill={palette.peach} stroke="#b97955" strokeWidth="1.8" strokeLinejoin="round"/><path d="M19 30c5 0 8 3 9 7" stroke="#fff" strokeWidth="2.5" opacity=".35" strokeLinecap="round"/></>);
    case "more": return shell(<><Shadow/>{[20,32,44].map(cx=><circle key={cx} cx={cx} cy="32" r="6" fill={palette.olive}/>)}</>);
    case "prohibited": return shell(<><Shadow/><circle cx="32" cy="31" r="20" fill="#f0d6d2" stroke={palette.red} strokeWidth="4"/><path d="M18 17l28 28" stroke={palette.red} strokeWidth="5" strokeLinecap="round"/></>);
    case "shield": return shell(<><Shadow/><path d="M32 8 51 15v14c0 13-8 22-19 27-11-5-19-14-19-27V15l19-7Z" fill="#8fa1d0" stroke="#5e6fa3" strokeWidth="2"/><path d="m22 31 7 7 14-16" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>);
    case "painYes": return shell(<><Shadow/><circle cx="32" cy="31" r="22" fill={palette.red}/><path d="M32 18v17" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><circle cx="32" cy="43" r="3" fill="#fff"/></>);
    case "during": return shell(<><Shadow/><path d="M8 37c7-12 13-12 20 0s13 12 20 0 8-10 10-6" stroke={palette.blue} strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M10 24c8-7 15-7 22 0" stroke="#aec9e7" strokeWidth="4" fill="none" strokeLinecap="round"/></>);
    case "after": return shell(<><Shadow/><circle cx="32" cy="31" r="21" fill="#eef0f4" stroke={palette.blue} strokeWidth="3"/><path d="M32 18v14l10 6" stroke="#526f9e" strokeWidth="4" strokeLinecap="round"/></>);
    case "both": return shell(<><Shadow/><circle cx="26" cy="31" r="15" fill="#d9e4f4" stroke={palette.blue} strokeWidth="2"/><circle cx="38" cy="31" r="15" fill="#e7ddf4" stroke={palette.purple} strokeWidth="2" opacity=".88"/></>);
    case "lowerBelly": return shell(<><Shadow/><circle cx="32" cy="31" r="20" fill="#f3e6dd"/><circle cx="32" cy="35" r="8" fill={palette.rose}/><circle cx="32" cy="35" r="3" fill="#fff"/><path d="M20 17c7 5 17 5 24 0" stroke={palette.olive} strokeWidth="3" strokeLinecap="round"/></>);
    case "pelvis": return shell(<><Shadow/><path d="M18 15c2 12 3 18 9 23l-5 11h20l-5-11c6-5 7-11 9-23-8 5-20 5-28 0Z" fill="#cbd5e6" stroke="#7484aa" strokeWidth="2"/><ellipse cx="32" cy="35" rx="7" ry="5" fill="#fff" opacity=".55"/></>);
    case "vagina": return shell(<><Shadow/><path d="M32 8c8 11 15 20 15 29a15 15 0 1 1-30 0c0-9 7-18 15-29Z" fill="#db7aa5"/><path d="M32 22v22" stroke="#fff" strokeWidth="3" opacity=".6" strokeLinecap="round"/></>);
    case "vulva": return shell(<><Shadow/><path d="M32 8c5 9 16 11 18 23-2 12-13 16-18 23-5-7-16-11-18-23 2-12 13-14 18-23Z" fill="#e79bb6"/><path d="M32 17c-4 7-7 11-7 15s3 9 7 15c4-6 7-11 7-15s-3-8-7-15Z" fill="#bd5f83"/><ellipse cx="25" cy="21" rx="4" ry="2.5" fill="#fff" opacity=".3"/></>);
    case "lowerBack": return shell(<><Shadow/><path d="M25 10c-4 8-5 15-3 22 2 8 0 14-6 20h32c-6-6-8-12-6-20 2-7 1-14-3-22-4 4-10 6-14 0Z" fill="#d8c7b3"/><path d="M32 19v24" stroke={palette.red} strokeWidth="4" strokeLinecap="round"/><path d="m25 34 7-7 7 7" stroke={palette.red} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>);
    case "cramps": return shell(<><Shadow/><path d="M35 7 17 34h13l-2 23 19-31H34l1-19Z" fill={palette.gold} stroke="#b78d31" strokeWidth="1.5"/></>);
    case "pelvicPain": return shell(<><Shadow/><path d="M18 15c2 12 3 18 9 23l-5 11h20l-5-11c6-5 7-11 9-23-8 5-20 5-28 0Z" fill="#d8ddeb"/><circle cx="32" cy="37" r="7" fill={palette.red}/></>);
    case "vaginalPain": return shell(<><Shadow/><path d="M32 8c8 11 15 20 15 29a15 15 0 1 1-30 0c0-9 7-18 15-29Z" fill="#d98aae"/><circle cx="32" cy="38" r="6" fill={palette.red}/></>);
    case "burning": return shell(<><Shadow/><path d="M34 6c1 8-4 12-9 18-5 5-8 10-8 17 0 9 7 15 15 15s15-6 15-15c0-7-3-12-8-17-1 5-4 7-7 7 2-8 4-16 2-25Z" fill="#ef6941"/><path d="M32 34c1 4 5 6 5 11 0 4-3 7-6 7s-6-3-6-7c0-5 5-7 7-11Z" fill="#ffd25f"/></>);
    case "irritation": return shell(<><Shadow/><circle cx="32" cy="31" r="20" fill="#f2d2cc"/><circle cx="32" cy="31" r="14" stroke={palette.red} strokeWidth="3" strokeDasharray="4 4"/><circle cx="32" cy="31" r="4" fill={palette.red}/></>);
    case "dryness": return shell(<><Shadow/><path d="M31 9c7 10 13 17 13 25a12 12 0 0 1-20 9c10 1 13-9 9-16-2-4-3-8-2-18Z" fill="#8bc0bb"/><path d="m14 49 36-36" stroke="#c99574" strokeWidth="3" strokeLinecap="round"/></>);
    case "itching": return shell(<><Shadow/><circle cx="32" cy="31" r="18" fill="#d8e1b5"/><path d="M20 25c5-6 7 6 12 0s8 6 13 0M20 37c5-6 7 6 12 0s8 6 13 0" stroke={palette.olive} strokeWidth="3" strokeLinecap="round"/></>);
    case "spotting": return shell(<><Shadow/><path d="M25 12c6 8 10 13 10 19a10 10 0 0 1-20 0c0-6 4-11 10-19Z" fill="#d85d5b"/><circle cx="43" cy="43" r="6" fill="#e38d88"/><circle cx="50" cy="31" r="4" fill="#e9aaa5"/></>);
    case "bleeding": return shell(<><Shadow/><path d="M32 6c9 12 16 20 16 29a16 16 0 1 1-32 0c0-9 7-17 16-29Z" fill="#c64043"/><ellipse cx="25" cy="27" rx="5" ry="3" fill="#fff" opacity=".28"/></>);
    case "discharge": return shell(<><Shadow/><path d="M32 7c8 11 15 20 15 29a15 15 0 1 1-30 0c0-9 7-18 15-29Z" fill="#76aee1"/><ellipse cx="25" cy="25" rx="5" ry="3" fill="#fff" opacity=".35"/></>);
    case "bloating": return shell(<><Shadow/><circle cx="31" cy="32" r="19" fill="#b7a1d7"/><circle cx="19" cy="20" r="7" fill="#d2c5e5"/><circle cx="45" cy="19" r="6" fill="#8f74bd"/><circle cx="46" cy="42" r="8" fill="#c0addc"/><circle cx="30" cy="28" r="5" fill="#fff" opacity=".2"/></>);
    case "nausea": return shell(<><Face mood="uncomfortable"/><path d="M22 48h20" stroke="#6e8c46" strokeWidth="3" strokeLinecap="round"/></>);
    case "headache": return shell(<><Shadow/><circle cx="32" cy="31" r="21" fill="#edc7aa"/><path d="M18 17c8-9 23-9 29 2" stroke="#6e6a65" strokeWidth="5" strokeLinecap="round"/><path d="m32 17-5 11 8-2-5 13" stroke={palette.red} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>);
    case "dizziness": return shell(<><Shadow/><path d="M14 32c2-13 34-14 37-2 2 9-22 13-29 6-5-5 8-11 18-7" stroke={palette.purple} strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="18" cy="20" r="4" fill="#c6b6df"/><circle cx="48" cy="18" r="3" fill="#d8cee8"/></>);
    case "fatigue": return shell(<><Shadow/><rect x="14" y="19" width="34" height="26" rx="7" fill="#d8e3b9" stroke={palette.olive} strokeWidth="2"/><rect x="48" y="27" width="4" height="10" rx="2" fill={palette.olive}/><rect x="19" y="24" width="8" height="16" rx="3" fill={palette.olive}/></>);
    case "hotFlash": return shell(<><Shadow/><path d="M18 46c-4-8 6-12 2-21M31 48c-5-9 6-13 1-25M44 46c-4-8 6-12 2-21" stroke="#e76449" strokeWidth="5" strokeLinecap="round" fill="none"/></>);
    case "tetany": return shell(<><Shadow/><path d="M35 7 17 34h13l-2 23 19-31H34l1-19Z" fill="#e6bc54"/><circle cx="47" cy="17" r="5" fill="#f1d994"/><circle cx="15" cy="47" r="4" fill="#f1d994"/></>);
    case "panic": return shell(<><Shadow/><circle cx="32" cy="31" r="21" fill="#a98bd3"/><circle cx="24" cy="27" r="3" fill="#332a4b"/><circle cx="40" cy="27" r="3" fill="#332a4b"/><path d="M23 42c3-5 5 3 9-1s6 4 9-1" stroke="#332a4b" strokeWidth="3" strokeLinecap="round"/><path d="M12 13l5 5M52 13l-5 5" stroke="#d8c8ef" strokeWidth="3" strokeLinecap="round"/></>);
    case "urinary": return shell(<><Shadow/><path d="M32 7c8 11 15 20 15 29a15 15 0 1 1-30 0c0-9 7-18 15-29Z" fill="#71abd9"/><path d="M22 39c6 5 14 5 20 0" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><circle cx="25" cy="29" r="2" fill="#fff"/><circle cx="39" cy="29" r="2" fill="#fff"/></>);
    case "none": return shell(<><Shadow/><path d="M14 44C11 24 24 10 50 9c2 23-11 38-31 38" fill="#86b65f"/><path d="M17 47c8-14 17-22 31-31" stroke="#edf4db" strokeWidth="3" strokeLinecap="round"/></>);
    case "orgasmYes": return shell(<><Shadow/><path d="M32 53 10 32C0 20 15 7 27 17l5 5 5-5C49 7 64 20 54 32L32 53Z" fill="#df6688"/><ellipse cx="22" cy="22" rx="7" ry="4" fill="#fff" opacity=".3"/></>);
    case "orgasmNo": return shell(<><Shadow/><circle cx="32" cy="31" r="19" fill="#d9d5c0" stroke="#7c7a6f" strokeWidth="3"/><circle cx="32" cy="31" r="5" fill="#fff" opacity=".55"/></>);
    case "privacy": return shell(<><Shadow/><circle cx="32" cy="31" r="20" fill="#dfe7be" stroke={palette.olive} strokeWidth="2"/><circle cx="32" cy="22" r="3" fill={palette.oliveDark}/><path d="M32 29v14" stroke={palette.oliveDark} strokeWidth="4" strokeLinecap="round"/></>);
  }
}
