import { assertUnreachable, degToTurn, Flavor, lerp, Normalized, wrapDeg, Radians, turnToRad, radToTurn, wrapTurn, approxEqual, clamp } from "./util";

export type Uint8 = Flavor<number, 'Uint8'>
export type Vec3 = [number, number, number];
export type UnitVec3 = [Normalized, Normalized, Normalized]
/// Gamma-encoded, 0-255 sRGB color
export type Uint8SrgbColor = Flavor<[Uint8, Uint8, Uint8], 'Uint8SrgbColor'>;
/// Gamma-encoded, normalized sRGB color
export type NormalizedSrgbColor = Flavor<UnitVec3, 'NormalizedSrgbColor'>
/// Linear, normalized sRGB color
export type LinearSrgbColor = Flavor<UnitVec3, 'LinearSrgbColor'>;
export type HsvColor = Flavor<UnitVec3, 'HsvColor'>;
export type HslColor = Flavor<UnitVec3, 'HslColor'>;
export type OklabColor = Flavor<UnitVec3, 'OklabColor'>;
export type OklchColor = Flavor<UnitVec3, 'OklchColor'>;
export type HueMode = string;

const NO_HUE = 0.0; // Used in cases where hue is indeterminate when converting between coordinate systems
const EPSILON = 1e-7;

export function clampColor(color: UnitVec3): UnitVec3 {
	return color.map(n => clamp(n, 0.0, 1.0)) as UnitVec3
}

export function normalizeColor(rgb: Uint8SrgbColor): NormalizedSrgbColor;
export function normalizeColor(rgb: Vec3): unknown {
	return rgb.map((n) => n/255)
}

export function quantizeColor(rgb: NormalizedSrgbColor): Uint8SrgbColor;
export function quantizeColor(rgb: Vec3): unknown {
	return rgb.map((n) => Math.round(Math.max(0.0, Math.min(n, 1.0)) * 255));
}

export function hexToRgb(hex: string): Uint8SrgbColor {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(_m, r, g, b) {
		return r + r + g + g + b + b;
	});

	let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		throw new RangeError(`Invalid hex: ${hex}`);
	}
	return [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16),
	];
}
export function rgbToHex([r, g, b]: Uint8SrgbColor): string {
	function componentToHex(c: number) {
		let hex = c.toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	}
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/** Using spec-enshrined sRGB transfer function */
export function linearToSrgb(rgb: LinearSrgbColor): NormalizedSrgbColor {
	function componentLinearToSrgb(theLinearValue: number) {
		return theLinearValue <= 0.0031308
			? theLinearValue * 12.92
			: Math.pow(theLinearValue, 1.0/2.4) * 1.055 - 0.055;
	}
	return rgb.map(componentLinearToSrgb) as NormalizedSrgbColor
}
/** Using spec-enshrined sRGB transfer function */
export function srgbToLinear(rgb: NormalizedSrgbColor): LinearSrgbColor {
	function componentSrgbToLinear(thesRGBValue: number) {
		return thesRGBValue <= 0.04045
			? thesRGBValue / 12.92
			: Math.pow ((thesRGBValue + 0.055) / 1.055, 2.4);
	}
	return rgb.map(componentSrgbToLinear) as LinearSrgbColor
}

function srgbHueMinMaxChroma<T>(
		[r, g, b]: NormalizedSrgbColor,
		block: (hue: number, min: number, max: number, chroma: number) => T,
) {
		const min = Math.min(r, g, b);
		const max = Math.max(r, g, b);
		const chroma = max - min

		let h: number
		if (approxEqual(chroma, 0, EPSILON)) h = NO_HUE;
		else if (r === max) h = (g - b) / chroma;
		else if (g === max) h = 2 + (b - r) / chroma;
		else if (b === max) h = 4 + (r - g) / chroma;
		else h = 0.0;
		h = h * 60;

		return block(degToTurn(wrapDeg(h)), min, max, chroma)
}

export function rgbToHsl(color: NormalizedSrgbColor): HslColor {
		return srgbHueMinMaxChroma(color, (h, min, max, chroma) => {
				const l = (min + max) / 2.0
				let s: number;
				if (max === min) s = 0.0;
				if (l <= 0.5) s = chroma / (max + min);
				else s = chroma / (2 - max - min);

				return [h, s, l]
		})
}

export function hslToRgb([h, s, l]: HslColor): NormalizedSrgbColor {
	function hueToRgb(p: number, q: number, t: number): number {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}

	h = wrapTurn(isNaN(h) ? 0.0 : h)
	h = h % 1
	let r, g, b;

	if (approxEqual(s, 0)) {
		r = g = b = l; // achromatic
	} else {

		let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		let p = 2 * l - q;

		r = hueToRgb(p, q, h + 1 / 3);
		g = hueToRgb(p, q, h);
		b = hueToRgb(p, q, h - 1 / 3);
	}

	return [r, g, b];
}

export function rgbToHsv(color: NormalizedSrgbColor): HsvColor {
		return srgbHueMinMaxChroma(color, (h, _min, max, chroma) => {
				let s: number;
				if (max === 0.0) s = 0.0;
				else s = (chroma / max);

				return [h, s, max]
		})
}
export function hsvToRgb([h, s, v]: HsvColor): NormalizedSrgbColor {
	let r: number, g: number, b: number;
	h = wrapTurn(isNaN(h) ? 0.0 : h)

	let i = Math.floor(h * 6);
	let f = h * 6 - i;
	let p = v * (1 - s);
	let q = v * (1 - f * s);
	let t = v * (1 - (1 - f) * s);
	
	switch (i % 6) {
		case 0: r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		case 5: r = v; g = p; b = q; break;
		default: assertUnreachable();
	}

	return [r, g, b];
}


export function oklabToLinearSrgb([L, a, b]: OklabColor): LinearSrgbColor {
	let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	let s_ = L - 0.0894841775 * a - 1.2914855480 * b;

	let l = l_ * l_ * l_;
	let m = m_ * m_ * m_;
	let s = s_ * s_ * s_;

	return [
		(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
	];
}
export function linearSrgbToOklab([r, g, b]: LinearSrgbColor): OklabColor {
	const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
	const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
	const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

	const ll = Math.cbrt(l)
	const mm = Math.cbrt(m)
	const ss = Math.cbrt(s)

	return [
			0.2104542553 * ll + 0.7936177850 * mm - 0.0040720468 * ss,
			1.9779984951 * ll - 2.4285922050 * mm + 0.4505937099 * ss,
			0.0259040371 * ll + 0.7827717662 * mm - 0.8086757660 * ss,
	]
}

export function oklchToOklab([l, c, h]: OklchColor): OklabColor {
	return fromPolarModel(c, h, (a, b) => [l, a, b])
}
export function oklabToOklch([l, a, b]: OklabColor): OklchColor {
	return toPolarModel(a, b, (c, h) => [l, c, h])
}
/// TODO: direct conversion between OKLCH, HSL, HSV that preserves hue?

export function srgbToOklch(color: NormalizedSrgbColor): OklchColor {
	return oklabToOklch(linearSrgbToOklab(srgbToLinear(color)))
}

export function oklchToSrgb(color: OklchColor): NormalizedSrgbColor {
	return linearToSrgb(oklabToLinearSrgb(oklchToOklab(color)))
}

// Used for LAB <-> LCHab, LUV <-> LCHuv, Oklab <-> Oklch, JAB <-> JCH
// https://www.w3.org/TR/css-color-4/#lab-to-lch
// https://bottosson.github.io/posts/oklab/#the-oklab-color-space
// https://en.wikipedia.org/wiki/CIELUV#Cylindrical_representation_.28CIELCH.29
function toPolarModel<T>(a: Normalized, b: Normalized, block: (c: Normalized, h: Normalized) => T): T {
    const c = Math.sqrt(a * a + b * b);
    const h = approxEqual(c, 0, EPSILON) ? NO_HUE : radToTurn(Math.atan2(b, a))
    return block(c, wrapTurn(h))
}
function fromPolarModel<T>(c: Normalized, h: Normalized, block: (a: Normalized, b: Normalized) => T): T {
    const hDegrees: Radians = turnToRad(isNaN(h) ? 0.0 : h)
    const a = c * Math.cos(hDegrees)
    const b = c * Math.sin(hDegrees)
    return block(a, b)
}

export function generateHslPalette(settings: PaletteSettings): NormalizedSrgbColor[] {
	let hslColors = []

	const srgb = clampColor(oklchToSrgb(settings.startingColor));
	const [hueBase, saturationBase, lightnessBase] = rgbToHsl(srgb);
	let saturationStep = lerp(0.1, 1 - saturationBase, settings.saturationStep);
	let lightnessStep = lerp(0.1, 1 - lightnessBase, settings.luminanceStep);
	
	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);

		const hueOffset = paletteStep(i, settings);

		let saturation = saturationBase + linearIterator * saturationStep;
		let lightness = lightnessBase + linearIterator * lightnessStep;

		if (settings.chromaFixed) saturation = settings.saturation ?? saturationBase;
		if (settings.luminanceFixed) lightness = lightnessBase;

		const color = hslToRgb([hueBase + hueOffset, saturation, lightness])
		hslColors.push(color);
	}

	return hslColors;
}

function paletteStep(i: number, settings: PaletteSettings): Normalized {
	const linearIterator = (i) / (settings.colorCount - 1);
	let hueOffset = linearIterator * settings.hueStep;
	if (settings.hueFixed) hueOffset *= 0.0;
	return hueOffset;
}

export function generateHsvPalette(settings: PaletteSettings): NormalizedSrgbColor[] {
	let hsvColors = []

	const [hueBase, saturationBase, valueBase] = rgbToHsv(oklchToSrgb(settings.startingColor));

	let saturationStep = lerp(0.1, 1 - saturationBase, settings.saturationStep);
	let valueStep = lerp(0.1, 1 - valueBase, settings.luminanceStep);

	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);
		const hueOffset = paletteStep(i, settings);

		let saturation = saturationBase + linearIterator * saturationStep;
		let value = valueBase + linearIterator * valueStep;

		if (settings.chromaFixed) saturation = settings.saturation ?? saturationBase;
		if (settings.luminanceFixed) value = valueBase;

		hsvColors.push(hsvToRgb([hueBase + hueOffset, saturation, value]));
	}

	return hsvColors;
}

export function generateOklchPalette(settings: PaletteSettings): NormalizedSrgbColor[] {
	let oklchColors: NormalizedSrgbColor[] = []

	const [lightnessBase, chromaBase, hueBase] = settings.startingColor;
	let chromaStep = lerp(0.075, 0.125 - chromaBase, settings.saturationStep);
	let luminanceStep = lerp(0.3, 1.0 - lightnessBase, settings.luminanceStep);

	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);

		const hueOffset = paletteStep(i, settings);

		let chroma = chromaBase + linearIterator * chromaStep;
		let lightness = lightnessBase + linearIterator * luminanceStep;

		if (settings.chromaFixed) chroma = lerp(0.000, 0.250, settings.saturation) ?? chromaBase;
		if (settings.luminanceFixed) lightness = lightnessBase;

		let lab = oklchToOklab([lightness, chroma, hueBase + hueOffset]);
		let rgb = oklabToLinearSrgb(lab);

		oklchColors.push(linearToSrgb(rgb));
	}

	return oklchColors;
}

export interface PaletteSettings {
	startingColor: OklchColor,

	hueStep: number;
	saturationStep: number;
	luminanceStep: number;

	colorCount: number;

	hueFixed: boolean,
	luminanceFixed: boolean,
	chromaFixed: boolean,
	
	saturation: number,
}

export function generatePalettes(settings: PaletteSettings): NormalizedSrgbColor[][] {
	let hsl = generateHslPalette(settings);
	let hsv = generateHsvPalette(settings);
	let lch = generateOklchPalette(settings);

	return [hsl, hsv, lch];
}