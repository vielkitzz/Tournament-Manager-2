import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function SubstitutionIcon({ size = 24, className, ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      <path
        stroke="#4CAF50"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m3 16 4 4 4-4M7 20V4"
      ></path>
      <path
        stroke="#EF5350"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m21 8-4-4-4 4M17 4v16"
      ></path>
    </svg>
  );
}
