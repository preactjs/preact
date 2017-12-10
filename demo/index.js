import { createElement, render, Component } from '../src';
import './style.scss';


function createRoot(title) {
	let div = document.createElement('div');
	let h2 = document.createElement('h2');
	h2.textContent = title;
	div.appendChild(h2);
	document.body.appendChild(div);
	return div;
}


/*
function logCall(obj, method, name) {
	let old = obj[method];
	obj[method] = function(...args) {
		console.log(`<${this.localName}>.`+(name || `${method}(${args})`));
		return old.apply(this, args);
	};
}

logCall(HTMLElement.prototype, 'appendChild');
logCall(HTMLElement.prototype, 'removeChild');
logCall(HTMLElement.prototype, 'insertBefore');
logCall(HTMLElement.prototype, 'replaceChild');
logCall(HTMLElement.prototype, 'setAttribute');
logCall(HTMLElement.prototype, 'removeAttribute');
let d = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue');
Object.defineProperty(Text.prototype, 'nodeValue', {
	get() {
		let value = d.get.call(this);
		console.log('get Text#nodeValue: ', value);
		return value;
	},
	set(v) {
		console.log('set Text#nodeValue', v);
		return d.set.call(this, v);
	}
});


render((
	<div>
		<h4>This is a test.</h4>
		<Foo />
		<time>...</time>
	</div>
), createRoot('Stateful component update demo:'));


class Foo extends Component {
	componentDidMount() {
		console.log('mounted');
		this.timer = setInterval( () => {
			this.setState({ time: Date.now() });
		}, 5000);
	}
	componentWillUnmount() {
		clearInterval(this.timer);
	}
	render(props, state, context) {
		// console.log('rendering', props, state, context);
		return <time>test: {state.time}</time>
	}
}


render((
	<div>
		<h4>This is a test.</h4>
		<Foo />
		<time>...</time>
	</div>
), createRoot('Stateful component update demo:'));


let items = [];
let count = 0;
let three = createRoot('Top-level render demo:');

setInterval( () => {
	if (count++ %20 < 10 ) {
		items.push(<li key={count} style={{
			position: 'relative',
			transition: 'all 200ms ease',
			paddingLeft: items.length*20 +'px'
		}}>item #{items.length}</li>);
	}
	else {
		items.shift();
	}

	render((
		<div>
			<h4>This is a test.</h4>
			<time>{Date.now()}</time>
			<ul>{items}</ul>
		</div>
	), three);
}, 5000);
*/


const COUNT = 500;
const LOOPS = 6;


/** This component controls the app itself.
 *	It wires up some global mouse events (this is uncommon).
 *	When component state changes, it gets re-rendered automatically.
 */
class Main extends Component {
	state = { x: 0, y: 0, big: false, counter: 0 };

	handleClick = e => {
		console.log('click');
	};

	increment = () => {
		this.setState({ counter: this.state.counter + 1 });
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
		// let touch = navigator.maxTouchPoints > 1;
		let touch = false;

		// set mouse position state on move:
		addEventListener(touch ? 'touchmove' : 'mousemove', e => {
			this.setMouse(e.touches ? e.touches[0] : e);
		});

		// holding the mouse down enables big mode:
		addEventListener(touch ? 'touchstart' : 'mousedown', e => { this.setBig(true); e.preventDefault(); });
		addEventListener(touch ? 'touchend' : 'mouseup', e => this.setBig(false));

		requestAnimationFrame(this.increment);
	}

	// componentDidUpdate() {
	// 	// invoking setState() in componentDidUpdate() creates an animation loop:
	// 	this.increment();
	// }

	// builds and returns a brand new DOM (every time)
	render(props, { x, y, big, counter }) {
		let max = COUNT + Math.round(Math.sin(counter / 90 * 2 * Math.PI) * COUNT * 0.5),
			cursors = [];

		// the advantage of JSX is that you can use the entirety of JS to "template":
		for (let i = max; i--;) {
			let f = i / max * LOOPS,
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
		for (let i in props) if (i !== 'children' && props[i] !== this.props[i]) return true;
		return false;
	}

	// first argument is "props", the attributes passed to <Cursor ...>
	render({ x, y, label, color, big }) {
		let inner = null;
		if (label) inner = <span class="label">{x},{y}</span>;
		return (
			<div
				class={this.getClass(big, label)}
				style={{ left: x || 0, top: y || 0, borderColor: color }}
			>{inner}</div>
		);
	}
}


// Mount the top-level component to the DOM:
render(<Main />, document.body);


// Addendum: disable dragging on mobile
addEventListener('touchstart', e => (e.preventDefault(), false));
