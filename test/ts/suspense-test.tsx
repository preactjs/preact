import "mocha";
import { expect } from "chai";
import {
	createElement,
	Component,
        Suspense,
        lazy,
        AnyComponent
} from "../../src/";
import { IsLazyComponent } from './lazy';

const FallBack = () => <div>Still working...</div>;
/**
 * Have to moch dynamic import as import() throws a syntax error in the test runner
 */
const componentPromise = new Promise<{default: typeof IsLazyComponent}>(resolve=>{
        setTimeout(()=>{
                resolve({ default: IsLazyComponent });
        },800);
});

const IsLazy = lazy(componentPromise);

class UnSuspenseful extends Component {
        render() {
                return (
                <Suspense fallback={<FallBack />}>
                        <div>Unsuspense-ful</div>
                </Suspense>
                )
        }
}

class Suspenseful extends Component {
        render() {
                return <Suspense fallback={<FallBack/>}><IsLazy isProp={false} /></Suspense>
        }
}
