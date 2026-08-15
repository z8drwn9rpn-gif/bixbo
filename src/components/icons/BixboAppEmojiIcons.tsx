import type { ComponentType, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
type C = ComponentType<P>;

function S({ size = 20, children, ...rest }: P) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...rest}>{children}</svg>;
}
function Sh(){return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity=".12"/>;}

function Face({p,fill="#efd067",eye="dot",mouth="smile",accent}:{p:P;fill?:string;eye?:"dot"|"closed"|"wide"|"flat";mouth?:"smile"|"big"|"flat"|"sad"|"wavy";accent?:"tear"|"sweat"|"heart"|"sleep"|"flush"|"none"}){
  const eyes = eye === "closed" ? <g stroke="#584d37" strokeWidth="3" strokeLinecap="round"><path d="M20 28l7-2"/><path d="M44 28l-7-2"/></g> : eye === "wide" ? <g fill="#fff" stroke="#584d37" strokeWidth="2"><circle cx="24" cy="28" r="5"/><circle cx="40" cy="28" r="5"/><circle cx="24" cy="28" r="2" fill="#584d37"/><circle cx="40" cy="28" r="2" fill="#584d37"/></g> : eye === "flat" ? <g stroke="#584d37" strokeWidth="3" strokeLinecap="round"><path d="M20 28h7"/><path d="M37 28h7"/></g> : <g fill="#584d37"><circle cx="24" cy="28" r="2.6"/><circle cx="40" cy="28" r="2.6"/></g>;
  const m = mouth === "big" ? <path d="M20 36c5 11 19 11 24 0H20Z" fill="#7b3e45"/> : mouth === "flat" ? <path d="M23 40h18" stroke="#584d37" strokeWidth="3" strokeLinecap="round"/> : mouth === "sad" ? <path d="M22 43c5-6 15-6 20 0" stroke="#584d37" strokeWidth="3" strokeLinecap="round"/> : mouth === "wavy" ? <path d="M22 40c3-4 5 4 8 0s5 4 8 0 4 3 5 0" stroke="#584d37" strokeWidth="3" fill="none" strokeLinecap="round"/> : <path d="M22 37c5 7 15 7 20 0" stroke="#584d37" strokeWidth="3" strokeLinecap="round"/>;
  return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill={fill} stroke="#8f7b47" strokeWidth="2"/>{eyes}{m}{accent==="tear"&&<path d="M44 32c4 6 4 10 0 14" stroke="#70b6dd" strokeWidth="3" strokeLinecap="round"/>}{accent==="sweat"&&<path d="M46 16c5 7 5 10 0 13-5-3-5-6 0-13Z" fill="#6fb4dc"/>}{accent==="heart"&&<path d="M48 16c0-5 7-6 8-1 1-5 8-4 8 1 0 5-8 9-8 9s-8-4-8-9Z" fill="#df647d" transform="translate(-4 3) scale(.55)"/>}{accent==="sleep"&&<g stroke="#7d6db2" strokeWidth="3" strokeLinecap="round"><path d="M44 15h9l-9 9h9"/><path d="M50 8h6l-6 6h6"/></g>}{accent==="flush"&&<g fill="#e99792" opacity=".8"><circle cx="18" cy="35" r="5"/><circle cx="46" cy="35" r="5"/></g>}</S>;
}
const face=(fill:string,eye:"dot"|"closed"|"wide"|"flat",mouth:"smile"|"big"|"flat"|"sad"|"wavy",accent:"tear"|"sweat"|"heart"|"sleep"|"flush"|"none"="none")=>function F(p:P){return <Face p={p} fill={fill} eye={eye} mouth={mouth} accent={accent}/>;};

const Grin=face("#f1d06b","dot","big");
const Smile=face("#efd067","dot","smile");
const Calm=face("#d9d49b","closed","smile");
const Cool=face("#d8cf73","flat","smile");
const Neutral=face("#dfcc82","dot","flat");
const Blank=face("#d8d7c9","flat","flat");
const Irritated=face("#e7b46f","flat","sad");
const Down=face("#9fb4da","dot","sad");
const Uneasy=face("#d8bf8e","dot","wavy");
const Stressed=face("#d8a880","closed","wavy","sweat");
const Angry=face("#e47c69","wide","sad");
const Crying=face("#9fb7df","dot","sad","tear");
const Frustrated=face("#e28a6e","closed","sad");
const Awful=face("#96acd2","closed","sad","tear");
const Fatigued=face("#b6b9b1","closed","flat","sleep");
const Anxious=face("#b8a4d7","wide","wavy","sweat");
const Sleepy=face("#b8b0d8","closed","flat","sleep");
const Dizzy=face("#c5b8da","wide","wavy");
const Cranky=face("#c79778","flat","sad");
const Grateful=face("#d8ce85","closed","smile","heart");
const Amazing=face("#f0c96d","wide","big","heart");
const InLove=face("#efcb71","closed","smile","heart");
const Bored=face("#c8c4ac","flat","flat");
const Lonely=face("#aebbd8","dot","sad","tear");
const Groggy=face("#b6a5c4","flat","wavy","sleep");
const Hot=face("#e98c72","closed","wavy","flush");
const Cold=face("#8fb7d8","wide","wavy");
const Clingy=face("#d3b1c2","wide","sad","heart");
const Drained=face("#b9b7ad","flat","wavy");
const Invisible=face("#d7d8d0","flat","flat");
const Sick=face("#a6bd79","closed","wavy");
const Sore=face("#d8a08d","closed","sad");

function Muscle(p:P){return <S {...p}><Sh/><path d="M13 42c8-2 11-8 12-17l7 4c2 1 4 0 5-2l4-8c6 3 9 8 10 15 2 11-6 20-18 20-9 0-16-4-20-12Z" fill="#d79a6d" stroke="#9f6c49" strokeWidth="2"/><path d="M25 25c3 5 7 7 12 7" stroke="#f0c6a1" strokeWidth="3" strokeLinecap="round"/></S>}
function Sweat(p:P){return <S {...p}><Sh/><path d="M25 9c8 11 14 18 14 26a14 14 0 0 1-28 0c0-8 6-15 14-26Z" fill="#77b8dc" stroke="#4f87aa" strokeWidth="2"/><path d="M42 22c6 8 10 13 10 19a10 10 0 0 1-20 0c0-6 4-11 10-19Z" fill="#9bd0e9" stroke="#6ea5c2" strokeWidth="2" opacity=".9"/></S>}
function Headache(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#e8bd98" stroke="#aa7e60" strokeWidth="2"/><circle cx="24" cy="31" r="2.5" fill="#654d3f"/><circle cx="40" cy="31" r="2.5" fill="#654d3f"/><path d="M23 42c5-5 13-5 18 0" stroke="#654d3f" strokeWidth="3" strokeLinecap="round"/><path d="M30 9 25 21h7l-3 10 12-16h-7l3-6Z" fill="#d65a50"/></S>}
function Nausea(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#a7bc73" stroke="#72854f" strokeWidth="2"/><circle cx="24" cy="28" r="2.5" fill="#4e5f3b"/><circle cx="40" cy="28" r="2.5" fill="#4e5f3b"/><path d="M22 40c4-4 16-4 20 0" stroke="#4e5f3b" strokeWidth="3" strokeLinecap="round"/><path d="M20 48h24" stroke="#6a8b49" strokeWidth="4" strokeLinecap="round"/></S>}
function Storm(p:P){return <S {...p}><Sh/><path d="M15 39c-7 0-9-11-2-14 1-9 13-13 20-7 8-5 18 0 18 9 7 3 5 12-2 12H15Z" fill="#9aa7b5" stroke="#667483" strokeWidth="2"/><path d="M34 34 25 48h8l-2 10 11-16h-8l4-8Z" fill="#e8c34f"/></S>}
function Runner(p:P){return <S {...p}><Sh/><circle cx="36" cy="14" r="6" fill="#d8aa80"/><path d="m32 22-8 11 8 6 8-9 7 7" stroke="#7c9654" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="m31 39-11 13M34 39l10 14M25 32l-10 1" stroke="#5e7143" strokeWidth="5" strokeLinecap="round"/></S>}
function Moon(p:P){return <S {...p}><Sh/><path d="M43 12c-11 2-18 11-18 21 0 9 6 16 15 19-4 2-9 3-13 2C15 51 8 40 11 28 14 16 26 8 39 10c2 0 3 1 4 2Z" fill="#8d82cf" stroke="#655ba6" strokeWidth="2"/><circle cx="46" cy="18" r="2" fill="#eee9ff"/></S>}
function Dream(p:P){return <S {...p}><Sh/><circle cx="24" cy="35" r="12" fill="#c8bddc"/><circle cx="39" cy="30" r="10" fill="#dacfe8"/><circle cx="48" cy="39" r="7" fill="#b9acd1"/><circle cx="15" cy="49" r="4" fill="#d9d0e6"/></S>}
function Phone(p:P){return <S {...p}><Sh/><rect x="20" y="8" width="24" height="47" rx="6" fill="#4f5961" stroke="#343b40" strokeWidth="2"/><rect x="23" y="13" width="18" height="34" rx="3" fill="#b8cedd"/><circle cx="32" cy="51" r="2" fill="#c7d0d5"/></S>}
function Sun(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="12" fill="#efc44d" stroke="#c2972f" strokeWidth="2"/><g stroke="#cfa238" strokeWidth="4" strokeLinecap="round"><path d="M32 7v7M32 48v7M8 31h7M49 31h7M15 14l5 5M44 43l5 5M49 14l-5 5M20 43l-5 5"/></g></S>}
function Zzz(p:P){return <S {...p}><Sh/><g stroke="#7d72b5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 35h16L12 51h16"/><path d="M28 22h15L28 37h15"/><path d="M42 10h11L42 21h11"/></g></S>}
function Turtle(p:P){return <S {...p}><Sh/><ellipse cx="30" cy="36" rx="20" ry="14" fill="#7fa160" stroke="#587542" strokeWidth="2"/><circle cx="52" cy="35" r="7" fill="#91ad6d"/><path d="M15 28 8 22M15 44 8 50M39 27l5-8M39 45l5 8" stroke="#739453" strokeWidth="5" strokeLinecap="round"/><path d="M18 36h24M30 23v26" stroke="#a9bf83" strokeWidth="2"/></S>}
function Toilet(p:P){return <S {...p}><Sh/><rect x="17" y="10" width="24" height="20" rx="4" fill="#e8ece9" stroke="#87938d" strokeWidth="2"/><path d="M18 31h33c0 14-7 22-18 22S18 45 18 31Z" fill="#f2f3ee" stroke="#87938d" strokeWidth="2"/><path d="M32 52v4h15" stroke="#87938d" strokeWidth="3" strokeLinecap="round"/></S>}
function Leg(p:P){return <S {...p}><Sh/><path d="M27 8c8 0 11 5 10 13l-2 13 8 15-8 6-12-17c-2-3-2-7-1-11l5-19Z" fill="#d9a77d" stroke="#a97855" strokeWidth="2"/><path d="M35 33c-5 3-8 7-9 12" stroke="#cb6b62" strokeWidth="3" strokeLinecap="round"/></S>}
function Thermometer(p:P){return <S {...p}><Sh/><path d="M27 14a7 7 0 0 1 14 0v23a12 12 0 1 1-14 0V14Z" fill="#eff2ec" stroke="#819087" strokeWidth="2"/><path d="M34 18v25" stroke="#db665c" strokeWidth="5" strokeLinecap="round"/><circle cx="34" cy="45" r="7" fill="#db665c"/></S>}
function Alarm(p:P){return <S {...p}><Sh/><circle cx="32" cy="33" r="18" fill="#edf0ea" stroke="#6d7b75" strokeWidth="3"/><path d="M32 21v13l9 5" stroke="#5c738f" strokeWidth="4" strokeLinecap="round"/><path d="M18 12 10 20M46 12l8 8M18 51l-5 6M46 51l5 6" stroke="#6d7b75" strokeWidth="4" strokeLinecap="round"/></S>}
function Bed(p:P){return <S {...p}><Sh/><path d="M10 18v35M54 28v25M10 43h44" stroke="#6c7b79" strokeWidth="4" strokeLinecap="round"/><rect x="13" y="26" width="17" height="12" rx="4" fill="#d7e0d9"/><path d="M30 28h17c4 0 7 3 7 7v8H30V28Z" fill="#a7b993"/></S>}
function Yoga(p:P){return <S {...p}><Sh/><circle cx="32" cy="15" r="6" fill="#d7aa80"/><path d="M32 23v15M18 31l14 7 14-7M21 50c7-7 15-7 22 0M24 39l-8 10M40 39l8 10" stroke="#7e965a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></S>}
function Bolt(p:P){return <S {...p}><Sh/><path d="M35 7 17 34h13l-2 23 19-31H34l1-19Z" fill="#e7c54e" stroke="#b6912f" strokeWidth="2"/></S>}
function Spiral(p:P){return <S {...p}><Sh/><path d="M14 31c3-13 22-18 33-9 10 8 4 23-9 23-10 0-12-10-6-14 5-4 12 1 8 7" stroke="#8c76b6" strokeWidth="4" fill="none" strokeLinecap="round"/></S>}
function Snowflake(p:P){return <S {...p}><Sh/><g stroke="#79a9cb" strokeWidth="4" strokeLinecap="round"><path d="M32 8v48M11 20l42 24M11 44l42-24M25 13l7 7 7-7M25 51l7-7 7 7M14 28l10 2-3-9M50 36l-10-2 3 9M14 36l10-2-3 9M50 28l-10 2 3-9"/></g></S>}
function Heat(p:P){return <S {...p}><Sh/><path d="M20 49c-5-7 5-10 0-17s5-10 0-17M32 49c-5-7 5-10 0-17s5-10 0-17M44 49c-5-7 5-10 0-17s5-10 0-17" stroke="#d87955" strokeWidth="4" fill="none" strokeLinecap="round"/></S>}
function Star(p:P){return <S {...p}><Sh/><path d="m32 8 7 14 16 2-12 11 3 16-14-8-14 8 3-16L9 24l16-2 7-14Z" fill="#dfc45d" stroke="#a98d32" strokeWidth="2"/></S>}
function Avocado(p:P){return <S {...p}><Sh/><path d="M32 8c9 0 18 18 18 30a18 18 0 0 1-36 0C14 26 23 8 32 8Z" fill="#8cad5c" stroke="#617d3d" strokeWidth="2"/><path d="M32 15c6 0 12 14 12 23a12 12 0 0 1-24 0c0-9 6-23 12-23Z" fill="#c7d97e"/><circle cx="32" cy="39" r="8" fill="#9b6c3f"/></S>}
function Chili(p:P){return <S {...p}><Sh/><path d="M17 20c13 3 23 11 31 26-16 5-30-4-31-26Z" fill="#cf4f43" stroke="#96362f" strokeWidth="2"/><path d="M17 20c-2-6 2-11 8-12" stroke="#6e8a45" strokeWidth="4" strokeLinecap="round"/></S>}

const MAP = new Map<string,C>();
const add=(icon:C,emojis:string[])=>emojis.forEach((e)=>MAP.set(e.replace(/\uFE0F/g,"").replace(/\p{Emoji_Modifier}/gu,""),icon));
add(Grin,["😀","😁","😻"]); add(Smile,["🙂","😊"]); add(Calm,["😌"]); add(Cool,["😎"]); add(Neutral,["😐"]); add(Blank,["😑","🫥"]); add(Irritated,["😒"]); add(Down,["😔","😞"]); add(Uneasy,["😕"]); add(Stressed,["😖"]); add(Angry,["😠"]); add(Crying,["😢"]); add(Frustrated,["😤"]); add(Awful,["😩"]); add(Fatigued,["😪"]); add(Anxious,["😰"]); add(Sleepy,["😴"]); add(Dizzy,["😵‍💫"]); add(Cranky,["😾"]); add(Grateful,["🙏"]); add(Amazing,["🤩"]); add(InLove,["🥰"]); add(Bored,["🥱"]); add(Lonely,["🥲"]); add(Groggy,["🥴"]); add(Hot,["🥵"]); add(Cold,["🥶"]); add(Clingy,["🥺"]); add(Drained,["🫠"]); add(Invisible,["🫥"]); add(Sick,["🤢"]); add(Sore,["🤕"]);
add(Muscle,["💪"]); add(Sweat,["💦"]); add(Headache,["🤕"]); add(Nausea,["🤢"]); add(Storm,["🌩️"]); add(Runner,["🏃","🚶"]); add(Moon,["🌙"]); add(Dream,["💭"]); add(Phone,["📱"]); add(Sun,["☀️"]); add(Zzz,["💤"]); add(Turtle,["🐢"]); add(Toilet,["🚽"]); add(Leg,["🦵"]); add(Thermometer,["🌡️"]); add(Alarm,["⏰"]); add(Bed,["🛌","🛏️"]); add(Yoga,["🧘"]); add(Bolt,["⚡"]); add(Spiral,["🌀"]); add(Snowflake,["❄️","🧊"]); add(Heat,["♨️"]); add(Star,["⭐","🌟","✨"]); add(Avocado,["🥑"]); add(Chili,["🌶️"]);

export function appEmojiIcon(emoji:string): C | undefined {
  const normalized=emoji.replace(/\uFE0F/g,"").replace(/\p{Emoji_Modifier}/gu,"");
  return MAP.get(normalized);
}
