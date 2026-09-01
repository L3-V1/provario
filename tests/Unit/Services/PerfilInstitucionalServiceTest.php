<?php

namespace Tests\Unit\Services;

use App\Models\PerfilInstitucional;
use App\Models\User;
use App\Repositories\PerfilInstitucionalRepository;
use App\Services\PerfilInstitucionalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PerfilInstitucionalServiceTest extends TestCase
{
    use RefreshDatabase;

    private PerfilInstitucionalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->service = new PerfilInstitucionalService(new PerfilInstitucionalRepository);
    }

    private function dadosBasicos(): array
    {
        return [
            'instituicao' => 'Prefeitura de Santos',
            'escola' => 'EMEF Teste',
            'professor' => 'Fulano',
        ];
    }

    public function test_criar_sem_logo_deixa_logo_path_nulo()
    {
        $professor = User::factory()->create();

        $perfil = $this->service->criar($professor, $this->dadosBasicos(), null);

        $this->assertNull($perfil->logo_path);
    }

    public function test_criar_com_logo_grava_arquivo_e_seta_logo_path()
    {
        $professor = User::factory()->create();
        $logo = UploadedFile::fake()->image('logo.png');

        $perfil = $this->service->criar($professor, $this->dadosBasicos(), $logo);

        $this->assertNotNull($perfil->logo_path);
        $this->assertStringStartsWith('logos/', $perfil->logo_path);
        Storage::disk('public')->assertExists($perfil->logo_path);
    }

    public function test_atualizar_com_novo_logo_apaga_antigo_e_salva_novo()
    {
        $perfil = PerfilInstitucional::factory()->create(['logo_path' => 'logos/antigo.png']);
        Storage::disk('public')->put('logos/antigo.png', 'conteudo');
        $novoLogo = UploadedFile::fake()->image('novo.png');

        $atualizado = $this->service->atualizar($perfil, $this->dadosBasicos(), $novoLogo, false);

        Storage::disk('public')->assertMissing('logos/antigo.png');
        Storage::disk('public')->assertExists($atualizado->logo_path);
        $this->assertNotSame('logos/antigo.png', $atualizado->logo_path);
    }

    public function test_atualizar_com_remover_logo_apaga_antigo_e_zera_logo_path()
    {
        $perfil = PerfilInstitucional::factory()->create(['logo_path' => 'logos/antigo.png']);
        Storage::disk('public')->put('logos/antigo.png', 'conteudo');

        $atualizado = $this->service->atualizar($perfil, $this->dadosBasicos(), null, true);

        Storage::disk('public')->assertMissing('logos/antigo.png');
        $this->assertNull($atualizado->logo_path);
    }

    public function test_atualizar_sem_alteracao_de_logo_mantem_logo_path()
    {
        $perfil = PerfilInstitucional::factory()->create(['logo_path' => 'logos/atual.png']);
        Storage::disk('public')->put('logos/atual.png', 'conteudo');

        $atualizado = $this->service->atualizar($perfil, $this->dadosBasicos(), null, false);

        Storage::disk('public')->assertExists('logos/atual.png');
        $this->assertSame('logos/atual.png', $atualizado->logo_path);
    }

    public function test_remover_apaga_arquivo_e_registro()
    {
        $perfil = PerfilInstitucional::factory()->create(['logo_path' => 'logos/apagar.png']);
        Storage::disk('public')->put('logos/apagar.png', 'conteudo');

        $this->service->remover($perfil);

        Storage::disk('public')->assertMissing('logos/apagar.png');
        $this->assertDatabaseMissing('perfis_institucionais', ['id' => $perfil->id]);
    }
}
