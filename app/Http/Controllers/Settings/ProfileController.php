<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\Profile\UpdatePasswordRequest;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Services\ProfileService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profile) {}

    /**
     * Show the user's profile settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/Profile');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $this->profile->updateProfile($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Perfil atualizado com sucesso.']);

        return to_route('profile.edit');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(UpdatePasswordRequest $request): RedirectResponse
    {
        $this->profile->updatePassword($request->user(), $request->validated('password'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Senha alterada com sucesso.']);

        return back();
    }

    /**
     * Delete the user's account.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $this->profile->deleteAccount($request->user(), $request);

        return redirect('/');
    }
}
