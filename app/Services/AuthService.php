<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;

class AuthService
{
    public function __construct(private readonly UserRepository $users) {}

    /**
     * Register a new user.
     *
     * @param  array<string, mixed>  $data
     */
    public function register(array $data): User
    {
        return $this->users->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
    }
}
