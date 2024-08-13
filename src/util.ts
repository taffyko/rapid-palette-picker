interface Flavoring<FlavorT> {
	_type?: FlavorT;
}
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export function lerp(min: number, max: number, t: number) {
	return min + (max - min) * t;
}

export function randomRange(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

export function clamp(n: number, min: number, max: number) { 
	return Math.min(Math.max(n, min), max)
}

export async function setClipboard(text: string) {
  const type = "text/plain";
  const blob = new Blob([text], { type });
  const data = [new ClipboardItem({ [type]: blob })];
  await navigator.clipboard.write(data);
}

export function assertUnreachable(a: never): never;
export function assertUnreachable(): never;
export function assertUnreachable(): never {
	throw new Error("Deliberately unreachable case occurred.");
}

export function approxEqual(a: number, b: number, epsilon?: number): boolean
export function approxEqual(a: number[], b: number[], epsilon?: number): boolean
export function approxEqual(a: any, b: any, epsilon: number = 1e-16): boolean {
	if (typeof a === 'number') {
		return Math.abs(a - b) < epsilon;
	} else {
		return arraysEqual(a, b, approxEqual)
	}
}

export function arraysEqual<T>(a: T[], b: T[], eq = (a: T, b: T) => a === b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; ++i) {
		if (!eq(a[i], b[i])) return false;
	}
	return true;
}

export function posmod(n: number, d: number) { return ((n % d) + d) % d }

export function modDistance(a: number, b: number, d: number) {
	a = posmod(a, d);
	b = posmod(b, d);
	if (a === b) { return 0 }
	let diff1 = ((a + d) - b) % d;
	let diff2 = (a - (b + d)) % d;
	return Math.min(Math.abs(diff1), Math.abs(diff2))
}

export const TAU = Math.PI*2;
export type Normalized = Flavor<number, 'Normalized'>;
export type Radians = Flavor<number, 'Radians'>;
export type Degrees = Flavor<number, 'Degrees'>;
export function turnToRad(n: Normalized): Radians { return n * TAU }
export function radToTurn(n: Radians): Normalized { return n / TAU }
export function turnToDeg(n: Normalized): Degrees { return n * 360.0 }
export function degToTurn(n: Degrees): Normalized { return n / 360.0 }
export function degToRad(n: Degrees): Radians { return n * Math.PI / 180.0 }
export function radToDeg(n: Radians): Degrees { return n * 180.0 / Math.PI }

export function wrapDeg(n: Degrees): Degrees { return posmod(n, 360) }
export function wrapRad(n: Radians): Radians { return posmod(n, TAU) }
export function wrapTurn(n: Normalized): Normalized { return posmod(n, 1.0) }