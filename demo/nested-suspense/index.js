import { createElement, Suspense, lazy, Component } from 'react';

const Loading = function() {
	return <div>Loading...</div>;
};
const Error = function({ resetState }) {
	return (
		<div>
			Error!&nbsp;
			<a onClick={resetState} href="#">
				Reset app
			</a>
		</div>
	);
};

const pause = timeout =>
	new Promise(d => setTimeout(d, timeout), console.log(timeout));

const DropZone = lazy(() =>
	pause(Math.random() * 1000).then(() => import('./dropzone.js'))
);
const Editor = lazy(() =>
	pause(Math.random() * 1000).then(() => import('./editor.js'))
);
const AddNewComponent = lazy(() =>
	pause(Math.random() * 1000).then(() => import('./addnewcomponent.js'))
);
const GenerateComponents = lazy(() =>
	pause(Math.random() * 1000).then(() => import('./component-container.js'))
);

export default class App extends Component {
	state = { hasError: false };

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		console.warn(error);
		return { hasError: true };
	}

	render() {
		return this.state.hasError ? (
			<Error resetState={() => this.setState({ hasError: false })} />
		) : (
			<Suspense fallback={<Loading />}>
				<DropZone appearance={0} />
				<Editor title="APP_TITLE">
					<main>
						<Suspense fallback={<Loading />}>
							<GenerateComponents appearance={1} />
						</Suspense>
						<AddNewComponent appearance={2} />
					</main>
					<aside>
						<section>
							<Suspense fallback={<Loading />}>
								<GenerateComponents appearance={3} />
							</Suspense>
							<AddNewComponent appearance={4} />
						</section>
					</aside>
				</Editor>

				<footer>Footer here</footer>
			</Suspense>
		);
	}
}
