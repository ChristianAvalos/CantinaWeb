import { Component } from 'react';
import ErrorScreen from './ErrorScreen';

const RELOAD_KEY = 'cantina_error_boundary_reloaded';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidMount() {
        // Al montar la app correctamente, resetear el contador de recargas
        sessionStorage.removeItem(RELOAD_KEY);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error) {
        const isDynamicImportError =
            /Failed to fetch dynamically imported module/i.test(error?.message || '');

        // Si es un error de importación dinámica (chunk no disponible / caché / deploy),
        // intenta una sola recarga automática por carga de la página.
        if (isDynamicImportError && !sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, '1');
            window.location.reload();
        }
    }

    render() {
        if (this.state.hasError) {
            return <ErrorScreen error={this.state.error} />;
        }
        return this.props.children;
    }
}
