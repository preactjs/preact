import { createElement, Suspense, lazy, Component } from 'react';
import { MemoryRouter as Router, Route, Switch } from 'react-router-dom';

function delay(time) {
	return new Promise((res) => {
		setTimeout(res, time);
	});
}

let Hello = lazy(() => delay(1000).then(() => import('./hello.js')));
let Bye = lazy(() => delay(10).then(() => import('./bye.js')));

class Loading extends Component {

	get __e() {
		console.log('get __e', this.myDom);
		return this.myDom;
	}
	set __e(myDom) {
		console.log('set __e', myDom);
	   this.myDom = myDom;
	}
	render() {
		return <div>Hey! This is a fallback because we're loading things! :D</div>;
	}
}

export default class SuspenseRouter extends Component {
	render() {
		return (
			<div>
				test
				<Router>
					<Suspense fallback={<Loading />}>
						<Switch>
							<Route path="/" exact component={Hello} />
							<Route path="/bye" component={Bye} />
						</Switch>
					</Suspense>
				</Router>
			</div>
		);
	}
}
