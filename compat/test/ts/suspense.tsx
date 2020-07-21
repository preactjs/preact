import * as React from "../../src";

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
const IsLazyFunc = React.lazy(() => componentPromise);

// Suspense using lazy component
class SuspensefulFunc extends React.Component {
	render() {
		return <React.Suspense fallback={<FallBack/>}><IsLazyFunc isProp={false} /></React.Suspense>
	}
}

//SuspenseList using lazy components
function SuspenseListTester(props: any) {
  const [error] = React.useErrorBoundary((msg) => {
    console.log(msg)
  })
  const _fallback = error ? <div>{JSON.stringify(error)}</div> : <FallBack />

  return (
    <React.SuspenseList revealOrder="together">
      <React.Suspense fallback={_fallback}>
        <IsLazyFunc isProp={false} />
      </React.Suspense>
      <React.Suspense fallback={_fallback}>
        <IsLazyFunc isProp={false} />
      </React.Suspense>
    </React.SuspenseList>
  )
}
