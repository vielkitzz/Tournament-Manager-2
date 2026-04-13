import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function OffsideIcon({ size = 24, className, ...props }: Props) {
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
        fill="#FF521E"
        d="M10.978 7.882q.484-.267.975-.527L10.529 3.54C8.148 4.617 5.653 5.69 3 4.625L4.259 9c2.11 1.406 4.358.175 6.718-1.118"
      ></path>
      <path
        fill="#F0FD3B"
        d="M11.952 7.355q-.492.26-.976.528C8.616 9.175 6.368 10.407 4.258 9l1.413 4.91c1.85.864 3.64-.12 5.63-1.213.712-.39 1.448-.795 2.221-1.134z"
      ></path>
      <path
        fill="#FF521E"
        d="M19.39 7c-2.569-1.868-5.056-.9-7.437.355l1.57 4.208c2.128-.934 4.538-1.374 7.477.324z"
      ></path>
      <path
        fill="#F0FD3B"
        d="M11.952 7.355c2.38-1.256 4.868-2.223 7.436-.355l-1.39-4.215c-2.334-1.574-4.743-.482-7.282.67l-.189.085z"
      ></path>
      <path
        stroke="#9CA3AF" /* Troquei o #fff do mastro para cinza para ele não ficar invisível no tema claro! */
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M3 4.625 8 22"
      ></path>
    </svg>
  );
}
