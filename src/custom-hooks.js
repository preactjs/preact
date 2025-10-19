/**
 * Custom React/Preact Hooks Collection
 * Additional useful hooks for common patterns
 */

import { useState, useEffect, useRef, useCallback } from '../hooks/src/index';

/**
 * Hook to track previous value of a variable
 * @template T
 * @param {T} value Current value
 * @returns {T | undefined} Previous value
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 */
export function usePrevious(value) {
	const ref = useRef(undefined);
	
	useEffect(() => {
		ref.current = value;
	}, [value]);
	
	return ref.current;
}

/**
 * Hook to toggle a boolean value
 * @param {boolean} [initialValue=false] Initial boolean value
 * @returns {[boolean, Function]} Current value and toggle function
 * @example
 * const [isOpen, toggleOpen] = useToggle(false);
 */
export function useToggle(initialValue = false) {
	const [value, setValue] = useState(initialValue);
	const toggle = useCallback(() => setValue(v => !v), []);
	return [value, toggle];
}

/**
 * Hook for debounced value
 * @template T
 * @param {T} value Value to debounce
 * @param {number} delay Delay in milliseconds
 * @returns {T} Debounced value
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 */
export function useDebounce(value, delay) {
	const [debouncedValue, setDebouncedValue] = useState(value);
	
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);
		
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);
	
	return debouncedValue;
}

/**
 * Hook for window size
 * @returns {{width: number, height: number}} Window dimensions
 * @example
 * const { width, height } = useWindowSize();
 */
export function useWindowSize() {
	const [size, setSize] = useState({
		width: typeof window !== 'undefined' ? window.innerWidth : 0,
		height: typeof window !== 'undefined' ? window.innerHeight : 0
	});
	
	useEffect(() => {
		if (typeof window === 'undefined') return;
		
		const handleResize = () => {
			setSize({
				width: window.innerWidth,
				height: window.innerHeight
			});
		};
		
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);
	
	return size;
}

/**
 * Hook to detect clicks outside an element
 * @param {any} ref Reference to the element
 * @param {Function} handler Function to call on outside click
 * @example
 * const ref = useRef();
 * useOnClickOutside(ref, () => setIsOpen(false));
 */
export function useOnClickOutside(ref, handler) {
	useEffect(() => {
		const listener = event => {
			if (!ref.current || ref.current.contains(event.target)) {
				return;
			}
			handler(event);
		};
		
		document.addEventListener('mousedown', listener);
		document.addEventListener('touchstart', listener);
		
		return () => {
			document.removeEventListener('mousedown', listener);
			document.removeEventListener('touchstart', listener);
		};
	}, [ref, handler]);
}

/**
 * Hook for local storage with state synchronization
 * @template T
 * @param {string} key Local storage key
 * @param {T} initialValue Initial value if key doesn't exist
 * @returns {[T, Function]} Current value and setter function
 * @example
 * const [name, setName] = useLocalStorage('name', 'Anonymous');
 */
export function useLocalStorage(key, initialValue) {
	const [storedValue, setStoredValue] = useState(() => {
		if (typeof window === 'undefined') {
			return initialValue;
		}
		
		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error);
			return initialValue;
		}
	});
	
	const setValue = useCallback(
		value => {
			try {
				const valueToStore =
					value instanceof Function ? value(storedValue) : value;
				
				setStoredValue(valueToStore);
				
				if (typeof window !== 'undefined') {
					window.localStorage.setItem(key, JSON.stringify(valueToStore));
				}
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, storedValue]
	);
	
	return [storedValue, setValue];
}

/**
 * Hook to check if component is mounted
 * @returns {any} Reference to mounted state
 * @example
 * const isMounted = useIsMounted();
 * if (isMounted.current) { ... }
 */
export function useIsMounted() {
	const isMounted = useRef(false);
	
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);
	
	return isMounted;
}

/**
 * Hook for interval that cleans up automatically
 * @param {Function} callback Function to call on interval
 * @param {number | null} delay Delay in milliseconds, null to pause
 * @example
 * useInterval(() => setCount(c => c + 1), 1000);
 */
export function useInterval(callback, delay) {
	const savedCallback = useRef(callback);
	
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);
	
	useEffect(() => {
		if (delay === null) return;
		
		const id = setInterval(() => savedCallback.current(), delay);
		return () => clearInterval(id);
	}, [delay]);
}

/**
 * Hook for timeout that cleans up automatically
 * @param {Function} callback Function to call after timeout
 * @param {number | null} delay Delay in milliseconds, null to cancel
 * @example
 * useTimeout(() => setShowMessage(false), 3000);
 */
export function useTimeout(callback, delay) {
	const savedCallback = useRef(callback);
	
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);
	
	useEffect(() => {
		if (delay === null) return;
		
		const id = setTimeout(() => savedCallback.current(), delay);
		return () => clearTimeout(id);
	}, [delay]);
}

/**
 * Hook to track hover state
 * @returns {[any, boolean]} Ref and hover state
 * @example
 * const [hoverRef, isHovered] = useHover();
 * return <div ref={hoverRef}>{isHovered ? 'Hovering!' : 'Not hovering'}</div>;
 */
export function useHover() {
	const [isHovered, setIsHovered] = useState(false);
	const ref = useRef(null);
	
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		
		const handleMouseEnter = () => setIsHovered(true);
		const handleMouseLeave = () => setIsHovered(false);
		
		node.addEventListener('mouseenter', handleMouseEnter);
		node.addEventListener('mouseleave', handleMouseLeave);
		
		return () => {
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		};
	}, []);
	
	return [ref, isHovered];
}
