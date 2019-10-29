// eslint-disable-next-line no-unused-vars
import {
	createElement,
	Component,
	memo,
	Fragment,
	Suspense,
	lazy
} from 'react';

function LazyComp() {
	return <div>I'm (fake) lazy loaded</div>;
}

const Lazy = lazy(() => Promise.resolve({ default: LazyComp }));

function createSuspension(name, timeout, error) {
	let done = false;
	let prom;

	return {
		name,
		timeout,
		start: () => {
			if (!prom) {
				prom = new Promise((res, rej) => {
					setTimeout(() => {
						done = true;
						if (error) {
							rej(error);
						} else {
							res();
						}
					}, timeout);
				});
			}

			return prom;
		},
		getPromise: () => prom,
		isDone: () => done
	};
}

function CustomSuspense({ isDone, start, timeout, name }) {
	if (!isDone()) {
		throw start();
	}

	return (
		<div>
			Hello from CustomSuspense {name}, loaded after {timeout / 1000}s
		</div>
	);
}

function init() {
	return {
		s1: createSuspension('1', 1000, null),
		s2: createSuspension('2', 2000, null),
		s3: createSuspension('3', 3000, null)
	};
}

export default class DevtoolsDemo extends Component {
	constructor(props) {
		super(props);
		this.state = init();
		this.onRerun = this.onRerun.bind(this);
	}

	onRerun() {
		this.setState(init());
	}

	render(props, state) {
		return (
			<div>
				<h1>lazy()</h1>
				<Suspense fallback={<div>Loading (fake) lazy loaded component...</div>}>
					<Lazy />
				</Suspense>
				<h1>Suspense</h1>
				<div>
					<button onClick={this.onRerun}>Rerun</button>
				</div>
				<Suspense fallback={<div>Fallback 1</div>}>
					<CustomSuspense {...state.s1} />
					<Suspense fallback={<div>Fallback 2</div>}>
						<CustomSuspense {...state.s2} />
						<CustomSuspense {...state.s3} />
					</Suspense>
				</Suspense>
			</div>
		);
	}
}
