import { useId } from "react";
import type { IconProps } from "@/components/icons/BixboIcons";

function gid(prefix: string) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return `${prefix}${id}`;
}

function BaseSvg({ size = 56, children, ...rest }: IconProps) {
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

export function BottomNavHomeIcon(props: IconProps) {
  const roof = gid("bnHomeRoof");
  const wall = gid("bnHomeWall");
  const bush = gid("bnHomeBush");
  return (
    <BaseSvg {...props}>
      <defs>
        <linearGradient id={roof} x1="12" y1="12" x2="50" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AEBF6C" />
          <stop offset="0.46" stopColor="#7F9648" />
          <stop offset="1" stopColor="#566B30" />
        </linearGradient>
        <linearGradient id={wall} x1="22" y1="24" x2="38" y2="53" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDE9" />
          <stop offset="0.65" stopColor="#ECEBCB" />
          <stop offset="1" stopColor="#D2D3A6" />
        </linearGradient>
        <radialGradient id={bush} cx="0.35" cy="0.25" r="0.9">
          <stop stopColor="#B8CA77" />
          <stop offset="0.65" stopColor="#859B4C" />
          <stop offset="1" stopColor="#637538" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="23" ry="4.2" fill="#34451F" opacity="0.14" />
      <path d="M15 29.5L31.4 15.3C32.6 14.3 34.3 14.3 35.5 15.4L50.5 29.4V50.4C50.5 53.2 48.2 55.5 45.4 55.5H19.9C17.2 55.5 15 53.3 15 50.6V29.5Z" fill={`url(#${wall})`} stroke="#CDD0A4" strokeWidth="1" />
      <path d="M8.8 30.1L29.3 11.7C31.4 9.8 34.6 9.8 36.7 11.7L56 29.2" stroke={`url(#${roof})`} strokeWidth="8.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.2 26.9L31.5 13.1C32.5 12.2 34 12.2 35 13.1L50.4 26.9" stroke="#D8E49D" strokeOpacity="0.42" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="18.7" y="35.4" width="8.7" height="8.2" rx="2.1" fill="#718540" />
      <path d="M29.5 55V39.7C29.5 36.5 32.1 33.9 35.3 33.9C38.5 33.9 41.1 36.5 41.1 39.7V55" fill="#768B42" />
      <path d="M31.3 40.6C32.5 37.7 35.9 36.1 38.7 37.1" stroke="#B8C97A" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="45.3" cy="48.8" r="8.6" fill={`url(#${bush})`} />
      <circle cx="52.2" cy="51.5" r="6.5" fill="#8DA44E" />
      <circle cx="40.4" cy="53" r="6.2" fill="#9DB45B" />
    </BaseSvg>
  );
}

export function BottomNavOverviewIcon(props: IconProps) {
  const brain = gid("bnBrain");
  return (
    <BaseSvg {...props}>
      <defs>
        <radialGradient id={brain} cx="0.33" cy="0.25" r="0.9">
          <stop stopColor="#C3D47B" />
          <stop offset="0.42" stopColor="#96AD57" />
          <stop offset="1" stopColor="#61783A" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56.5" rx="20" ry="3.6" fill="#34451F" opacity="0.12" />
      <path d="M32 13C24.8 10.8 18.3 14.1 16.5 20.3C11.6 21.6 9.2 26.5 11.1 31C8.6 35.2 10.4 40.4 14.5 42.6C14.7 48 19.7 51.6 24.7 50.1C27.2 53.5 31.6 54.2 35 51.7C38.5 54.3 43.4 53.5 45.6 49.7C50.2 50.3 54.1 46.7 53.8 42.2C57.8 39.6 58.5 34.5 55.4 31.1C57.2 26.6 54.5 21.5 49.8 20.6C47.5 14.1 40.3 11.2 34 13.2L32 13Z" fill={`url(#${brain})`} stroke="#6E843E" strokeWidth="1.1" />
      <g stroke="#617638" strokeWidth="2.4" strokeLinecap="round" opacity="0.88">
        <path d="M31.6 16.5V48.5" />
        <path d="M25.6 18.2C21 19.4 19.5 23.9 21.5 27.1C17.9 28.6 17.4 33.6 20.1 35.9C17.7 38.3 19.2 42.6 22.6 43.1" />
        <path d="M38.3 17.5C43 18.7 44.4 23.2 42.4 26.4C46.4 27.8 47 32.9 44 35.4C46.4 37.9 44.9 42.4 41.3 42.9" />
        <path d="M25.3 29.1C28 28.5 29.7 30.1 30.4 32" />
        <path d="M38.9 29C36.3 28.4 34.5 30.1 33.9 31.9" />
        <path d="M25 39C27.7 38.6 29.5 40.2 30.2 42" />
        <path d="M39.1 38.8C36.5 38.4 34.8 40 34.1 41.8" />
      </g>
      <g stroke="#778D42" strokeWidth="2.8" strokeLinecap="round">
        <path d="M22 9L18.5 4.8" />
        <path d="M32 7.2V2.8" />
        <path d="M42.1 8.9L45.6 4.7" />
      </g>
      <path d="M18.8 20.2C21.8 16.1 26 15 29.3 16" stroke="#D8E6A0" strokeWidth="2" strokeLinecap="round" opacity="0.42" />
    </BaseSvg>
  );
}

export function BottomNavLogIcon(props: IconProps) {
  const button = gid("bnLog");
  return (
    <BaseSvg {...props}>
      <defs>
        <radialGradient id={button} cx="0.36" cy="0.22" r="0.86">
          <stop stopColor="#A8BC68" />
          <stop offset="0.42" stopColor="#738B43" />
          <stop offset="1" stopColor="#425729" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="57.8" rx="22.5" ry="4.5" fill="#33431F" opacity="0.22" />
      <circle cx="32" cy="30.7" r="27" fill={`url(#${button})`} stroke="#4A5E2D" strokeWidth="1.8" />
      <path d="M20 17.5C26.2 12.6 35.8 11.4 43.2 15.1" stroke="#D7E59F" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <rect x="28.1" y="15.5" width="7.8" height="30.5" rx="3.9" fill="#FFFCE4" />
      <rect x="16.7" y="26.9" width="30.6" height="7.8" rx="3.9" fill="#FFFCE4" />
      <path d="M29.4 17.3H34.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </BaseSvg>
  );
}

export function BottomNavCoupleIcon(props: IconProps) {
  const dark = gid("bnCoupleDark");
  const light = gid("bnCoupleLight");
  const heart = gid("bnCoupleHeart");
  return (
    <BaseSvg {...props}>
      <defs>
        <radialGradient id={dark} cx="0.34" cy="0.26" r="0.9">
          <stop stopColor="#A8BB66" />
          <stop offset="0.55" stopColor="#789044" />
          <stop offset="1" stopColor="#4E632D" />
        </radialGradient>
        <radialGradient id={light} cx="0.34" cy="0.25" r="0.9">
          <stop stopColor="#FFFDE9" />
          <stop offset="0.58" stopColor="#ECEBCB" />
          <stop offset="1" stopColor="#C7C99D" />
        </radialGradient>
        <radialGradient id={heart} cx="0.35" cy="0.22" r="0.92">
          <stop stopColor="#FFB3C1" />
          <stop offset="0.5" stopColor="#EC718A" />
          <stop offset="1" stopColor="#C64F69" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="22" ry="4" fill="#34451F" opacity="0.12" />
      <circle cx="23.5" cy="21.5" r="9.2" fill={`url(#${dark})`} />
      <circle cx="40.7" cy="21.5" r="9.2" fill={`url(#${light})`} stroke="#D8D8B9" strokeWidth="0.8" />
      <path d="M10.7 50.8V42.4C10.7 34.9 16.7 28.8 24.2 28.8C31.7 28.8 37.8 34.9 37.8 42.4V50.8H10.7Z" fill={`url(#${dark})`} />
      <path d="M27 50.8V42.4C27 34.9 33 28.8 40.5 28.8C48 28.8 54.1 34.9 54.1 42.4V50.8H27Z" fill={`url(#${light})`} stroke="#D6D7B3" strokeWidth="0.7" />
      <path d="M32.2 51.8C30.9 50.2 22.8 43.1 22.8 37.2C22.8 33.4 25.7 30.8 29.2 30.8C31.4 30.8 33.3 31.9 34.5 33.6C35.8 31.9 37.7 30.8 39.8 30.8C43.3 30.8 46.3 33.4 46.3 37.2C46.3 43.1 38.2 50.2 36.8 51.8C35.6 53.1 33.4 53.1 32.2 51.8Z" fill={`url(#${heart})`} stroke="#CB5A72" strokeWidth="0.8" />
      <ellipse cx="29" cy="34.3" rx="2.4" ry="1.4" fill="#FFF" opacity="0.4" transform="rotate(-25 29 34.3)" />
    </BaseSvg>
  );
}

export function BottomNavNoteIcon(props: IconProps) {
  const paper = gid("bnNotePaper");
  const pencil = gid("bnNotePencil");
  return (
    <BaseSvg {...props}>
      <defs>
        <linearGradient id={paper} x1="20" y1="10" x2="45" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDEB" />
          <stop offset="0.7" stopColor="#ECEBCB" />
          <stop offset="1" stopColor="#D7D8AF" />
        </linearGradient>
        <linearGradient id={pencil} x1="30" y1="47" x2="53" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#58712E" />
          <stop offset="0.58" stopColor="#8FAA51" />
          <stop offset="1" stopColor="#BBD077" />
        </linearGradient>
      </defs>
      <ellipse cx="33" cy="57" rx="20" ry="4" fill="#34451F" opacity="0.12" />
      <rect x="17" y="9" width="35" height="46" rx="6" fill={`url(#${paper})`} stroke="#D1D1A9" strokeWidth="1" />
      <g stroke="#647A39" strokeWidth="3.2" strokeLinecap="round">
        <path d="M15 16H22" />
        <path d="M15 23H22" />
        <path d="M15 30H22" />
        <path d="M15 37H22" />
        <path d="M15 44H22" />
      </g>
      <path d="M40.8 16.7C44.4 13.4 48 13.4 50.4 13.9C48.8 17.2 46 19.4 42.6 19.5C41.3 19.6 40.3 18 40.8 16.7Z" fill="#7D9547" />
      <g transform="rotate(-43 42 38)">
        <rect x="38.2" y="23.5" width="8" height="27" rx="3.2" fill={`url(#${pencil})`} stroke="#607A35" strokeWidth="0.8" />
        <rect x="38.2" y="22" width="8" height="7.1" rx="3" fill="#EF7C99" />
        <path d="M38.2 50.5L42.2 58L46.2 50.5H38.2Z" fill="#D7B979" />
        <path d="M41 55.7L42.2 58L43.4 55.7H41Z" fill="#485B2C" />
        <path d="M39.8 26C41.1 24.8 43.2 24.7 44.6 25.5" stroke="#DDE9A9" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      </g>
    </BaseSvg>
  );
}
