<?php

namespace App\Services;

use App\Models\PerfilInstitucional;
use App\Models\User;
use App\Repositories\PerfilInstitucionalRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class PerfilInstitucionalService
{
    public function __construct(private readonly PerfilInstitucionalRepository $perfis) {}

    /**
     * List the professor's institutional profiles.
     *
     * @return Collection<int, PerfilInstitucional>
     */
    public function listar(User $professor): Collection
    {
        return $this->perfis->paraProfessor($professor);
    }

    /**
     * Find a profile by id, scoped to the given professor.
     */
    public function buscar(User $professor, int $id): PerfilInstitucional
    {
        return $this->perfis->encontrarDoProfessor($professor, $id);
    }

    /**
     * Create a new profile, storing the logo when provided.
     *
     * @param  array<string, mixed>  $dados
     */
    public function criar(User $professor, array $dados, ?UploadedFile $logo): PerfilInstitucional
    {
        if ($logo) {
            $dados['logo_path'] = $logo->store('logos', 'public');
        }

        return $this->perfis->criar($professor, $dados);
    }

    /**
     * Update a profile, managing the logo file according to the given flags.
     *
     * @param  array<string, mixed>  $dados
     */
    public function atualizar(
        PerfilInstitucional $perfil,
        array $dados,
        ?UploadedFile $logo,
        bool $removerLogo
    ): PerfilInstitucional {
        if ($logo) {
            $this->apagarLogo($perfil);
            $dados['logo_path'] = $logo->store('logos', 'public');
        } elseif ($removerLogo) {
            $this->apagarLogo($perfil);
            $dados['logo_path'] = null;
        }

        return $this->perfis->atualizar($perfil, $dados);
    }

    /**
     * Delete the profile and its logo file.
     */
    public function remover(PerfilInstitucional $perfil): void
    {
        $this->apagarLogo($perfil);

        $this->perfis->remover($perfil);
    }

    /**
     * Delete the profile's current logo file, if any.
     */
    private function apagarLogo(PerfilInstitucional $perfil): void
    {
        if ($perfil->logo_path) {
            Storage::disk('public')->delete($perfil->logo_path);
        }
    }
}
