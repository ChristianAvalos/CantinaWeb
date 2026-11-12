import { useAuth } from '../hooks/useAuth';
import ChangePasswordModal from '../views/ModalPassword';

/**
 * Bloquea la navegación hasta que el usuario cambie la contraseña inicial.
 * Se monta en el layout del backoffice y en el del portal de familias.
 */
export default function CambioPasswordObligatorio() {
    const { user } = useAuth({ middleware: 'auth' });

    if (!user?.debe_cambiar_password) {
        return null;
    }

    return (
        <ChangePasswordModal
            isOpen
            obligatorio
            // No se puede cerrar: el cambio es requisito para continuar.
            onClose={() => {}}
        />
    );
}
