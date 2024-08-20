import { NormalizedSrgbColor, clampColor, oklchToSrgb, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, oklchToOklab, oklabToLinearSrgb, linearToSrgb, OklchColor } from "./colors";
import { lerp, clamp, Normalized } from "./util";

export function generateHslPalette(settings: PaletteSettings): NormalizedSrgbColor[] {
	let hslColors = []

	const srgb = clampColor(oklchToSrgb(settings.startingColor));
	const [hueBase, saturationBase, lightnessBase] = rgbToHsl(srgb);
	let saturationStep = lerp(0.0, 0.5, settings.saturationStep);
	let lightnessStep = lerp(0.1, 1 - lightnessBase, settings.luminanceStep);
	
	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);

		const hueOffset = paletteStep(i, settings);

		let saturation = clamp(saturationBase + linearIterator * saturationStep, 0.0, 1.0);
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

	let saturationStep = lerp(0.0, 0.5, settings.saturationStep);
	let valueStep = lerp(0.1, 1 - valueBase, settings.luminanceStep);

	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);
		const hueOffset = paletteStep(i, settings);

		let saturation = clamp(saturationBase + linearIterator * saturationStep, 0.0, 1.0);
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
	let chromaStep = lerp(0.0, 0.35, settings.saturationStep);
	let luminanceStep = lerp(0.3, 1.0 - lightnessBase, settings.luminanceStep);

	for (let i = 0; i < settings.colorCount; ++i) {
		let linearIterator = (i) / (settings.colorCount - 1);

		const hueOffset = paletteStep(i, settings);

		let chroma = clamp(chromaBase + linearIterator * chromaStep, 0.0, 1.0);
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