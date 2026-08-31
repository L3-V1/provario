<?php

namespace App\Repositories;

use App\Models\User;

class UserRepository
{
    /**
     * Find a user by e-mail address.
     */
    public function findByEmail(string $email): ?User
    {
        return User::query()->where('email', $email)->first();
    }

    /**
     * Persist a new user.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): User
    {
        return User::create($attributes);
    }

    /**
     * Update the given user with the provided attributes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $user, array $attributes): User
    {
        $user->fill($attributes);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return $user;
    }

    /**
     * Permanently delete the given user.
     */
    public function delete(User $user): void
    {
        $user->delete();
    }
}
