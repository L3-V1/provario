<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileService
{
    public function __construct(private readonly UserRepository $users) {}

    /**
     * Update the user's profile information.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProfile(User $user, array $data): User
    {
        return $this->users->update($user, $data);
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(User $user, string $password): User
    {
        return $this->users->update($user, ['password' => $password]);
    }

    /**
     * Delete the user's account and terminate the session.
     */
    public function deleteAccount(User $user, Request $request): void
    {
        Auth::logout();

        $this->users->delete($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
