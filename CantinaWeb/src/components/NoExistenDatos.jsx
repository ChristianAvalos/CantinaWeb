const NoExistenDatos = ({ colSpan = 7, mensaje = "No existen registros." }) => (
    <tr>
        <td colSpan={colSpan} className="text-center text-gray-500 py-4">
            {mensaje}
        </td>
    </tr>
);

export default NoExistenDatos;