import { Suspense, lazy } from 'react';

import { Router, Route, Switch } from './simple-router';

let Hello = lazy(() => import('./hello.jsx'));
let Bye = lazy(() => import('./bye.jsx'));

function Loading() {
	return <div>Hey! This is a fallback because we're loading things! :D</div>;
}

export default function SuspenseRouterBug() {
	return (
		<Router>
			<h1>Suspense Router bug</h1>
			<Suspense fallback={<Loading />}>
				<Switch>
					<Route path="/" exact>
						<Hello />
					</Route>
					<Route path="/bye">
						<Bye />
					</Route>
				</Switch>
			</Suspense>
		</Router>
	);
}
