import { cloneElement, createContext, ReactElement, ReactNode, useContext, useEffect, useId, useLayoutEffect, useState } from 'react';
import './App.scss';
import './pretty-checkbox.scss';
import { generatePalettes, hexToRgb, normalizeColor, NormalizedSrgbColor, oklchToSrgb, quantizeColor, rgbToHex, srgbToOklch } from './colors';
import * as colors from './colors';
import { randomRange, setClipboard } from './util';
import { ErrorBoundary } from './error';
import { useMediaQuery } from 'react-responsive';

const PRECISION = 5;

interface ColorContext {
	setHoveredColor: (c: NormalizedSrgbColor | null) => void,
	setSelectedColor: (c: NormalizedSrgbColor) => void,
	setStartingColor: (c: colors.OklchColor) => void,
}
const colorContext = createContext<ColorContext>({
	setHoveredColor: () => {},
	setSelectedColor: () => {},
	setStartingColor: () => {},
});

Object.defineProperty(window, 'colors', { value: colors, configurable: true });

function ColorTile({ color, ...divProps }: Omit<React.ComponentProps<'div'>, 'color'> & { color: NormalizedSrgbColor }) {
	const rgb = quantizeColor(color);
	const ctx = useContext(colorContext);

	return <div className="color-tile" {...divProps}
		onClick={e => {
			if (e.button === 0) {
				if (e.ctrlKey) {
					ctx.setStartingColor(srgbToOklch(color));
				} else if (e.shiftKey) {
					// TODO: shift-click: copy
				} else {
					ctx.setSelectedColor(color);
				}
				e.currentTarget.classList.add('pressed');
				e.currentTarget.clientWidth;
				e.currentTarget.classList.remove('pressed');
			}
		}}
		onMouseEnter={() => { ctx.setHoveredColor(color); }}
		onMouseLeave={() => { ctx.setHoveredColor(null); }}

	>
		<div className="root">
			<div className="color" style={{
				backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
			}}/>
			<div className="left" />
			<div className="top" />
			<div className="right" />
			<div className="bottom" />
		</div>
	</div>
}

function Copyable({ text }: { text: string, label?: string } ) {
	// TODO: set preference for copying
	return <code style={{cursor: 'pointer'}}
		onClick={e => {
			if (e.button === 0) {
				e.currentTarget.classList.add('pressed');
				e.currentTarget.clientWidth;
				e.currentTarget.classList.remove('pressed');
				setClipboard(text);
			}
		}}
	>
		{text}
	</code>

}

function ColorPalette({ text, colors }: { text?: ReactNode, colors: NormalizedSrgbColor[] }) {
	return <div className="vbox" style={{ flexWrap: 'wrap' }}>
		<Labelled text={text} >
			<div className="color-palette">
				{
					colors.map((rgb, i) => {
						return <ColorTile key={i} color={rgb} />
					})
				}
			</div>
		</Labelled>
	</div>
}

function ColorInfo({ color: rgb }: { color: NormalizedSrgbColor }) {
	const rgbLinear = colors.srgbToLinear(rgb);
	const rgbu8 = quantizeColor(rgb);
	const hex = rgbToHex(rgbu8);
	const lab = colors.linearSrgbToOklab(rgbLinear)
	const lch = colors.oklabToOklch(lab);
	const hsl = colors.rgbToHsl(rgb);
	const hsv = colors.rgbToHsv(rgb);
	
	function vecToString(color: colors.Vec3, integral?: boolean, suffix = ""): string {
		return color.map(n => integral ? n : n.toFixed(PRECISION).replace(/(?<!\.)0+$/, '') + suffix).join(', ');
	}
	
	return <div className="vbox" style={{ textAlign: 'right', alignItems: 'flex-end'}}>
		<ColorPalette colors={[rgb]} />
		<Copyable text={`rgb(${vecToString(rgbu8, true)})`} />
		<Copyable text={hex} />
		<Copyable text={hex.replace('#', '')} />
		<Copyable text={`rgb(${vecToString(rgb)})`} />
		<Copyable text={`vec3(${vecToString(rgbLinear)})`} />
		<Copyable text={`vec3(${vecToString(rgbLinear, false, 'f')})`} />
		<Copyable text={`hsl(${vecToString(hsl)})`} />
		<Copyable text={`hsv(${vecToString(hsv)})`} />
		<Copyable text={`oklch(${vecToString(lch)})`} />
		<Copyable text={`oklab(${vecToString(lab)})`} />
		<Gap />
		<Copyable text={`rgba(${vecToString(rgbu8, true)}, 255)`} />
		<Copyable text={hex + 'ff'} />
		<Copyable text={hex.replace('#', '') + 'ff'} />
		<Copyable text={`rgba(${vecToString(rgb)}, 1.0)`} />
		<Copyable text={`vec4(${vecToString(rgbLinear)}, 1.0)`} />
		<Copyable text={`vec4(${vecToString(rgbLinear, false, 'f')}, 1.0f)`} />
	</div>
}

type IdAssignable = ReactElement | ((id: string) => ReactNode);


function ColorPicker({ display, value, set }: { display?: colors.OklchColor, value: colors.OklchColor, set: (color: colors.OklchColor) => void }) {
	const hex = rgbToHex(quantizeColor(oklchToSrgb(value)));
	return <div className="color-picker">
		<input type="color" style={{height: '100%'}} value={hex} onChange={(e) => {
			const color = normalizeColor(hexToRgb(e.target.value));
			const lch = srgbToOklch(color);
			set(lch);
		}}/>
		<ColorTile style={{'--color-border': 'var(--color-fg)'} as React.CSSProperties} color={oklchToSrgb(display || value)} />
	</div>
}

function Labelled({ text, inline, row, children }: { text?: ReactNode, inline?: IdAssignable, row?: boolean, children: IdAssignable}) {
	const id = useId();
	
	function assignId(el?: IdAssignable) {
		if (!el) { return null }
		if (typeof el === 'function') {
			return el(id);
		} else {
			return cloneElement(el, { id: id });
		}
	}
	const inlineChild = assignId(inline);
	const child = assignId(children);

	
	const label = text ? <label style={{userSelect: 'none'}} className="hbox" htmlFor={id}>{text}:</label> : null
	return <div className={row ? 'hbox' : 'vbox'}>
		<div className="hbox" style={{alignItems: 'center'}}>
			{label}
			{inlineChild}
		</div>
		{child}
	</div>
}

function Gap({ gap = 4 }: { gap?: number }) {
	return <div className="spacing-gap" style={{'--gap-factor': gap} as React.CSSProperties} />
}

function Slider({ value, name, set, inFn, outFn, ...htmlProps }: React.ComponentProps<'input'> & { value: number, name: ReactNode, set: (arg0: number) => void, inFn?: (n: number) => number, outFn?: (n: number) => number }) {
	return <Labelled
		text={name}
		inline={
			<input style={{flexGrow: 0}} type="number" min="0.0" max="1.0" step="0.0001" value={value.toFixed(PRECISION)} onChange={(e) => set(+e.target.value)} {...htmlProps} />
		}
	>
		<input type="range" min="0.0" max="1.0" step="any" value={inFn ? inFn(value) : value} onChange={(e) => set(outFn ? outFn(+e.target.value) : +e.target.value)} {...htmlProps} />
	</Labelled>;
}

// TODO: ctrl-V to paste to starting color
// TODO: copy palette as array literal
// TODO: fix saturation step

function ColorPalettes({paletteSettings}: { paletteSettings: colors.PaletteSettings }) {
	const [hsl, hsv, lch] = generatePalettes(paletteSettings);
	
	const [stylePage, setStylePage] = useState(true);

	useLayoutEffect(() => {
		if (stylePage) {
			const s = document.documentElement.style;
			const THEME_COLOR_COUNT = 6;
			for (let i = 0; i < THEME_COLOR_COUNT; i++) {
				const colorIdx = Math.floor((i/(THEME_COLOR_COUNT-1)) * (paletteSettings.colorCount - 1));
				s.setProperty(`--color-${i+1}`, rgbToHex(quantizeColor(lch[colorIdx])));
			}
		}
	}, [stylePage, paletteSettings])

	return <div className="vbox" style={{alignItems: 'flex-start'}}>
		<Checkbox label="self-style page" checked={stylePage} onChange={e => setStylePage(e.target.checked)} />
		<ColorPalette text="LCH" colors={lch} />
		<ColorPalette text="HSL" colors={hsl} />
		<ColorPalette text="HSV" colors={hsv} />
	</div>
}

function App() {
	const isDesktop1 = useMediaQuery({ query: "(min-width: 768px)" });
	const isDesktop2 = useMediaQuery({ query: "(min-device-width: 1024px)" });
	const isDesktop = isDesktop1 && isDesktop2;
	
	const [l, setL] = useState(0.25);
	const [c, setC] = useState(0.05)
	const [h, setH] = useState(Math.random());;
	const setLch = ([l, c, h]: colors.OklchColor) => { setL(l); setC(c); setH(h) }
	const [colorCount, setColorCount] = useState(8);

	
	const [luminanceStep, setLuminanceStep] = useState(1.0);
	const [hueStep, setHueStep] = useState(0.0);
	const [saturationStep, setSaturationStep] = useState(0.0);
	const [saturation, setSaturation] = useState(0.25);
	
	function randomize() {
		const rgb: NormalizedSrgbColor = [Math.random()/4, Math.random()/4, Math.random()/4];
		const lch = srgbToOklch(rgb);
		setLch(lch);
		setLuminanceStep(randomRange(0.25, 1.0));
		setHueStep(randomRange(-0.66, 0.66));
		setSaturationStep(randomRange(0.0, 0.5));
		setSaturation(Math.random()/2);
	}
	
	useEffect(() => {
		if (!import.meta.env.DEV) {
			randomize();
		}
	}, [])
	
	const [saturationFixed, setSaturationFixed] = useState(true);
	const [luminanceFixed, setLuminanceFixed] = useState(false);

	const [selectedColor, setSelectedColor] = useState<NormalizedSrgbColor>([0, 0, 0]);
	const [hoveredColor, setHoveredColor] = useState<NormalizedSrgbColor | null>(null);
	
	const [monochromatic, setMonochromatic] = useState(!!Math.round(Math.random()));

	const paletteSettings: colors.PaletteSettings = {
		startingColor: [l, c, h],
		hueStep,
		saturationStep,
		luminanceStep,
		colorCount: Math.max(2, isNaN(colorCount) ? 0 : colorCount),
		chromaFixed: !monochromatic && saturationFixed,
		hueFixed: monochromatic,
		luminanceFixed: luminanceFixed,
		saturation: saturation,
	};
	
	const [startingColorHovered, setStartingColorHovered] = useState(false);
	useEffect(() => {
		if (startingColorHovered) {
			setHoveredColor(oklchToSrgb(paletteSettings.startingColor));
		}
	}, [startingColorHovered, ...paletteSettings.startingColor])
	
	return (
		<colorContext.Provider value={{
			setHoveredColor,
			setSelectedColor,
			setStartingColor: (([l, c, h]) => { setL(l); setC(c); setH(h) }),
		}}>
			<div className="App">
				<main>
					<div className="vbox">
						<div style={isDesktop ? {
							display: 'flex',
							flexFlow: 'row nowrap',
						} : {
							display: 'flex',
							flexFlow: 'column nowrap',
						}}>
							<div className="vbox" style={{ flexGrow: 1, flexBasis: '50%' }}>
								<button onClick={randomize}>randomize</button>
								<div className="vbox">
									<div
										className="hbox"
										onMouseEnter={() => { setStartingColorHovered(true); }}
										onMouseLeave={() => { setStartingColorHovered(false); setHoveredColor(null); }}
									>
										<div className="vbox" style={{flexGrow: 1}}>
											<Slider name={'[L] luminance'} value={l} set={(n) => setL(n)} />
											<Slider name={'[c] chroma'} value={c} inFn={n => Math.cbrt(n)} outFn={n => n**3} set={(n) => setC(n)} />
											<Slider name={'[h] hue'} value={h} set={setH} />
										</div>
										<ColorPicker set={setLch} value={[l, c, h]} />
									</div>
									<Gap />
									<Labelled row text="color count">
										<input type="number" value={colorCount} onChange={(e) => setColorCount(parseInt(e.target.value))} />
									</Labelled>
									<Gap />
									<Checkbox label="monochromatic" checked={monochromatic} onChange={e => setMonochromatic(e.target.checked)} />
									{!monochromatic ? <>
										<Slider name='hue step' min={-1.0} max={1.0} value={hueStep} set={setHueStep} />
										<Checkbox label="constant lightness" checked={luminanceFixed} onChange={e => setLuminanceFixed(e.target.checked)} />
										{!luminanceFixed ?
											<Slider name='lightness step' value={luminanceStep} set={setLuminanceStep} />
										: null}
										<Checkbox label="constant saturation" checked={saturationFixed} onChange={e => setSaturationFixed(e.target.checked)} />
										{!saturationFixed ?
											<Slider name='saturation step' min={-1.0} value={saturationStep} set={setSaturationStep} />
										: 
											<Slider name='saturation' value={saturation} set={setSaturation} />
										}
									</> : <>
										<Slider name='lightness step' value={luminanceStep} set={setLuminanceStep} />
										<Slider name='saturation step' min={-1.0} value={saturationStep} set={setSaturationStep} />
									</>}
									<Gap />
									<ErrorBoundary>
										<ColorPalettes paletteSettings={paletteSettings} />
									</ErrorBoundary>
								</div>
							</div>
							<div className="vbox" style={{ flexGrow: 1, flexBasis: '25%' }}>
								<ColorInfo color={hoveredColor ?? selectedColor} />
							</div>
						</div>
					</div>
				</main>
			</div>
		</colorContext.Provider>
	);
}

function Checkbox(props: React.ComponentProps<'input'> & { label?: string }) {
	const id = useId();
	return <div className="pretty p-switch p-fill">
		<input type="checkbox" {...props} id={id} />
		<div className="state">
			<label htmlFor={id}>{props.label}</label>
		</div>
	</div>
}

export default App;
