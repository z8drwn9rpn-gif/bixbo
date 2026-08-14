import type { ComponentType, SVGProps } from "react";
import {
  HeartIcon,
  StarIcon,
  NoteIcon,
  CalendarIcon,
  TaskIcon,
  LeafIcon,
  WarningIcon,
  FoodIcon,
  WorkoutIcon,
  SleepIcon,
  ThermometerIcon,
  BlueberryIcon,
  PillIcon,
} from "./BixboExtraIcons";

type P = SVGProps<SVGSVGElement> & { size?: number };
type C = ComponentType<P>;

function S({ size = 18, children, ...rest }: P) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...rest}>{children}</svg>;
}
function Sh() { return <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity=".12" />; }

function Smile(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#f1cf6a" stroke="#bd9b3d" strokeWidth="2"/><circle cx="24" cy="27" r="2.6" fill="#5f5438"/><circle cx="40" cy="27" r="2.6" fill="#5f5438"/><path d="M22 36c5 7 15 7 20 0" stroke="#5f5438" strokeWidth="3" strokeLinecap="round"/></S>}
function Laugh(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#f1cf6a" stroke="#bd9b3d" strokeWidth="2"/><path d="M21 25l6 2M43 25l-6 2" stroke="#5f5438" strokeWidth="3" strokeLinecap="round"/><path d="M21 35c6 11 16 11 22 0H21Z" fill="#7e3d43"/><path d="M17 31c-4 5-4 9 0 12M47 31c4 5 4 9 0 12" stroke="#69a9d6" strokeWidth="3" strokeLinecap="round"/></S>}
function Sad(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#9fb4df" stroke="#6f86b9" strokeWidth="2"/><circle cx="24" cy="27" r="2.6" fill="#4f5d82"/><circle cx="40" cy="27" r="2.6" fill="#4f5d82"/><path d="M22 42c5-7 15-7 20 0" stroke="#4f5d82" strokeWidth="3" strokeLinecap="round"/><path d="M44 31c4 5 4 10 0 14" stroke="#7cc1e6" strokeWidth="3" strokeLinecap="round"/></S>}
function Angry(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#e87c67" stroke="#b15348" strokeWidth="2"/><path d="M20 23l9 4M44 23l-9 4" stroke="#6e3431" strokeWidth="3" strokeLinecap="round"/><circle cx="25" cy="30" r="2.4" fill="#6e3431"/><circle cx="39" cy="30" r="2.4" fill="#6e3431"/><path d="M23 42c5-5 13-5 18 0" stroke="#6e3431" strokeWidth="3" strokeLinecap="round"/></S>}
function LoveFace(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#f1cf6a" stroke="#bd9b3d" strokeWidth="2"/><path d="M18 26c0-5 7-7 9-2 2-5 9-3 9 2 0 5-9 9-9 9s-9-4-9-9ZM36 26c0-5 7-7 9-2 2-5 9-3 9 2 0 5-9 9-9 9s-9-4-9-9Z" fill="#e35d7a" transform="scale(.72) translate(8 8)"/><path d="M24 39c5 5 11 5 16 0" stroke="#5f5438" strokeWidth="3" strokeLinecap="round"/></S>}
function Person(p:P){return <S {...p}><Sh/><circle cx="32" cy="21" r="10" fill="#d8b08a"/><path d="M15 51c2-13 9-20 17-20s15 7 17 20H15Z" fill="#8fa75d" stroke="#65783e" strokeWidth="2"/></S>}
function People(p:P){return <S {...p}><Sh/><circle cx="23" cy="22" r="8" fill="#d5aa84"/><circle cx="42" cy="22" r="8" fill="#e4c39e"/><path d="M10 51c2-12 7-19 13-19 7 0 12 7 13 19H10Z" fill="#789453"/><path d="M29 51c2-12 7-19 13-19 7 0 12 7 13 19H29Z" fill="#c9d49b"/></S>}
function Hand(p:P){return <S {...p}><Sh/><path d="M20 38V23c0-3 4-3 4 0v9-14c0-3 4-3 4 0v14-16c0-3 4-3 4 0v16-13c0-3 4-3 4 0v13-8c0-3 4-3 4 0v15c0 10-7 16-16 16-8 0-13-5-16-12-1-3 3-5 5-2l7 7Z" fill="#e8b17d" stroke="#af7a4e" strokeWidth="2"/></S>}
function Paw(p:P){return <S {...p}><Sh/><circle cx="20" cy="23" r="6" fill="#9b7d5b"/><circle cx="32" cy="18" r="6" fill="#9b7d5b"/><circle cx="44" cy="23" r="6" fill="#9b7d5b"/><path d="M17 42c0-9 7-15 15-15s15 6 15 15c0 7-6 11-15 11s-15-4-15-11Z" fill="#b6966d" stroke="#806547" strokeWidth="2"/></S>}
function Flower(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="7" fill="#e9bd4a"/><g fill="#e38aa4" stroke="#b9687e" strokeWidth="1.5"><circle cx="32" cy="16" r="9"/><circle cx="47" cy="28" r="9"/><circle cx="41" cy="45" r="9"/><circle cx="23" cy="45" r="9"/><circle cx="17" cy="28" r="9"/></g></S>}
function Tree(p:P){return <S {...p}><Sh/><rect x="28" y="35" width="8" height="18" rx="3" fill="#8c6547"/><circle cx="32" cy="24" r="17" fill="#79a75f"/><circle cx="20" cy="29" r="10" fill="#8bb96b"/><circle cx="44" cy="29" r="10" fill="#6f9857"/></S>}
function Cloud(p:P){return <S {...p}><Sh/><path d="M17 45h31c8 0 11-10 5-15-2-2-5-3-8-2-2-9-10-15-19-13-7 1-12 7-13 14-8 0-11 8-8 13 2 2 6 3 12 3Z" fill="#d9e0e8" stroke="#8c9aaa" strokeWidth="2"/></S>}
function Rain(p:P){return <S {...p}><Sh/><path d="M17 35h31c8 0 11-10 5-15-2-2-5-3-8-2-2-9-10-14-19-12-7 1-12 6-13 13-8 0-11 8-8 13 2 2 6 3 12 3Z" fill="#d9e0e8" stroke="#8c9aaa" strokeWidth="2"/><g stroke="#65a7d3" strokeWidth="4" strokeLinecap="round"><path d="M20 43l-3 7M32 43l-3 7M44 43l-3 7"/></g></S>}
function Snow(p:P){return <S {...p}><Sh/><g stroke="#6db6df" strokeWidth="4" strokeLinecap="round"><path d="M32 10v44M13 21l38 22M51 21 13 43"/><path d="M32 18l-5-4M32 18l5-4M32 46l-5 4M32 46l5 4"/></g></S>}
function Sun(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="13" fill="#f2c958" stroke="#c69d32" strokeWidth="2"/><g stroke="#d2a83b" strokeWidth="4" strokeLinecap="round"><path d="M32 7v7M32 48v7M8 31h7M49 31h7M15 14l5 5M44 43l5 5M49 14l-5 5M20 43l-5 5"/></g></S>}
function Car(p:P){return <S {...p}><Sh/><path d="M12 39l5-15c1-4 5-7 9-7h12c4 0 8 3 9 7l5 15v10H12V39Z" fill="#8fa75d" stroke="#63783e" strokeWidth="2"/><rect x="20" y="23" width="24" height="11" rx="4" fill="#dfe9ee"/><circle cx="20" cy="49" r="5" fill="#4b5147"/><circle cx="44" cy="49" r="5" fill="#4b5147"/></S>}
function Plane(p:P){return <S {...p}><Sh/><path d="M8 35 28 30 42 10c2-3 6-2 6 2l-6 18 13 6c2 1 2 4 0 5l-15 1-10 12h-6l5-13-21 0c-3 0-4-5 0-6Z" fill="#83a8d6" stroke="#5d7ca7" strokeWidth="2"/></S>}
function Home(p:P){return <S {...p}><Sh/><path d="M8 30 32 10l24 20" stroke="#6f8240" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 28v24h36V28L32 14 14 28Z" fill="#efecd7" stroke="#8b9572" strokeWidth="2"/><rect x="27" y="36" width="10" height="16" rx="3" fill="#789055"/></S>}
function Gift(p:P){return <S {...p}><Sh/><rect x="12" y="26" width="40" height="28" rx="5" fill="#e59aab" stroke="#b7687c" strokeWidth="2"/><rect x="9" y="20" width="46" height="10" rx="4" fill="#efb4c2"/><path d="M32 20v34" stroke="#f1d46a" strokeWidth="5"/><path d="M31 20c-13 0-15-14-7-14 6 0 8 7 8 14ZM33 20c13 0 15-14 7-14-6 0-8 7-8 14Z" fill="#f1d46a"/></S>}
function Party(p:P){return <S {...p}><Sh/><path d="M18 52 30 18l19 19-31 15Z" fill="#e8b64d" stroke="#b58731" strokeWidth="2"/><path d="M25 34l13 13" stroke="#e56775" strokeWidth="5"/><g fill="#8e7bc3"><circle cx="43" cy="14" r="4"/><circle cx="52" cy="24" r="3"/><circle cx="28" cy="10" r="3"/></g></S>}
function Music(p:P){return <S {...p}><Sh/><path d="M29 16v27c0 6-5 10-11 10s-10-3-10-8 4-8 10-8c3 0 5 1 7 2V13l29-6v26c0 6-5 10-11 10s-10-3-10-8 4-8 10-8c3 0 5 1 7 2V11l-21 5Z" fill="#8d7fc4" stroke="#6658a3" strokeWidth="2"/></S>}
function Camera(p:P){return <S {...p}><Sh/><rect x="9" y="20" width="46" height="32" rx="8" fill="#9ba6ae" stroke="#68737b" strokeWidth="2"/><path d="M22 20l4-7h12l4 7" fill="#b9c1c7" stroke="#68737b" strokeWidth="2"/><circle cx="32" cy="36" r="10" fill="#dce6ed" stroke="#647d8d" strokeWidth="3"/><circle cx="32" cy="36" r="5" fill="#7299b4"/></S>}
function Phone(p:P){return <S {...p}><Sh/><rect x="20" y="7" width="24" height="48" rx="7" fill="#dfe4e6" stroke="#68777a" strokeWidth="2"/><rect x="24" y="13" width="16" height="31" rx="3" fill="#8ea9ba"/><circle cx="32" cy="49" r="2.5" fill="#68777a"/></S>}
function Book(p:P){return <S {...p}><Sh/><path d="M9 15c9-4 16-2 23 4v34c-7-6-14-8-23-4V15Z" fill="#e8dfc4" stroke="#998c6e" strokeWidth="2"/><path d="M55 15c-9-4-16-2-23 4v34c7-6 14-8 23-4V15Z" fill="#f3ecd7" stroke="#998c6e" strokeWidth="2"/><path d="M32 19v34" stroke="#998c6e" strokeWidth="2"/></S>}
function Lock(p:P){return <S {...p}><Sh/><rect x="14" y="28" width="36" height="26" rx="7" fill="#d7be65" stroke="#9d8337" strokeWidth="2"/><path d="M21 28v-8c0-8 5-13 11-13s11 5 11 13v8" stroke="#8f7b48" strokeWidth="5" strokeLinecap="round"/><circle cx="32" cy="40" r="4" fill="#7b6938"/></S>}
function Key(p:P){return <S {...p}><Sh/><circle cx="22" cy="28" r="11" fill="#e5c85f" stroke="#a88d35" strokeWidth="2"/><path d="M31 34 51 52M43 44l5-5M47 48l5-5" stroke="#a88d35" strokeWidth="5" strokeLinecap="round"/></S>}
function Money(p:P){return <S {...p}><Sh/><rect x="9" y="16" width="46" height="36" rx="7" fill="#b7cc87" stroke="#768c4c" strokeWidth="2"/><circle cx="32" cy="34" r="10" fill="#e6efd0"/><path d="M32 26v16M37 29c-3-3-10-2-10 2 0 5 10 2 10 7 0 4-7 5-11 1" stroke="#6e8448" strokeWidth="2.5" strokeLinecap="round"/></S>}
function Coffee(p:P){return <S {...p}><Sh/><path d="M13 23h34v17c0 9-6 14-17 14S13 49 13 40V23Z" fill="#eee7d7" stroke="#8b7b67" strokeWidth="2"/><path d="M17 25c5-5 21-5 26 0-5 6-21 6-26 0Z" fill="#8e6648"/><path d="M47 28h4c6 0 6 11 0 12h-4" stroke="#8b7b67" strokeWidth="3"/></S>}
function Drink(p:P){return <S {...p}><Sh/><path d="M17 10h30l-5 43H22L17 10Z" fill="#dcebf0" stroke="#7e9198" strokeWidth="2"/><path d="M21 29h22l-3 20H24l-3-20Z" fill="#e5a2ad"/><path d="M38 10l8-6" stroke="#89a05d" strokeWidth="3" strokeLinecap="round"/></S>}
function Cake(p:P){return <S {...p}><Sh/><path d="M12 29h40v24H12V29Z" fill="#dfa78f" stroke="#a9725d" strokeWidth="2"/><path d="M12 29c6-9 11-10 16-3 5-7 10-6 15 0 3-3 6-3 9 0v7H12v-4Z" fill="#f1e2cf"/><circle cx="32" cy="18" r="4" fill="#dc5967"/></S>}
function Ball(p:P){return <S {...p}><Sh/><circle cx="32" cy="31" r="20" fill="#e8b34d" stroke="#b47e2e" strokeWidth="2"/><path d="M17 20c12 6 20 17 27 31M18 43c10-5 18-16 27-30" stroke="#ffffff" strokeWidth="3" opacity=".8"/></S>}

const MAP = new Map<string,C>();
const add=(icon:C, emojis:string[])=>emojis.forEach(e=>MAP.set(e.replace(/\uFE0F/g,""),icon));

add(Smile,["😀","😃","😄","😁","🙂","😊","☺️","😌","😇","🤗","🤭","🫢","🫣","🤓","😎","🥳"]);
add(Laugh,["😆","😅","😂","🤣","😹"]);
add(Sad,["😔","😞","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😿","😓"]);
add(Angry,["😠","😡","🤬","👿","😤"]);
add(LoveFace,["😍","🥰","😘","😗","😙","😚","😻"]);
add(HeartIcon,["❤️","❤","🩷","🧡","💛","💚","💙","🩵","💜","🤎","🖤","🩶","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"]);
add(Person,["👤","👨","👩","🧑","👱","👴","👵","🧔","👧","👦","🧒","👶","🧕","👳","👮","👷","💂","🕵️","👩‍⚕️","👨‍⚕️","👩‍🏫","👨‍🏫","👩‍💻","👨‍💻","👩‍🍳","👨‍🍳"]);
add(People,["👥","👫","👬","👭","🧑‍🤝‍🧑","👪","👨‍👩‍👧","👨‍👩‍👦","👨‍👩‍👧‍👦","👩‍❤️‍👩","👨‍❤️‍👨","💑","💏"]);
add(Hand,["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","🤲","🤝","🙏","✍️","💅"]);
add(Paw,["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪲","🐞","🦋","🐌","🐢","🐍","🦎","🦂","🦀","🐙","🦑","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🦩","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔"]);
add(Flower,["🌸","🌺","🌷","🌹","🥀","🌻","🌼","💐","🪻","🪷"]);
add(Tree,["🌳","🌲","🌴","🌵","🎄","🪴","🌱","🌿","🍃","🍂","🍁","☘️","🍀","🎋","🎍"]);
add(Sun,["☀️","🌞","🌅","🌄"]);
add(Cloud,["☁️","⛅","🌥️","🌤️","🌫️"]);
add(Rain,["🌧️","⛈️","🌦️","☔","💦"]);
add(Snow,["❄️","☃️","⛄","🌨️"]);
add(Car,["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍️","🚲","🛴"]);
add(Plane,["✈️","🛫","🛬","🚀","🚁","🛸"]);
add(Home,["🏠","🏡","🏘️","🏢","🏬","🏥","🏫","🏨","🏪","🏦"]);
add(Gift,["🎁","🎀","💝"]);
add(Party,["🎉","🎊","🎈","🪅","🎆","🎇","🧨","🥳"]);
add(Music,["🎵","🎶","🎼","🎤","🎧","🎹","🥁","🎷","🎺","🎸","🪕","🎻"]);
add(Camera,["📷","📸","🎥","📹","🎞️"]);
add(Phone,["📱","☎️","📞","⌚","💻","🖥️","⌨️","🖱️"]);
add(Book,["📖","📚","📕","📗","📘","📙","📓","📔","📒","📃","📄","📰","🗞️"]);
add(NoteIcon,["📝","✏️","✒️","🖊️","🖋️","🖌️","🖍️","📌","📍","📎","🗒️"]);
add(CalendarIcon,["📅","🗓️","📆","⏰","⏱️","⏲️","🕒","⌛","⏳"]);
add(TaskIcon,["✅","✔️","☑️","❎","❌"]);
add(Lock,["🔒","🔓","🔐","🔏"]);
add(Key,["🔑","🗝️"]);
add(Money,["💰","💵","💶","💷","💴","💳","🪙","💸","🧾"]);
add(Coffee,["☕","🍵","🫖"]);
add(Drink,["🥤","🧋","🧃","🍹","🍸","🍷","🥂","🍺","🍻","🍼"]);
add(Cake,["🎂","🍰","🧁","🍩","🍪","🍫","🍬","🍭","🍮","🍯"]);
add(FoodIcon,["🍽️","🍴","🥄","🔪","🥢","🍱","🍛","🍜","🍝","🍕","🍔","🍟","🌭","🥪","🌮","🌯","🥗","🍲","🥣"]);
add(BlueberryIcon,["🫐","🍓","🍇","🍒","🍑","🍎","🍏","🍐","🍊","🍋","🍌","🍉","🍈","🍍","🥭","🥝","🍅"]);
add(LeafIcon,["🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🫘","🥜","🌰"]);
add(PillIcon,["💊","💉","🩹","🩺","🩻","🧬","🦠"]);
add(ThermometerIcon,["🌡️","🤒","🥵","🥶"]);
add(SleepIcon,["🌙","🌛","🌜","😴","💤","🛏️"]);
add(WorkoutIcon,["🏃","🏃‍♀️","🏃‍♂️","🚶","🚶‍♀️","🚶‍♂️","🏋️","🏋️‍♀️","🏋️‍♂️","🤸","🧘","🏊","🚴","⛹️","🤾","🏌️","🏄","⛷️","🏂","🧗"]);
add(Ball,["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏"]);
add(StarIcon,["⭐","🌟","✨","💫","⚡","🔥","💥","🌈","🎯","🏆","🥇","🥈","🥉","🏅","🎖️"]);
add(WarningIcon,["⚠️","🚫","⛔","🛑","❗","❕","❓","❔","‼️","⁉️"]);

export function keyboardEmojiIcon(emoji: string): C | undefined {
  const normalized = emoji.replace(/\uFE0F/g, "").replace(/\p{Emoji_Modifier}/gu, "");
  return MAP.get(normalized) ?? MAP.get(normalized.replace(/\u200D/g, ""));
}
