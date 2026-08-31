<?php

use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

Route::redirect('settings', '/settings/profile');

Route::get('settings/profile', [ProfileController::class, 'edit'])
    ->name('profile.edit');
Route::patch('settings/profile', [ProfileController::class, 'update'])
    ->name('profile.update');

Route::put('settings/profile/password', [ProfileController::class, 'updatePassword'])
    ->middleware('throttle:6,1')
    ->name('profile.password.update');

Route::delete('settings/profile', [ProfileController::class, 'destroy'])
    ->name('profile.destroy');
