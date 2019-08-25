import { createElement } from "preact";
import { createComponent, reactive, effect } from "preact/composition";

export default createComponent(() => {
	const data = reactive({ name: "", password: "" });

	function handleInput(e) {
		data[e.currentTarget.name] = e.currentTarget.value;
	}

	function handleSubmit(e) {
		e.preventDefault();

		alert(JSON.stringify(data, null, 2));
	}

	//after update set the document title based on the inputs values
	effect(data, d => (document.title = d.name + " - " + d.password));

	return () => (
		<form onSubmit={handleSubmit}>
			<input
				onInput={handleInput}
				name="name"
				placeholder="Name"
				value={data.name}
			/>
			<input
				onInput={handleInput}
				name="password"
				placeholder="Password"
				value={data.password}
			/>
			<button>Submit</button>
		</form>
	);
});
