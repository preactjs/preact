import {
	createElement,
	cloneElement,
	createContext,
	useState,
	useContext,
	Children,
	useLayoutEffect
} from 'react';

/** @jsx createElement */

const memoryHistory = {
	/**
	 * @typedef {{ pathname: string }} Location
	 * @typedef {(location: Location) => void} HistoryListener
	 * @type {HistoryListener[]}
	 */
	listeners: [],

	/**
	 * @param {HistoryListener} listener
	 */
	listen(listener) {
		const newLength = this.listeners.push(listener);
		return () => this.listeners.splice(newLength - 1, 1);
	},

	/**
	 * @param {Location} to
	 */
	navigate(to) {
		this.listeners.forEach(listener => listener(to));
	}
};

/** @type {import('react').Context<{ history: typeof memoryHistory; location: Location }>} */
const RouterContext = createContext(null);

export function Router({ history = memoryHistory, children }) {
	const [location, setLocation] = useState({ pathname: '/' });

	useLayoutEffect(() => {
		return history.listen(newLocation => setLocation(newLocation));
	}, []);

	return (
		<RouterContext.Provider value={{ history, location }}>
			{children}
		</RouterContext.Provider>
	);
}

export function Switch(props) {
	const { location } = useContext(RouterContext);

	let element = null;
	Children.forEach(props.children, child => {
		if (element == null && child.props.path == location.pathname) {
			element = child;
		}
	});

	return element;
}

/**
 * @param {{ children: any; path: string; exact?: boolean; }} props
 */
export function Route({ children, path, exact }) {
	return children;
}

export function Link({ to, children }) {
	const { history } = useContext(RouterContext);
	const onClick = event => {
		event.preventDefault();
		event.stopPropagation();
		history.navigate({ pathname: to });
	};

	return (
		<a href={to} onClick={onClick}>
			{children}
		</a>
	);
}
