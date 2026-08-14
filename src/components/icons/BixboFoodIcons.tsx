import type { ComponentType, SVGProps } from "react";
import { Ico as BaseIco, IcoText as BaseIcoText } from "./BixboExtraIcons";

type P = SVGProps<SVGSVGElement> & { size?: number };
type C = ComponentType<P>;
function S({size=18,children,...p}:P){return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...p}>{children}</svg>}
function Sh(){return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity=".12"/>}
function Matcha(p:P){return <S {...p}><Sh/><path d="M14 25h36v13c0 10-7 16-18 16S14 48 14 38V25Z" fill="#eef0df" stroke="#7e8c62" strokeWidth="2"/><path d="M18 26c4-7 24-7 28 0-4 8-24 8-28 0Z" fill="#7fa35b"/><path d="M49 30h4c5 0 6 10 0 12h-4" stroke="#7e8c62" strokeWidth="3"/></S>}
function Cola(p:P){return <S {...p}><Sh/><path d="M22 10h20l-2 8v30c0 5-3 7-8 7s-8-2-8-7V18l-2-8Z" fill="#b94d45" stroke="#87352f" strokeWidth="2"/><rect x="23" y="27" width="18" height="12" rx="5" fill="#efe8d7"/></S>}
function Banana(p:P){return <S {...p}><Sh/><path d="M15 18c5 21 17 31 37 24-4 10-15 14-25 9C15 45 9 31 11 19l4-1Z" fill="#f0cf55" stroke="#b69b39" strokeWidth="2"/><path d="M13 18c2-5 5-7 9-8" stroke="#7d8b48" strokeWidth="4"/></S>}
function Bread(p:P){return <S {...p}><Sh/><path d="M13 28c0-11 9-18 19-18s19 7 19 18v20c0 4-3 7-7 7H20c-4 0-7-3-7-7V28Z" fill="#dfb778" stroke="#a57d4d" strokeWidth="2"/><path d="M22 19c4 4 6 8 6 13M34 16c4 4 6 8 6 13" stroke="#f2d8a6" strokeWidth="4"/></S>}
function Pasta(p:P){return <S {...p}><Sh/><path d="M11 31h42c-1 13-8 21-21 21S12 44 11 31Z" fill="#f0eee1" stroke="#8f957d" strokeWidth="2"/><path d="M18 31c3-10 8-14 14-14s11 4 14 14" fill="#e5c25c"/><path d="M20 28c8-6 16-6 25 0M22 23c6-4 14-4 20 0" stroke="#c99b37" strokeWidth="3"/></S>}
function Rice(p:P){return <S {...p}><Sh/><path d="M12 32h40c-1 13-8 20-20 20S13 45 12 32Z" fill="#ece9dc" stroke="#8d927c" strokeWidth="2"/><path d="M17 32c3-9 8-14 15-14s12 5 15 14" fill="#f8f4e8"/></S>}
function Pizza(p:P){return <S {...p}><Sh/><path d="M16 48 29 12c2-4 5-4 7 0l13 36c-10 6-23 6-33 0Z" fill="#edc865" stroke="#aa7e3e" strokeWidth="2"/><circle cx="30" cy="30" r="5" fill="#cc6056"/><circle cx="39" cy="39" r="4" fill="#8ba15a"/></S>}
function Egg(p:P){return <S {...p}><Sh/><path d="M32 9c8 0 18 17 18 29a18 18 0 0 1-36 0C14 26 24 9 32 9Z" fill="#f2f0e5" stroke="#a8a895" strokeWidth="2"/><circle cx="32" cy="38" r="10" fill="#efc34e"/></S>}
function Cheese(p:P){return <S {...p}><Sh/><path d="M12 27 42 12l10 13v25H12V27Z" fill="#e6c252" stroke="#a88b32" strokeWidth="2"/><circle cx="27" cy="31" r="5" fill="#c49e3a"/><circle cx="41" cy="39" r="4" fill="#c49e3a"/></S>}
function Fish(p:P){return <S {...p}><Sh/><path d="M12 32c9-12 24-14 36-5l8-7v24l-8-7c-12 9-27 7-36-5Z" fill="#78a8c7" stroke="#4f7995" strokeWidth="2"/><circle cx="38" cy="29" r="2.5" fill="#324d60"/></S>}
function Salad(p:P){return <S {...p}><Sh/><path d="M11 32h42c-1 13-9 20-21 20S12 45 11 32Z" fill="#eeeee4" stroke="#899076" strokeWidth="2"/><path d="M18 32c3-12 8-18 14-18s11 6 14 18" fill="#79a45f"/><circle cx="24" cy="28" r="5" fill="#e8b54d"/><circle cx="37" cy="24" r="6" fill="#d96c63"/></S>}
function Cake(p:P){return <S {...p}><Sh/><path d="M13 31h38v22H13V31Z" fill="#dfad92" stroke="#a8735d" strokeWidth="2"/><path d="M13 31c5-8 10-9 15-3 5-6 10-5 15 0 3-3 6-3 8 0v7H13v-4Z" fill="#f0e2d0"/></S>}
const R:{terms:string[];icon:C}[]=[
 {terms:["matcha","green tea","zeleny caj"],icon:Matcha},{terms:["coca cola","coca-cola","coke","cola","pepsi"],icon:Cola},{terms:["banana","banan"],icon:Banana},
 {terms:["bread","toast","bagel","muffin","chlieb","pecivo","focaccia"],icon:Bread},{terms:["pasta","spaghetti","orzo","cestovin"],icon:Pasta},{terms:["rice","risotto","ryza","rizoto"],icon:Rice},
 {terms:["pizza"],icon:Pizza},{terms:["egg","vajce","vajick"],icon:Egg},{terms:["cheese","feta","cheddar","syr"],icon:Cheese},{terms:["salmon","sardine","fish","losos","sardink","ryba"],icon:Fish},
 {terms:["salad","salat","zelenina","vegetable","veggie"],icon:Salad},{terms:["cake","brownie","dessert","sweet","kolac","sladk"],icon:Cake}
];
function n(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim()}
export function semanticIconForLabel(label?:string):C|undefined{if(!label)return;const x=n(label);return R.find(r=>r.terms.some(t=>x.includes(n(t))))?.icon}
export function SemanticIco({label,fallbackEmoji,size=18,className}:{label?:string;fallbackEmoji?:string;size?:number;className?:string}){const Cmp=semanticIconForLabel(label);if(Cmp)return <Cmp size={size} className={className}/>;return fallbackEmoji?<BaseIco e={fallbackEmoji} size={size} className={className}/>:null}
const E=/\p{Extended_Pictographic}/u;
export function SemanticIcoText({text,size=16,className}:{text:string;size?:number;className?:string}){const Cmp=E.test(text)?undefined:semanticIconForLabel(text);if(!Cmp)return <BaseIcoText text={text} size={size} className={className}/>;return <span className={["inline-flex items-center gap-1.5",className].filter(Boolean).join(" ")}><Cmp size={size}/><span>{text}</span></span>}
