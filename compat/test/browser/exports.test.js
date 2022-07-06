import Compat from 'preact/compat';
// eslint-disable-next-line no-duplicate-imports
import * as Named from 'preact/compat';

describe('compat exports', () => {
	it('should have a default export', () => {
		expect(Compat.createElement).to.be.a('function');
		expect(Compat.Component).to.be.a('function');
		expect(Compat.Fragment).to.exist;
		expect(Compat.render).to.be.a('function');
		expect(Compat.hydrate).to.be.a('function');
		expect(Compat.cloneElement).to.be.a('function');
		expect(Compat.createContext).to.be.a('function');
		expect(Compat.createRef).to.be.a('function');

		// Hooks
		expect(Compat.useState).to.be.a('function');
		expect(Compat.useReducer).to.be.a('function');
		expect(Compat.useEffect).to.be.a('function');
		expect(Compat.useLayoutEffect).to.be.a('function');
		expect(Compat.useRef).to.be.a('function');
		expect(Compat.useMemo).to.be.a('function');
		expect(Compat.useCallback).to.be.a('function');
		expect(Compat.useContext).to.be.a('function');
		expect(Compat.useSyncExternalStore).to.be.a('function');
		expect(Compat.useInsertionEffect).to.be.a('function');
		expect(Compat.useTransition).to.be.a('function');
		expect(Compat.useDeferredValue).to.be.a('function');

		// Suspense
		expect(Compat.Suspense).to.be.a('function');
		expect(Compat.lazy).to.be.a('function');

		// Compat specific
		expect(Compat.PureComponent).to.exist.and.be.a('function');
		expect(Compat.createPortal).to.exist.and.be.a('function');
		expect(Compat.createFactory).to.exist.and.be.a('function');
		expect(Compat.isValidElement).to.exist.and.be.a('function');
		expect(Compat.findDOMNode).to.exist.and.be.a('function');
		expect(Compat.Children.map).to.exist.and.be.a('function');
		expect(Compat.Children.forEach).to.exist.and.be.a('function');
		expect(Compat.Children.count).to.exist.and.be.a('function');
		expect(Compat.Children.toArray).to.exist.and.be.a('function');
		expect(Compat.Children.only).to.exist.and.be.a('function');
		expect(Compat.unmountComponentAtNode).to.exist.and.be.a('function');
		expect(Compat.unstable_batchedUpdates).to.exist.and.be.a('function');
		expect(Compat.version).to.exist.and.be.a('string');
		expect(Compat.startTransition).to.be.a('function');
	});

	it('should have named exports', () => {
		expect(Named.createElement).to.be.a('function');
		expect(Named.Component).to.be.a('function');
		expect(Named.Fragment).to.exist;
		expect(Named.render).to.be.a('function');
		expect(Named.hydrate).to.be.a('function');
		expect(Named.cloneElement).to.be.a('function');
		expect(Named.createContext).to.be.a('function');
		expect(Named.createRef).to.be.a('function');

		// Hooks
		expect(Named.useState).to.be.a('function');
		expect(Named.useReducer).to.be.a('function');
		expect(Named.useEffect).to.be.a('function');
		expect(Named.useLayoutEffect).to.be.a('function');
		expect(Named.useRef).to.be.a('function');
		expect(Named.useMemo).to.be.a('function');
		expect(Named.useCallback).to.be.a('function');
		expect(Named.useContext).to.be.a('function');

		// Suspense
		expect(Named.Suspense).to.be.a('function');
		expect(Named.lazy).to.be.a('function');

		// Compat specific
		expect(Named.PureComponent).to.exist.and.be.a('function');
		expect(Named.createPortal).to.exist.and.be.a('function');
		expect(Named.createFactory).to.exist.and.be.a('function');
		expect(Named.isValidElement).to.exist.and.be.a('function');
		expect(Named.findDOMNode).to.exist.and.be.a('function');
		expect(Named.Children.map).to.exist.and.be.a('function');
		expect(Named.Children.forEach).to.exist.and.be.a('function');
		expect(Named.Children.count).to.exist.and.be.a('function');
		expect(Named.Children.toArray).to.exist.and.be.a('function');
		expect(Named.Children.only).to.exist.and.be.a('function');
		expect(Named.unmountComponentAtNode).to.exist.and.be.a('function');
		expect(Named.unstable_batchedUpdates).to.exist.and.be.a('function');
		expect(Named.version).to.exist.and.be.a('string');
	});
});
