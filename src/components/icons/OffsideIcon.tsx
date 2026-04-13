import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function OffsideIcon({ size = 24, className, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Mastro da bandeira */}
      <path d="M5 22V3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bandeira */}
      <path d="M5 4h10l3 3.5L15 11H5V4z" fill="#FACC15" />
      <path d="M10 4v7M5 7.5h10" stroke="#EA580C" strokeWidth="1.5" />
    </svg>
  );
}