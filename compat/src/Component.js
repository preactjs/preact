import { Component as PreactComponent } from 'preact';
import { installReactCompat, isReactCompatInstalled } from './render';

export class Component extends PreactComponent {
	constructor(props, context) {
		super(props, context);

		if (!isReactCompatInstalled) {
			installReactCompat();
		}
	}
}
