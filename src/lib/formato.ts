const locale = "es-PA";

export function fmtNum(n: number): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** Moneda en balboas panameños (B/.), paridad 1:1 con USD. */
export function fmtMoneda(n: number): string {
  return `B/. ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)}`;
}

export function fmtPct(n: number, decimales = 1): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}
