import { createElement } from "preact";
import { createComponent, watch, value } from "preact/composition";

function getItems(length) {
	return new Promise(resolve =>
		setTimeout(
			resolve,
			300,
			Array.from({ length }, (_, id) => ({ id, name: "Item #" + id }))
		)
	);
}

export default createComponent(() => {
	const count = value(1);

	const increase = () => count.value++;
	const decrease = () => count.value--;

	const items = watch(count, getItems);

	return () => {
		const itemList = items.value || [];
		return (
			<div>
				<div>
					<button onClick={decrease}>decrease</button>
					{count.value}
					<button onClick={increase}>increase</button>
				</div>
				<p>Hello everyone</p>
				<ul>
					{itemList.map(item => (
						<li key={item.id}>{item.name}</li>
					))}
				</ul>
			</div>
		);
	};
});
