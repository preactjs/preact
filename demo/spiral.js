import { createElement, Component } from 'preact';

const COUNT = 500;
const LOOPS = 6;

// Component.debounce = requestAnimationFrame;

export default class Spiral extends Component {
	state = { x: 0, y: 0, big: false, counter: 0 };

	handleClick = e => {
		console.log('click');
	};

	increment = () => {
		if (this.stop) return;
		// this.setState({ counter: this.state.counter + 1 }, this.increment);
		this.setState({ counter: this.state.counter + 1 });
		// this.forceUpdate();
		requestAnimationFrame(this.increment);
	};

	setMouse({ pageX: x, pageY: y }) {
		this.setState({ x, y });
		return false;
	}

	setBig(big) {
		this.setState({ big });
	}

	componentDidMount() {
		console.log('mount');

		// let touch = navigator.maxTouchPoints > 1;
		let touch = false;

		// set mouse position state on move:
		addEventListener(touch ? 'touchmove' : 'mousemove', e => {
			this.setMouse(e.touches ? e.touches[0] : e);
		});

		// holding the mouse down enables big mode:
		addEventListener(touch ? 'touchstart' : 'mousedown', e => {
			this.setBig(true);
			e.preventDefault();
		});
		addEventListener(touch ? 'touchend' : 'mouseup', e => this.setBig(false));

		requestAnimationFrame(this.increment);
	}

	componentWillUnmount() {
		console.log('unmount');
		this.stop = true;
	}

	// componentDidUpdate() {
	// 	// invoking setState() in componentDidUpdate() creates an animation loop:
	// 	this.increment();
	// }

	// builds and returns a brand new DOM (every time)
	render(props, { x, y, big, counter }) {
		let max =
				COUNT +
				Math.round(Math.sin((counter / 90) * 2 * Math.PI) * COUNT * 0.5),
			cursors = [];

		// the advantage of JSX is that you can use the entirety of JS to "template":
		for (let i = max; i--; ) {
			let f = (i / max) * LOOPS,
				θ = f * 2 * Math.PI,
				m = 20 + i * 2,
				hue = (f * 255 + counter * 10) % 255;
			cursors[i] = (
				<Cursor
					big={big}
					color={'hsl(' + hue + ',100%,50%)'}
					x={(x + Math.sin(θ) * m) | 0}
					y={(y + Math.cos(θ) * m) | 0}
				/>
			);
		}

		return (
			<div id="main" onClick={this.handleClick}>
				<Cursor label x={x} y={y} big={big} />
				{cursors}
			</div>
		);
	}
}

/** Represents a single coloured dot. */
class Cursor extends Component {
	// get shared/pooled class object
	getClass(big, label) {
		let cl = 'cursor';
		if (big) cl += ' big';
		if (label) cl += ' label';
		return cl;
	}

	// skip any pointless re-renders
	shouldComponentUpdate(props) {
		for (let i in props)
			if (i !== 'children' && props[i] !== this.props[i]) return true;
		return false;
	}

	// first argument is "props", the attributes passed to <Cursor ...>
	render({ x, y, label, color, big }) {
		let inner = null;
		if (label)
			inner = (
				<span class="label">
					{x},{y}
				</span>
			);
		return (
			<div
				class={this.getClass(big, label)}
				style={{
					transform: `translate(${x || 0}px, ${y || 0}px) scale(${
						big ? 2 : 1
					})`,
					// transform: `translate3d(${x || 0}px, ${y || 0}px, 0) scale(${big?2:1})`,
					borderColor: color
				}}
				// style={{ left: x || 0, top: y || 0, borderColor: color }}
			>
				{inner}
			</div>
		);
	}
}

// Addendum: disable dragging on mobile
addEventListener('touchstart', e => (e.preventDefault(), false));
