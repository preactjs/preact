import Preact, { render, hydrate } from 'preact/compat'

export function createRoot(container) {
	return {
		render(children) {
			return render(children, container)
		}
	}
}

export function hydrateRoot(container, children) {
	return hydrate(children, container);
}

export default Preact;
export * from 'preact/compat';
