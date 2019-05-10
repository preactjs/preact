import "mocha";
import { expect } from "chai";
import {
	createElement,
	Component,
	Suspense,
	lazy,
} from "../..";

interface LazyProps {
	isProp: boolean;
}
class IsLazyComponent extends Component<LazyProps> {
	render ({ isProp }: LazyProps) {
		return (
			<div>{
				isProp ?
				'Super Lazy TRUE' :
				'Super Lazy FALSE'
			}</div>
		)
	}
}

const IsLazyFunctional = (props: LazyProps) =>
	<div>{
		props.isProp ?
		'Super Lazy TRUE' :
		'Super Lazy FALSE'
	}</div>

const FallBack = () => <div>Still working...</div>;
/**
 * Have to mock dynamic import as import() throws a syntax error in the test runner
 */
const componentPromise = new Promise<typeof IsLazyFunctional>(resolve=>{
	setTimeout(()=>{
		resolve(IsLazyFunctional);
	},800);
});

/**
 * For usage with import:
 * const IsLazyComp = lazy<typeof import('./lazy'), LazyProps>(() => import('./lazy'));
*/
const IsLazyFunc = lazy<typeof IsLazyFunctional, LazyProps>(() => componentPromise)

// Suspense using lazy component
class SuspensefulFunc extends Component {
	render() {
		return <Suspense fallback={<FallBack/>}><IsLazyFunc isProp={false} /></Suspense>
	}
}
