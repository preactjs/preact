import htm from 'htm';
import { h } from 'preact';
const html = htm.bind(h);

import { render } from 'preact';
import { useState } from 'preact/hooks';
import { useCallback } from '../hooks/src';


// configuration used to show behavior vs. workaround
let childFirst = true;

const Child = ({ items,setItems }) => {
	let [pendingId, setPendingId] = useState(null);
	if (!pendingId) {
		setPendingId(pendingId = Math.random().toFixed(20).slice(2));
	}

	const onInput = useCallback(evt => {
		let val = evt.target.value,
			_items = [...items, { _id: pendingId, val }];
		// TODO: why is this order important???!
		if (childFirst) {
			setPendingId(null);
			setItems(_items);
		}
		else {
			setItems(_items);
			setPendingId(null);
		}
	}, [childFirst, setPendingId, setItems, items, pendingId]);

	return html`<div class="item-editor">
    ${items.map((item,idx) => html`<input key=${item._id}
      value=${item.val}
      oninput=${evt => {
		let val = evt.target.value,
			_items = [...items];
		_items.splice(idx, 1, { ...item,val });
		setItems(_items);
	}}
    />`)}

    <input key=${pendingId}
      placeholder="type to add an item"
      oninput=${onInput}
    />
  </div>`;
};

const Parent = () => {
	let [items, setItems] = useState([]);
	return html`<div><${Child} items=${items} setItems=${setItems} /></div>`;
};

export default Parent;
