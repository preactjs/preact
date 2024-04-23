import { useState } from 'preact/hooks';

export default function Contenteditable() {
	const [value, setValue] = useState("Hey there<br />I'm editable!");

	return (
		<div>
			<div>
				<button onClick={() => setValue('')}>Clear!</button>
			</div>
			<div
				style={{
					border: '1px solid gray',
					padding: '8px',
					margin: '8px 0',
					background: 'white'
				}}
				contentEditable
				onInput={e => setValue(e.currentTarget.innerHTML)}
				dangerouslySetInnerHTML={{ __html: value }}
			/>
		</div>
	);
}
