<?php

namespace Tests\Feature\Prova;

use App\Models\PerfilInstitucional;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CriarProvaTest extends TestCase
{
    use RefreshDatabase;

    public function test_convidado_e_redirecionado_para_login()
    {
        $this->get(route('prova.criar'))->assertRedirect(route('login'));
    }

    public function test_professor_autenticado_ve_o_wizard()
    {
        $professor = User::factory()->create();

        $response = $this->actingAs($professor)->get(route('prova.criar'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('prova/Criar'));
    }

    public function test_prop_perfis_traz_apenas_os_do_professor_logado()
    {
        $professor = User::factory()->create();
        $outroProfessor = User::factory()->create();

        $meuPerfil = PerfilInstitucional::factory()->for($professor)->create();
        PerfilInstitucional::factory()->for($outroProfessor)->create();

        $response = $this->actingAs($professor)->get(route('prova.criar'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('prova/Criar')
            ->has('perfis', 1)
            ->where('perfis.0.id', $meuPerfil->id)
            ->has('perfis.0', fn ($perfil) => $perfil
                ->hasAll(['id', 'instituicao', 'escola', 'professor', 'logo_url'])
                ->missing('logo_path')
            )
        );
    }

    public function test_prop_perfis_vazia_quando_professor_nao_tem_perfis()
    {
        $professor = User::factory()->create();

        $response = $this->actingAs($professor)->get(route('prova.criar'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('perfis', []));
    }
}
