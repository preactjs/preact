import { createElement, Component, options } from 'preact';

function getPrimes(max) {
	let sieve = [],
		i,
		j,
		primes = [];
	for (i = 2; i <= max; ++i) {
		if (!sieve[i]) {
			// i has not been marked -- it is prime
			primes.push(i);
			for (j = i << 1; j <= max; j += i) {
				sieve[j] = true;
			}
		}
	}
	return primes.join('');
}

function Foo(props) {
	return <div>{props.children}</div>;
}

function Bar() {
	getPrimes(10000);
	return (
		<div>
			<span>...yet another component</span>
		</div>
	);
}

function PrimeNumber(props) {
	// Slow down rendering of this component
	getPrimes(10);

	return (
		<div>
			<span>I'm a slow component</span>
			<br />
			{props.children}
		</div>
	);
}

export default class ProfilerDemo extends Component {
	constructor() {
		super();
		this.onClick = this.onClick.bind(this);
		this.state = { counter: 0 };
	}

	componentDidMount() {
		options._diff = vnode => (vnode.startTime = performance.now());
		options.diffed = vnode => (vnode.endTime = performance.now());
	}

	componentWillUnmount() {
		delete options._diff;
		delete options.diffed;
	}

	onClick() {
		this.setState(prev => ({ counter: ++prev.counter }));
	}

	render() {
		return (
			<div class="foo">
				<h1>⚛ Preact</h1>
				<p>
					<b>Devtools Profiler integration 🕒</b>
				</p>
				<Foo>
					<PrimeNumber>
						<Foo>I'm a fast component</Foo>
						<Bar />
					</PrimeNumber>
				</Foo>
				<Foo>I'm the fastest component 🎉</Foo>
				<span>Counter: {this.state.counter}</span>
				<br />
				<br />
				<button onClick={this.onClick}>Force re-render</button>
			</div>
		);
	}
}
