import React, { Activity, ActivityProps } from '../../src';

const props: ActivityProps = {
	mode: 'hidden',
	name: 'sidebar',
	children: <div>Hidden</div>
};

export function Example() {
	return (
		<>
			<Activity {...props} />
			<Activity mode="visible">Visible</Activity>
			<Activity>Visible by default</Activity>
			{/* @ts-expect-error Activity only accepts supported modes */}
			<Activity mode="collapsed">Invalid mode</Activity>
			{/* @ts-expect-error Activity requires children */}
			<Activity />
		</>
	);
}
