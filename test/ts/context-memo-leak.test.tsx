/** @jsxImportSource preact */
import { it, expect } from 'vitest';
import { createContext, h } from 'preact';
import { memo } from 'preact/compat';
import { render } from 'preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';

const Ctx = createContext(0);

it.skip('should release consumer subtree after Context+memo bailouts', () => {
	const root = document.createElement('div');
	document.body.appendChild(root);

	function App() {
		const [n, setN] = useState(0);
		useEffect(() => {
			const id = setInterval(() => setN(v => v + 1), 16);
			return () => clearInterval(id);
		}, []);
		return (
			<Ctx.Provider value={n}>{n % 2 ? <Gate n={n} /> : null}</Ctx.Provider>
		);
	}

	const Gate = memo(function Gate({ n }: { n: number }) {
		const show = useMemo(() => n % 4 !== 0, [n]);
		return show ? <Consumer /> : null;
	});

	function Consumer() {
		const v = useContext(Ctx);
		return <span>{v}</span>;
	}

	render(<App />, root);

	expect(true).toBe(false);
});
