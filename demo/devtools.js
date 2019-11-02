// eslint-disable-next-line no-unused-vars
import {
	createElement,
	Component,
	memo,
	Fragment,
	Suspense,
	lazy
} from 'react';

function Foo() {
	return <div>I'm memoed</div>;
}

function LazyComp() {
	return <div>I'm (fake) lazy loaded</div>;
}

const Lazy = lazy(() => Promise.resolve({ default: LazyComp }));

const Memoed = memo(Foo);

export default class DevtoolsDemo extends Component {
	render() {
		return (
			<div>
				<h1>memo()</h1>
				<p>
					<b>functional component:</b>
				</p>
				<Memoed />
				<h1>lazy()</h1>
				<p>
					<b>functional component:</b>
				</p>
				<Suspense fallback={<div>Loading (fake) lazy loaded component...</div>}>
					<Lazy />
				</Suspense>
			</div>
		);
	}
}
