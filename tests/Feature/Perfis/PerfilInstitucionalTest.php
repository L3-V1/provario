<?php

namespace Tests\Feature\Perfis;

use App\Models\PerfilInstitucional;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PerfilInstitucionalTest extends TestCase
{
    use RefreshDatabase;

    private function dadosBasicos(): array
    {
        return [
            'instituicao' => 'Prefeitura de Santos',
            'escola' => 'EMEF Teste',
            'professor' => 'Fulano',
        ];
    }

    public function test_convidado_e_redirecionado_para_login_em_todas_as_rotas()
    {
        $perfil = PerfilInstitucional::factory()->create();

        $this->get(route('perfis.index'))->assertRedirect(route('login'));
        $this->get(route('perfis.create'))->assertRedirect(route('login'));
        $this->post(route('perfis.store'), $this->dadosBasicos())->assertRedirect(route('login'));
        $this->get(route('perfis.edit', $perfil))->assertRedirect(route('login'));
        $this->put(route('perfis.update', $perfil), $this->dadosBasicos())->assertRedirect(route('login'));
        $this->delete(route('perfis.destroy', $perfil))->assertRedirect(route('login'));
    }

    public function test_index_lista_apenas_perfis_do_professor_logado()
    {
        $professor = User::factory()->create();
        $outroProfessor = User::factory()->create();

        $meuPerfil = PerfilInstitucional::factory()->for($professor)->create();
        PerfilInstitucional::factory()->for($outroProfessor)->create();

        $response = $this->actingAs($professor)->get(route('perfis.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('perfis/Index')
            ->has('perfis', 1)
            ->where('perfis.0.id', $meuPerfil->id)
        );
    }

    public function test_index_expoe_logo_url_do_perfil()
    {
        $professor = User::factory()->create();
        PerfilInstitucional::factory()->for($professor)->create(['logo_path' => 'logos/exemplo.png']);

        $response = $this->actingAs($professor)->get(route('perfis.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('perfis.0.logo_url', fn ($url) => is_string($url) && str_contains($url, 'logos/exemplo.png'))
        );
    }

    public function test_store_sem_logo_cria_perfil()
    {
        $professor = User::factory()->create();

        $response = $this->actingAs($professor)->post(route('perfis.store'), $this->dadosBasicos());

        $response->assertRedirect(route('perfis.index'));
        $this->assertDatabaseHas('perfis_institucionais', [
            'user_id' => $professor->id,
            'instituicao' => 'Prefeitura de Santos',
        ]);
    }

    public function test_store_valida_campos_obrigatorios()
    {
        $professor = User::factory()->create();

        $response = $this->actingAs($professor)->post(route('perfis.store'), []);

        $response->assertSessionHasErrors(['instituicao', 'escola', 'professor']);
    }

    public function test_store_valida_mimes_e_tamanho_maximo_do_logo()
    {
        Storage::fake('public');
        $professor = User::factory()->create();

        $arquivoInvalido = UploadedFile::fake()->create('documento.pdf', 100);
        $response = $this->actingAs($professor)->post(route('perfis.store'), [
            ...$this->dadosBasicos(),
            'logo' => $arquivoInvalido,
        ]);
        $response->assertSessionHasErrors('logo');

        $arquivoGrande = UploadedFile::fake()->image('grande.png')->size(3000);
        $response = $this->actingAs($professor)->post(route('perfis.store'), [
            ...$this->dadosBasicos(),
            'logo' => $arquivoGrande,
        ]);
        $response->assertSessionHasErrors('logo');
    }

    public function test_store_com_logo_grava_arquivo_e_logo_path()
    {
        $disco = Storage::fake('public');
        $professor = User::factory()->create();
        $logo = UploadedFile::fake()->image('logo.png');

        $response = $this->actingAs($professor)->post(route('perfis.store'), [
            ...$this->dadosBasicos(),
            'logo' => $logo,
        ]);

        $response->assertRedirect(route('perfis.index'));
        $perfil = PerfilInstitucional::first();
        $this->assertNotNull($perfil->logo_path);
        $this->assertStringStartsWith('logos/', $perfil->logo_path);
        $disco->assertExists($perfil->logo_path);
    }

    public function test_edit_de_perfil_de_outro_professor_retorna_404()
    {
        $professor = User::factory()->create();
        $perfilDeOutro = PerfilInstitucional::factory()->create();

        $this->actingAs($professor)->get(route('perfis.edit', $perfilDeOutro))->assertNotFound();
    }

    public function test_update_de_perfil_de_outro_professor_retorna_404()
    {
        $professor = User::factory()->create();
        $perfilDeOutro = PerfilInstitucional::factory()->create();

        $this->actingAs($professor)
            ->put(route('perfis.update', $perfilDeOutro), $this->dadosBasicos())
            ->assertNotFound();
    }

    public function test_destroy_de_perfil_de_outro_professor_retorna_404()
    {
        $professor = User::factory()->create();
        $perfilDeOutro = PerfilInstitucional::factory()->create();

        $this->actingAs($professor)
            ->delete(route('perfis.destroy', $perfilDeOutro))
            ->assertNotFound();
    }

    public function test_update_trocando_logo_apaga_arquivo_antigo()
    {
        $disco = Storage::fake('public');
        $professor = User::factory()->create();
        $perfil = PerfilInstitucional::factory()->for($professor)->create(['logo_path' => 'logos/antigo.png']);
        $disco->put('logos/antigo.png', 'conteudo');

        $novoLogo = UploadedFile::fake()->image('novo.png');
        $response = $this->actingAs($professor)->put(route('perfis.update', $perfil), [
            ...$this->dadosBasicos(),
            'logo' => $novoLogo,
        ]);

        $response->assertRedirect(route('perfis.index'));
        $disco->assertMissing('logos/antigo.png');
        $disco->assertExists($perfil->refresh()->logo_path);
    }

    public function test_update_com_remover_logo_apaga_arquivo_e_zera_logo_path()
    {
        $disco = Storage::fake('public');
        $professor = User::factory()->create();
        $perfil = PerfilInstitucional::factory()->for($professor)->create(['logo_path' => 'logos/antigo.png']);
        $disco->put('logos/antigo.png', 'conteudo');

        $response = $this->actingAs($professor)->put(route('perfis.update', $perfil), [
            ...$this->dadosBasicos(),
            'remover_logo' => true,
        ]);

        $response->assertRedirect(route('perfis.index'));
        $disco->assertMissing('logos/antigo.png');
        $this->assertNull($perfil->refresh()->logo_path);
    }

    public function test_destroy_remove_registro_e_arquivo_com_flash_toast()
    {
        $disco = Storage::fake('public');
        $professor = User::factory()->create();
        $perfil = PerfilInstitucional::factory()->for($professor)->create(['logo_path' => 'logos/apagar.png']);
        $disco->put('logos/apagar.png', 'conteudo');

        $response = $this->actingAs($professor)->delete(route('perfis.destroy', $perfil));

        $response->assertRedirect(route('perfis.index'));
        $response->assertSessionHas('inertia.flash_data.toast');
        $this->assertDatabaseMissing('perfis_institucionais', ['id' => $perfil->id]);
        $disco->assertMissing('logos/apagar.png');
    }
}
