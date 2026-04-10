import { getFlagUrl } from "@/data/countries";

interface CountryFlagProps {
  country: string;
  size?: number;
  className?: string;
}

export default function CountryFlag({ country, size = 20, className = "" }: CountryFlagProps) {
  const flagUrl = getFlagUrl(country);
  if (!flagUrl) return null;
  return (
    <img
      src={flagUrl}
      alt={country}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block object-cover rounded-sm ${className}`}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
