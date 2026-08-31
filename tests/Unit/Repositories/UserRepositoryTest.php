<?php

namespace Tests\Unit\Repositories;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private UserRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new UserRepository;
    }

    public function test_it_creates_a_user()
    {
        $user = $this->repository->create([
            'name' => 'Fulano',
            'email' => 'fulano@example.com',
            'password' => 'secret-password',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'fulano@example.com']);
        $this->assertNotSame('secret-password', $user->password);
    }

    public function test_it_finds_a_user_by_email()
    {
        $user = User::factory()->create(['email' => 'ciclano@example.com']);

        $this->assertTrue($this->repository->findByEmail('ciclano@example.com')?->is($user));
        $this->assertNull($this->repository->findByEmail('naoexiste@example.com'));
    }

    public function test_it_resets_email_verification_when_email_changes()
    {
        $user = User::factory()->create();

        $this->repository->update($user, ['email' => 'novo@example.com']);

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_it_deletes_a_user()
    {
        $user = User::factory()->create();

        $this->repository->delete($user);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
