import { createElement, render, Component } from '../src';

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
		console.log('get '+this+'.nodeValue');
		return d.get.call(this);
	},
	set(v) {
		console.log('set '+this+'.nodeValue');
		return d.set.call(this, v);
	}
});
*/


class Foo extends Component {
	componentDidMount() {
		console.log('mounted');
		this.timer = setInterval( () => {
			this.setState({ time: Date.now() });
		}, 1000);
	}
	componentWillUnmount() {
		clearInterval(this.timer);
	}
	render(props, state, context) {
		console.log('rendering', props, state, context);
		return <time>test: {state.time}</time>
	}
}


render((
	<div>
		<h4>This is a test.</h4>
		<Foo />
		<time>...</time>
	</div>
), document.body);

let items = [];
let count = 0;

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
			{/* <time>{Date.now()}</time> */}
			<ul>{items}</ul>
		</div>
	), document.body);
}, 250);
