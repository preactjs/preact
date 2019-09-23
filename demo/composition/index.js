import { createElement, Fragment } from 'preact';
import { createComponent, watch, reactive, provide } from 'preact/composition';
import { Link } from 'preact-router';

import Form from './form';
import DomEvents from './domEvents';
import Theme from './theme';
import Raf from './raf';
import Async from './async';

import './style.css';

export default createComponent(function() {
	const match = watch(props => {
		switch (props.demo) {
			case 'form':
				return <Form />;
			case 'domEvents':
				return <DomEvents />;
			case 'theme':
				return <Theme />;
			case 'raf':
				return <Raf />;
			case 'async':
				return <Async />;
			default:
				return <div>Not found</div>;
		}
	});

	function invert() {
		style.$value =
			style.color === 'black'
				? { color: 'white', background: 'black' }
				: { color: 'black', background: 'white' };
	}

	const style = reactive({ color: 'black', background: 'white' });

	provide('theme:style', style);
	provide('theme:invert', invert);

	return () => {
		return (
			<>
				<nav className="composition-demo-list">
					<Link href="/composition/form">Form</Link>
					<Link href="/composition/domEvents">DomEvents</Link>
					<Link href="/composition/theme">Theme</Link>
					<Link href="/composition/raf">Raf</Link>
					<Link href="/composition/async">Async</Link>
					<span style={style.$value} onClick={invert}>
						Current theme: {style.background}
					</span>
				</nav>
				{match.value}
			</>
		);
	};
});
