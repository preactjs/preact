import { createElement, Fragment, createRef } from 'preact';
import {
	createComponent,
	value,
	onMounted,
	onUnmounted,
	effect
} from 'preact/composition';

export default createComponent(() => {
	// requestAnimationFrame
	// https://css-tricks.com/using-requestanimationframe-with-react-hooks/
	const count = value(0);
	let previousTime;
	let request;

	function animate(time) {
		if (previousTime != undefined)
			count.value = (count.value + (time - previousTime) * 0.01) % 100;

		previousTime = time;
		request = requestAnimationFrame(animate);
	}

	onMounted(() => (request = requestAnimationFrame(animate)));
	onUnmounted(() => cancelAnimationFrame(request));

	// canvas
	// http://www.petecorey.com/blog/2019/08/19/animating-a-canvas-with-react-hooks/
	const canvasRef = createRef();

	effect([canvasRef, count], ([canvas, c]) => {
		let context = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;

		context.clearRect(0, 0, width, height);

		context.beginPath();
		context.arc(width / 2, height / 2, c / 2, 0, 2 * Math.PI);
		context.fill();
	});

	return () => (
		<>
			<div>{Math.round(count.value)}</div>
			<Canvas ref={canvasRef} width="100" height="100" />
		</>
	);
});

const Canvas = createComponent(() => ({ width, height }, ref) => (
	<canvas ref={ref} width={width} height={height} />
));
