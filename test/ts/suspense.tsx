import "mocha";
import {
	createElement,
	Component,
} from "../..";
import {
	Suspense,
	lazy,
} from "../../compat";

interface LazyProps {
	isProp: boolean;
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
const componentPromise = new Promise<{default: typeof IsLazyFunctional}>(resolve=>{
	setTimeout(()=>{
		resolve({ default: IsLazyFunctional});
	},800);
});

/**
 * For usage with import:
 * const IsLazyComp = lazy(() => import('./lazy'));
*/
const IsLazyFunc = lazy(() => componentPromise);

// Suspense using lazy component
class SuspensefulFunc extends Component {
	render() {
		return <Suspense fallback={<FallBack/>}><IsLazyFunc isProp={false} /></Suspense>
	}
}
