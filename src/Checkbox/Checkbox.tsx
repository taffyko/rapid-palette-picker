import React, { useId } from "react";
import './Checkbox.scss';

export function Checkbox(props: React.ComponentProps<'input'> & { label?: string }) {
	const id = useId();
	return <div className="pretty p-switch p-fill p-has-hover">
		<input type="checkbox" {...props} id={id} />
		<div className="state">
			<label htmlFor={id}>{props.label}</label>
		</div>
	</div>
}