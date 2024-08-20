import React from "react";
import * as colors from "./colors";

export const PRECISION = 5;
	
function vecToString(color: colors.Vec3, integral?: boolean, suffix = ""): string {
	return color.map(n => integral ? (isNaN(n) ? 0 : n) : (isNaN(n) ? 0 : n).toFixed(PRECISION).replace(/(?<!\.)0+$/, '') + suffix).join(', ');
}

export function getColorFormats(rgb: colors.NormalizedSrgbColor): (string | string[])[] {
	const rgbLinear = colors.srgbToLinear(rgb);
	const rgbu8 = colors.quantizeColor(rgb);
	const hex = colors.rgbToHex(rgbu8);
	const hashlessHex = hex.replace('#', '');
	const lab = colors.linearSrgbToOklab(rgbLinear)
	const lch = colors.oklabToOklch(lab);
	const hsl = colors.rgbToHsl(rgb);
	const hsv = colors.rgbToHsv(rgb);

	return [
		`rgb(${vecToString(rgbu8, true)})`,
		[ hex, hashlessHex ],
		[ `"${hex}"`, `0x${hashlessHex}` ],
		`rgb(${vecToString(rgb)})`,
		`vec3(${vecToString(rgbLinear)})`,
		`vec3(${vecToString(rgbLinear, false, 'f')})`,
		`hsl(${vecToString(hsl)})`,
		`hsv(${vecToString(hsv)})`,
		`oklch(${vecToString(lch)})`,
		`oklab(${vecToString(lab)})`,
		'',
		`rgba(${vecToString(rgbu8, true)}, 255)`,
		[ `${hex}ff`, `${hashlessHex}ff` ],
		[ `"${hex}ff"`, `0x${hashlessHex}ff` ],
		`rgba(${vecToString(rgb)}, 1.0)`,
		`vec4(${vecToString(rgbLinear)}, 1.0)`,
		`vec4(${vecToString(rgbLinear, false, 'f')}, 1.0f)`,
	]
}

export type Tree<T> = T | Tree<T>[];
export type TreeIdx = number | number[] | string

export function treeNodeByIndex<T>(tree: Tree<T>, idx: TreeIdx): T | null {
	let indices: number[];
	if (typeof idx === 'string') {
		indices = idx.split(',').map(n => parseInt(n, 10))
	} else if (typeof idx === 'number') {
		indices = [idx]
	} else {
		indices = idx;
	}
	
	for (let j = 0; j < indices.length; j++) {
		if (tree instanceof Array) {
			tree = tree[indices[j]]
		}
	}
	return tree instanceof Array ? null : tree;
}

export const copyFormatContext = React.createContext<{
	currentFormat: TreeIdx,
	setCurrentFormat: (i: TreeIdx) => void,
}>({
	currentFormat: 0,
	setCurrentFormat: () => {},
});

export function formatPalette(palette: colors.NormalizedSrgbColor[], formatIdx: TreeIdx) {
	const texts = palette.map(color => treeNodeByIndex(getColorFormats(color), formatIdx));
	let output = '[\n'
	for (const text of texts) {
		output += `    ${text},\n`;
	}
	output += ']\n';
	return output;
}