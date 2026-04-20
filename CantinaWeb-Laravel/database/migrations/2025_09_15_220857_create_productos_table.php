<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
            Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            
            $table->string('codigo_interno', 50)->unique()->nullable();         
            $table->string('codigo_barras', 100)->nullable();  
            $table->string('nombre', 255);
            $table->text('descripcion')->nullable();
            $table->unsignedBigInteger('id_Categoria');
            $table->decimal('cantidad_unidad', 12, 4); 
            $table->unsignedBigInteger('id_TipoUnidadMedida');    
            $table->decimal('precio_compra', 12, 2)->default(0);
            $table->decimal('precio_venta', 12, 2)->default(0);
            $table->integer('stock_minimo')->default(0);
            $table->integer('stock_actual')->default(0);
            $table->unsignedBigInteger('id_TipoEstado');
            $table->string('imagen')->nullable();
            $table->string('UrevUsuario')->nullable(); 
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
            $table->foreign('id_TipoEstado')->references('id')->on('tipo_estados');
            $table->foreign('id_Categoria')->references('id')->on('categorias');
            $table->foreign('id_TipoUnidadMedida')->references('id')->on('tipo_unidad_medidas');
    });
    //DB::statement('ALTER TABLE productos ADD UrevCalc AS (ISNULL(UrevUsuario, \'\') + \' - \' + ISNULL(FORMAT(UrevFechaHora, \'dd/MM/yyyy HH:mm\'), \'\'))');


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
