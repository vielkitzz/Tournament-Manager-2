import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function SubstitutionIcon({ size = 24, className, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Seta Verde para baixo (Sai) */}
      <path d="M9 4v12m0 0-4-4m4 4 4-4" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Seta Vermelha para cima (Entra) */}
      <path d="M15 20V8m0 0-4 4m4-4 4 4" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}