<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function create(): Response
    {
        return Inertia::render('auth/Register');
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $user = $this->auth->register($request->validated());

        Auth::login($user);

        return redirect()->route('dashboard');
    }
}
