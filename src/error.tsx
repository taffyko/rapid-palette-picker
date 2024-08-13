import React from "react";

export interface ErrorBoundaryProps {
	children: React.ReactNode 
}

export interface ErrorBoundaryState {
	hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_error: Error) {
		return { hasError: true };
	}

	componentDidCatch(_error: Error, _info: React.ErrorInfo) {}

	render() {
		if (this.state.hasError) {
			return <code>error</code>
		}
		return this.props.children;
	}
}