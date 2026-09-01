<?php

namespace Database\Factories;

use App\Models\PerfilInstitucional;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PerfilInstitucional>
 */
class PerfilInstitucionalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'instituicao' => fake()->company(),
            'escola' => fake()->company().' - Escola',
            'professor' => fake()->name(),
            'logo_path' => null,
        ];
    }
}
