<?php

namespace App\Http\Controllers;

use App\Http\Requests\Perfil\SalvarPerfilRequest;
use App\Services\PerfilInstitucionalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerfilInstitucionalController extends Controller
{
    public function __construct(private readonly PerfilInstitucionalService $perfis) {}

    /**
     * List the professor's institutional profiles.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('perfis/Index', [
            'perfis' => $this->perfis->listar($request->user()),
        ]);
    }

    /**
     * Show the form to create a new profile.
     */
    public function create(): Response
    {
        return Inertia::render('perfis/Create');
    }

    /**
     * Store a newly created profile.
     */
    public function store(SalvarPerfilRequest $request): RedirectResponse
    {
        $this->perfis->criar($request->user(), $request->safe()->except('logo', 'remover_logo'), $request->file('logo'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Perfil cadastrado com sucesso.']);

        return to_route('perfis.index');
    }

    /**
     * Show the form to edit an existing profile.
     */
    public function edit(Request $request, int $perfil): Response
    {
        return Inertia::render('perfis/Edit', [
            'perfil' => $this->perfis->buscar($request->user(), $perfil),
        ]);
    }

    /**
     * Update the given profile.
     */
    public function update(SalvarPerfilRequest $request, int $perfil): RedirectResponse
    {
        $modelo = $this->perfis->buscar($request->user(), $perfil);

        $this->perfis->atualizar(
            $modelo,
            $request->safe()->except('logo', 'remover_logo'),
            $request->file('logo'),
            $request->boolean('remover_logo'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Perfil atualizado com sucesso.']);

        return to_route('perfis.index');
    }

    /**
     * Delete the given profile.
     */
    public function destroy(Request $request, int $perfil): RedirectResponse
    {
        $this->perfis->remover($this->perfis->buscar($request->user(), $perfil));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Perfil removido com sucesso.']);

        return to_route('perfis.index');
    }
}
