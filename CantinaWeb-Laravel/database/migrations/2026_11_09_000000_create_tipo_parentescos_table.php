<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de parentescos del grupo familiar (Papá, Mamá, Tutor, ...).
 *
 * Igual que `tipo_persona`: los valores viven en la base y el vínculo
 * alumno–tutor los referencia por id, en lugar de guardar texto libre.
 */
return new class extends Migration
{
    private const PARENTESCOS = [
        'Papá',
        'Mamá',
        'Hermano',
        'Hermana',
        'Tío',
        'Tía',
        'Abuelo',
        'Abuela',
        'Tutor',
    ];

    public function up(): void
    {
        Schema::create('tipo_parentescos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 255);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();
        });

        $now = now();

        // updateOrInsert: re-ejecutar no duplica el catálogo.
        foreach (self::PARENTESCOS as $nombre) {
            DB::table('tipo_parentescos')->updateOrInsert(
                ['nombre' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tipo_parentescos');
    }
};
