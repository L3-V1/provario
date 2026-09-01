<?php

namespace Tests\Unit\Repositories;

use App\Models\PerfilInstitucional;
use App\Models\User;
use App\Repositories\PerfilInstitucionalRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerfilInstitucionalRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private PerfilInstitucionalRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new PerfilInstitucionalRepository;
    }

    public function test_para_professor_filtra_por_user_id_e_ordena_por_instituicao()
    {
        $professor = User::factory()->create();
        $outroProfessor = User::factory()->create();

        PerfilInstitucional::factory()->for($professor)->create(['instituicao' => 'Zeta']);
        PerfilInstitucional::factory()->for($professor)->create(['instituicao' => 'Alfa']);
        PerfilInstitucional::factory()->for($outroProfessor)->create(['instituicao' => 'Beta']);

        $perfis = $this->repository->paraProfessor($professor);

        $this->assertCount(2, $perfis);
        $this->assertSame(['Alfa', 'Zeta'], $perfis->pluck('instituicao')->all());
    }

    public function test_encontrar_do_professor_lanca_excecao_para_id_de_outro_professor()
    {
        $professor = User::factory()->create();
        $outroProfessor = User::factory()->create();

        $perfil = PerfilInstitucional::factory()->for($outroProfessor)->create();

        $this->expectException(ModelNotFoundException::class);

        $this->repository->encontrarDoProfessor($professor, $perfil->id);
    }

    public function test_encontrar_do_professor_retorna_perfil_do_proprio_professor()
    {
        $professor = User::factory()->create();
        $perfil = PerfilInstitucional::factory()->for($professor)->create();

        $encontrado = $this->repository->encontrarDoProfessor($professor, $perfil->id);

        $this->assertTrue($encontrado->is($perfil));
    }

    public function test_criar_persiste_perfil_para_o_professor()
    {
        $professor = User::factory()->create();

        $perfil = $this->repository->criar($professor, [
            'instituicao' => 'Prefeitura de Santos',
            'escola' => 'EMEF Teste',
            'professor' => 'Fulano',
        ]);

        $this->assertDatabaseHas('perfis_institucionais', [
            'id' => $perfil->id,
            'user_id' => $professor->id,
            'instituicao' => 'Prefeitura de Santos',
        ]);
    }

    public function test_atualizar_persiste_alteracoes()
    {
        $perfil = PerfilInstitucional::factory()->create(['instituicao' => 'Antiga']);

        $atualizado = $this->repository->atualizar($perfil, ['instituicao' => 'Nova']);

        $this->assertSame('Nova', $atualizado->instituicao);
        $this->assertDatabaseHas('perfis_institucionais', ['id' => $perfil->id, 'instituicao' => 'Nova']);
    }

    public function test_remover_apaga_registro()
    {
        $perfil = PerfilInstitucional::factory()->create();

        $this->repository->remover($perfil);

        $this->assertDatabaseMissing('perfis_institucionais', ['id' => $perfil->id]);
    }
}
