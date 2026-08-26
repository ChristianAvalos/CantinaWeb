import { useRouteError } from 'react-router';
import ErrorScreen from './ErrorScreen';

export default function RouteError() {
    const error = useRouteError();
    return <ErrorScreen error={error} />;
}
