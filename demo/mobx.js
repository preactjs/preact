import React, { createElement, forwardRef, useRef, useState } from 'react';
import { decorate, observable } from 'mobx';
import { observer, useObserver } from 'mobx-react';
import 'mobx-react-lite/batchingForReactDom';

class Todo {
	constructor() {
		this.id = Math.random();
		this.title = 'initial';
		this.finished = false;
	}
}
decorate(Todo, {
	title: observable,
	finished: observable
});

const Forward = observer(
	// eslint-disable-next-line react/display-name
	forwardRef(({ todo }, ref) => {
		return (
			<p ref={ref}>
				Forward: "{todo.title}" {'' + todo.finished}
			</p>
		);
	})
);

const todo = new Todo();

const TodoView = observer(({ todo }) => {
	return (
		<p>
			Todo View: "{todo.title}" {'' + todo.finished}
		</p>
	);
});

const HookView = ({ todo }) => {
	return useObserver(() => {
		return (
			<p>
				Todo View: "{todo.title}" {'' + todo.finished}
			</p>
		);
	});
};

export function MobXDemo() {
	const ref = useRef(null);
	let [v, set] = useState(0);

	const success = ref.current && ref.current.nodeName === 'P';

	return (
		<div>
			<input
				type="text"
				placeholder="type here..."
				onInput={e => {
					todo.title = e.target.value;
					set(v + 1);
				}}
			/>
			<p>
				<b style={`color: ${success ? 'green' : 'red'}`}>
					{success ? 'SUCCESS' : 'FAIL'}
				</b>
			</p>
			<TodoView todo={todo} />
			<Forward todo={todo} ref={ref} />
			<HookView todo={todo} />
		</div>
	);
}
