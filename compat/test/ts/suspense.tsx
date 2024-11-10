import * as React from '../../src';

interface LazyProps {
	isProp: boolean;
}

const IsLazyFunctional = (props: LazyProps) => (
	<div>{props.isProp ? 'Super Lazy TRUE' : 'Super Lazy FALSE'}</div>
);

const FallBack = () => <div>Still working...</div>;
/**
 * Have to mock dynamic import as import() throws a syntax error in the test runner
 */
const componentPromise = new Promise<{ default: typeof IsLazyFunctional }>(
	resolve => {
		setTimeout(() => {
			resolve({ default: IsLazyFunctional });
		}, 800);
	}
);

/**
 * For usage with import:
 * const IsLazyComp = lazy(() => import('./lazy'));
 */
const IsLazyFunc = React.lazy(() => componentPromise);

// Suspense using lazy component
class ReactSuspensefulFunc extends React.Component {
	render() {
		return (
			<React.Suspense fallback={<FallBack />}>
				<IsLazyFunc isProp={false} />
			</React.Suspense>
		);
	}
}

const Comp = () => <p>Hello world</p>;

const importComponent = async () => {
	return { MyComponent: Comp };
};

const Lazy = React.lazy(() =>
	importComponent().then(mod => ({ default: mod.MyComponent }))
);

// eslint-disable-next-line
function App() {
	return <Lazy />;
}
