import { createElement, lazy } from 'react';

const pause = timeout =>
	new Promise(d => setTimeout(d, timeout), console.log(timeout));

const SubComponent = lazy(() =>
	pause(Math.random() * 1000).then(() => import('./subcomponent.js'))
);

export default function ComponentContainer({ appearance }) {
	return (
		<div>
			GenerateComponents (component #{appearance})
			<SubComponent />
		</div>
	);
}
