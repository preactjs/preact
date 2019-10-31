import { interpolateViridis } from 'd3-scale';
import { createElement } from 'preact';

Math.deg = function(radians) {
	return radians * (180 / Math.PI);
};

const memoizedCalc = (function() {
	const memo = {};

	const key = ({ w, heightFactor, lean }) => `${w}-${heightFactor}-${lean}`;

	return args => {
		let memoKey = key(args);

		if (memo[memoKey]) {
			return memo[memoKey];
		}

		let { w, heightFactor, lean } = args;
		let trigH = heightFactor * w;

		let result = {
			nextRight: Math.sqrt(trigH ** 2 + (w * (0.5 + lean)) ** 2),
			nextLeft: Math.sqrt(trigH ** 2 + (w * (0.5 - lean)) ** 2),
			A: Math.deg(Math.atan(trigH / ((0.5 - lean) * w))),
			B: Math.deg(Math.atan(trigH / ((0.5 + lean) * w)))
		};

		memo[memoKey] = result;
		return result;
	};
})();

export default function Pythagoras({
	w,
	x,
	y,
	heightFactor,
	lean,
	left,
	right,
	lvl,
	maxlvl
}) {
	if (lvl >= maxlvl || w < 1) {
		return null;
	}

	const { nextRight, nextLeft, A, B } = memoizedCalc({
		w,
		heightFactor,
		lean
	});

	let rotate = '';

	if (left) {
		rotate = `rotate(${-A} 0 ${w})`;
	} else if (right) {
		rotate = `rotate(${B} ${w} ${w})`;
	}

	return (
		<g transform={`translate(${x} ${y}) ${rotate}`}>
			<rect
				width={w}
				height={w}
				x={0}
				y={0}
				style={{ fill: interpolateViridis(lvl / maxlvl) }}
			/>

			<Pythagoras
				w={nextLeft}
				x={0}
				y={-nextLeft}
				lvl={lvl + 1}
				maxlvl={maxlvl}
				heightFactor={heightFactor}
				lean={lean}
				left
			/>

			<Pythagoras
				w={nextRight}
				x={w - nextRight}
				y={-nextRight}
				lvl={lvl + 1}
				maxlvl={maxlvl}
				heightFactor={heightFactor}
				lean={lean}
				right
			/>
		</g>
	);
}
