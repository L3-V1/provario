<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\ProfileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProfileService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ProfileService(new UserRepository);
    }

    public function test_it_updates_profile_data()
    {
        $user = User::factory()->create();

        $this->service->updateProfile($user, [
            'name' => 'Nome Novo',
            'email' => $user->email,
        ]);

        $this->assertSame('Nome Novo', $user->refresh()->name);
    }

    public function test_it_updates_the_password()
    {
        $user = User::factory()->create();

        $this->service->updatePassword($user, 'outra-senha');

        $this->assertTrue(Hash::check('outra-senha', $user->refresh()->password));
    }
}
