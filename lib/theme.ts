export const fonts: Record<string, string> = {
 'Montserrat': "'Montserrat',Arial,sans-serif",
 'Cormorant Garamond': "'Cormorant Garamond',Georgia,serif",
 'Poppins': "'Poppins',Montserrat,Arial,sans-serif",
 'Inter': "'Inter',Montserrat,Arial,sans-serif",
 'Manrope': "'Manrope',Montserrat,Arial,sans-serif",
 'Playfair Display': "'Playfair Display',Georgia,serif",
 'Georgia': "Georgia,'Times New Roman',serif",
 'Sans-serif del sistema': "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif",
};
export const fontNames = Object.keys(fonts);
export const weights = ['400', '500', '600', '700', '800'];
const local = ['Montserrat', 'Cormorant Garamond', 'Georgia', 'Sans-serif del sistema'];

const hex = (v: unknown, d: string) => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : d;
const px = (v: unknown, d: number) => Math.round(Math.min(120, Math.max(12, Number(v) || d))) + 'px';
const weight = (v: unknown, d: string) => weights.includes(String(v)) ? String(v) : d;
const font = (v: unknown, d: string) => fonts[String(v)] || fonts[d];

export function themeCss(s: Record<string, any> = {}) {
 return `:root{--serif:${font(s.fontHeading, 'Montserrat')};--sans:${font(s.fontBody, 'Montserrat')};--fw-heading:${weight(s.weightHeading, '700')};--fw-body:${weight(s.weightBody, '500')};--fs-h1:${px(s.sizeH1, 66)};--fs-h2:${px(s.sizeH2, 47)};--gold:${hex(s.colorGold, '#af9768')};--gold-dark:${hex(s.colorGoldDark, '#8c754e')};--ink:${hex(s.colorInk, '#181918')};--charcoal:${hex(s.colorCharcoal, '#302f28')};--cream:${hex(s.colorCream, '#f6f5f1')};--line:${hex(s.colorLine, '#e5e4df')};--fs-body:${px(s.sizeBody, 16)}}`;
}

export function fontStylesheet(s: Record<string, any> = {}) {
 const extra = [s.fontHeading, s.fontBody].filter((f: string) => fontNames.includes(f) && !local.includes(f));
 return extra.length ? 'https://fonts.googleapis.com/css2?' + [...new Set(extra)].map(f => `family=${encodeURIComponent(f)}:wght@400..800`).join('&') + '&display=swap' : '';
}
