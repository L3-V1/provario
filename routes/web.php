<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PerfilInstitucionalController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)
        ->name('dashboard');

    Route::get('perfis', [PerfilInstitucionalController::class, 'index'])
        ->name('perfis.index');
    Route::get('perfis/criar', [PerfilInstitucionalController::class, 'create'])
        ->name('perfis.create');
    Route::post('perfis', [PerfilInstitucionalController::class, 'store'])
        ->name('perfis.store');
    Route::get('perfis/{perfil}/editar', [PerfilInstitucionalController::class, 'edit'])
        ->name('perfis.edit');
    Route::put('perfis/{perfil}', [PerfilInstitucionalController::class, 'update'])
        ->name('perfis.update');
    Route::delete('perfis/{perfil}', [PerfilInstitucionalController::class, 'destroy'])
        ->name('perfis.destroy');

    require __DIR__.'/settings.php';
});

require __DIR__.'/auth.php';
