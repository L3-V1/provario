<?php

namespace App\Http\Controllers;

use App\Services\PerfilInstitucionalService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProvaController extends Controller
{
    public function __construct(private readonly PerfilInstitucionalService $perfis) {}

    /**
     * Show the exam creation wizard.
     *
     * The exam itself is never persisted server-side; the wizard keeps its
     * state in the browser's localStorage. The only server data it needs is
     * the list of the professor's saved institutional profiles, used to
     * pre-fill the exam header.
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

        return Inertia::render('prova/Criar', [
            'perfis' => $perfis,
        ]);
    }
}
