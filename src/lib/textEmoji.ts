/**
 * textEmoji.ts
 *
 * Converte códigos de emoji personalizados (estilo Discord) em emojis reais.
 * Módulo puro: sem React, sem Supabase.
 *
 * Regra atual: `<:flag_nb:1501023624507953153>` (e variantes animadas `<a:...>`)
 * representam a bandeira do Brasil 🇧🇷. Nenhum outro código/emoji é alterado.
 */

/** Emoji da bandeira do Brasil. */
export const BRAZIL_FLAG = "🇧🇷";

/** Nomes de emoji personalizados que representam a bandeira do Brasil. */
const BRAZIL_EMOJI_NAMES = ["flag_nb"];

/** Regex de emoji personalizado: <:nome:id> ou <a:nome:id>. */
const CUSTOM_EMOJI_RE = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;

/** Mapeia um código personalizado para o emoji real, ou `undefined` se desconhecido. */
export function customEmojiToUnicode(name: string): string | undefined {
  if (BRAZIL_EMOJI_NAMES.includes(name)) return BRAZIL_FLAG;
  return undefined;
}

/**
 * Substitui os códigos personalizados conhecidos pelo emoji correspondente.
 * Códigos desconhecidos permanecem exatamente como estavam.
 */
export function replaceCustomEmojis(text: string): string {
  if (!text || text.indexOf("<") === -1) return text;
  return text.replace(CUSTOM_EMOJI_RE, (full, name: string) => customEmojiToUnicode(name) ?? full);
}

/** Par de "regional indicators" (ex.: 🇮🇹). */
const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;

/** Converte um emoji de bandeira Unicode no código ISO de 2 letras. */
export function flagEmojiToCode(flag: string): string | undefined {
  const chars = [...flag];
  if (chars.length !== 2) return undefined;
  const code = chars
    .map((c) => String.fromCharCode((c.codePointAt(0)! - 0x1f1e6) + 97))
    .join("");
  return /^[a-z]{2}$/.test(code) ? code : undefined;
}

/** Nome (pt-BR) do país de um emoji de bandeira Unicode. */
export function countryFromFlagEmoji(flag: string): string | undefined {
  const code = flagEmojiToCode(flag);
  if (!code) return undefined;
  return COUNTRIES_DATA.find((c) => c.code.toLowerCase() === code)?.name;
}

/** Limpa sufixos como "- fictício" / "- país fictício" de um nome entre parênteses. */
function cleanParenCountry(value: string): string {
  return value
    .replace(/\s*[-–—]\s*(pa[ií]s\s+)?fict[ií]ci[oa]\s*$/i, "")
    .trim();
}

/**
 * Remove os códigos personalizados conhecidos do texto e devolve o país
 * correspondente (quando houver). Usado na leitura de elencos por texto:
 * o código vale como nacionalidade e não deve entrar no nome do jogador.
 *
 * Também entende emojis de bandeira Unicode (🇮🇹) e códigos personalizados
 * desconhecidos apoiados por um país entre parênteses ("(Lenderênia)").
 */
export function extractCustomEmojiCountry(text: string): {
  text: string;
  country?: string;
  unknownFlag?: boolean;
} {
  if (!text) return { text };
  let country: string | undefined;
  let unknownFlag = false;
  let cleaned = text;

  if (cleaned.indexOf("<") !== -1) {
    cleaned = cleaned.replace(
      /<a?:([a-zA-Z0-9_]+):(\d+)>\s*(\(([^)]+)\))?/g,
      (_full, name: string, _id: string, _paren: string | undefined, inner: string | undefined) => {
        if (BRAZIL_EMOJI_NAMES.includes(name)) {
          if (!country) country = "Brasil";
          return " ";
        }
        const fromParen = inner ? cleanParenCountry(inner) : "";
        if (fromParen) {
          if (!country) country = fromParen;
        } else {
          unknownFlag = true;
        }
        return " ";
      },
    );
  }

  cleaned = cleaned.replace(FLAG_EMOJI_RE, (flag) => {
    const name = countryFromFlagEmoji(flag);
    if (name) {
      if (!country) country = name;
    } else {
      unknownFlag = true;
    }
    return " ";
  });

  const result: { text: string; country?: string; unknownFlag?: boolean } = {
    text: cleaned.replace(/\s{2,}/g, " ").trim(),
  };
  if (country) result.country = country;
  if (unknownFlag && !country) result.unknownFlag = true;
  return result;
}

