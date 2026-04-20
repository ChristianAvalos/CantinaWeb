<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Reporte de Usuarios</title>
    <style>
        
        /* Estilos generales */
        body {
            background-color: #f7fafc;
            padding: 2rem;
            font-family: Arial, sans-serif;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 0.5rem;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
        }

        .header {
            font-size: 1.875rem;
            font-weight: bold;
            color: #2d3748;
            text-align: center;
            margin-bottom: 1.5rem;
            border-bottom: 4px solid #2d3748;
            padding-bottom: 0.5rem;
        }

        .no-data {
            text-align: center;
            color: #718096;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        .user-card {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            padding: 1rem;
            box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
            transition: box-shadow 0.2s ease;
        }

        .user-card:hover {
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
        }

        .user-name {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }

        .role {
            color: #4a5568;
            margin-bottom: 0.5rem;
        }

        .permissions-title {
            font-weight: 600;
            color: #718096;
            margin-bottom: 0.5rem;
        }

        .permissions-list {
            list-style-type: disc;
            padding-left: 1.5rem;
            color: #4a5568;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1 class="header">Reporte de Usuarios</h1>

        @if(empty($users))
        <p class="no-data">No hay datos para mostrar.</p>
        @else
        <div class="grid">
            @foreach ($users as $user)
            <div class="user-card">
                <h2 class="user-name">Usuario: {{ $user['name'] }}</h2>

                <!-- Verificar si el rol es null y mostrar "Sin rol" -->
                <p class="role">Rol: {{ $user['role'] ? $user['role']['name'] : 'Sin rol' }}</p>

                <div>
                    <h3 class="permissions-title">Permisos:</h3>

                    <!-- Verificar si el usuario tiene permisos -->
                    @if (isset($user['role']['permissions']) && is_array($user['role']['permissions']) &&
                    count($user['role']['permissions']) > 0)
                    <ul class="permissions-list">
                        @foreach ($user['role']['permissions'] as $permission)
                        <li>{{ $permission['name'] }}</li>
                        @endforeach
                    </ul>
                    @else
                    <p>No hay permisos</p> <!-- Mensaje si no tiene permisos -->
                    @endif

                </div>
            </div>
            @endforeach

        </div>
        @endif
    </div>
    <script type="text/php">
        if (isset($pdf)) {
            $pdf->page_script('
                $font = $fontMetrics->get_font("Arial, sans-serif", "normal");
                $size = 8;
    
                // Texto del footer
                $user = "{{ $userName }}";
                $date = date("d/m/Y H:i");
                $footerText = "Impreso por: " . $user . " el " . $date;
    
                // Cálculo del ancho del texto para centrarlo
                $footerWidth = $fontMetrics->getTextWidth($footerText, $font, $size);
                $pageWidth = $pdf->get_width();
                $centeredX = ($pageWidth - $footerWidth) / 2;
    
                // Texto para la paginación
                $pageText = "Página " . $PAGE_NUM . " de " . $PAGE_COUNT;
    
                // Cálculo del ancho del texto de la paginación para centrarlo
                $pageWidthText = $fontMetrics->getTextWidth($pageText, $font, $size);
                $centeredPageX = ($pageWidth - $pageWidthText) / 2;
    
                // Posiciones en el eje Y
                $footerY = 820; // Línea del footer superior
                $pageY = 830; // Línea de la paginación
    
                // Dibujar texto
                $pdf->text($centeredX, $footerY, $footerText, $font, $size);
                $pdf->text($centeredPageX, $pageY, $pageText, $font, $size);
            ');
        }
    </script>
    

</body>

</html>