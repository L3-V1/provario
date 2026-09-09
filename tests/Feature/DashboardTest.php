<?php

namespace Tests\Feature;

use App\Models\PerfilInstitucional;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_prop_perfis_traz_apenas_os_do_professor_logado()
    {
        $professor = User::factory()->create();
        $outroProfessor = User::factory()->create();

        $meuPerfil = PerfilInstitucional::factory()->for($professor)->create();
        PerfilInstitucional::factory()->for($outroProfessor)->create();

        $response = $this->actingAs($professor)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
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

        $response = $this->actingAs($professor)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('perfis', []));
    }
}
