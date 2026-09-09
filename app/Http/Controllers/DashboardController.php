<?php

namespace App\Http\Controllers;

use App\Services\PerfilInstitucionalService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly PerfilInstitucionalService $perfis) {}

    /**
     * Show the application dashboard.
     *
     * Besides the browser-side exam draft, the panel shows a summary of the
     * professor's saved institutional profiles, so the controller sends the
     * same `perfis` payload the exam wizard already uses.
     */
    public function __invoke(Request $request): Response
    {
        $perfis = $this->perfis->listar($request->user())
            ->map(fn ($perfil) => [
                'id' => $perfil->id,
                'instituicao' => $perfil->instituicao,
                'escola' => $perfil->escola,
                'professor' => $perfil->professor,
                'logo_url' => $perfil->logo_url,
            ])
            ->values();

        return Inertia::render('Dashboard', [
            'perfis' => $perfis,
        ]);
    }
}
