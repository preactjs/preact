import { h } from 'preact';

function Leaf() {
	return (
		<div>
			<span class="foo" data-testid="stack">
				deep stack
			</span>
		</div>
	);
}

function PassThrough(props) {
	return <div>{props.children}</div>;
}

function recursive(n) {
	if (n <= 0) {
		return <Leaf />;
	}
	return <PassThrough>{recursive(n - 1)}</PassThrough>;
}

const content = [];
for (let i = 0; i < 10; i++) {
	content.push(recursive(1000));
}

export default function App() {
	return <div>{content}</div>;
}
