import { getComponents } from './components.js';

/**
 * @typedef Framework
 * @property {(type: any, props?: any, ...children: any) => JSX.Element} createElement
 * @property {(root: HTMLElement) => ({ render(vnode: JSX.Element): void; hydrate(vnode: JSX.Element): void; })} createRoot
 * @property {any} Component
 *
 * @param {Framework} framework
 * @param {HTMLElement} rootDom
 */
export function render(framework, rootDom) {
	const { Main } = getComponents(framework);
	framework.createRoot(rootDom).render(framework.createElement(Main));

	/** @type {Main} */
	// @ts-ignore
	const app = window.app;
	return {
		run: app.run.bind(app),
		add: app.add.bind(app),
		update: app.update.bind(app),
		select: app.select.bind(app),
		delete: app.delete.bind(app),
		runLots: app.runLots.bind(app),
		clear: app.clear.bind(app),
		swapRows: app.swapRows.bind(app)
	};
}
