<?php

namespace App\Repositories;

use App\Models\PerfilInstitucional;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class PerfilInstitucionalRepository
{
    /**
     * Get all institutional profiles belonging to the given professor.
     *
     * @return Collection<int, PerfilInstitucional>
     */
    public function paraProfessor(User $professor): Collection
    {
        return $professor->perfisInstitucionais()->orderBy('instituicao')->get();
    }

    /**
     * Find a profile by id, scoped to the given professor.
     */
    public function encontrarDoProfessor(User $professor, int $id): PerfilInstitucional
    {
        return $professor->perfisInstitucionais()->findOrFail($id);
    }

    /**
     * Persist a new profile for the given professor.
     *
     * @param  array<string, mixed>  $dados
     */
    public function criar(User $professor, array $dados): PerfilInstitucional
    {
        return $professor->perfisInstitucionais()->create($dados);
    }

    /**
     * Update the given profile with the provided data.
     *
     * @param  array<string, mixed>  $dados
     */
    public function atualizar(PerfilInstitucional $perfil, array $dados): PerfilInstitucional
    {
        $perfil->fill($dados);
        $perfil->save();

        return $perfil;
    }

    /**
     * Permanently delete the given profile.
     */
    public function remover(PerfilInstitucional $perfil): void
    {
        $perfil->delete();
    }
}
