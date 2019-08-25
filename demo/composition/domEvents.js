import { createElement } from "preact";
import { createComponent, watch } from "preact/composition";
import { useMousePosition, useWindowSize } from "./utils/use";

export default createComponent(function() {
	const mousePos = useMousePosition();
	const windowSize = useWindowSize();

	const size = 100;
	const gap = 5;

	const pos = watch(
		[mousePos, windowSize],
		([{ x, y }, { width, height }]) => ({
			x: x + gap + size > width ? width - size : x + gap,
			y: y + gap + size > height ? height - size : y + gap,
			color: `RGB(${(255 * x) / width}, 255, ${(255 * y) / height})`
		})
	);

	const a = watch(pos, p => p.color);
	console.log(a.value);

	return () => {
		return (
			<div
				style={{
					background: pos.value.color,
					width: size,
					height: size,
					position: "absolute",
					left: pos.value.x + "px",
					top: pos.value.y + "px"
				}}
			>
				{mousePos.x} - {mousePos.y} <br />
				{windowSize.width} -{windowSize.height}
			</div>
		);
	};
});
