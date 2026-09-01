<?php

namespace App\Http\Requests\Perfil;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SalvarPerfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'instituicao' => ['required', 'string', 'max:255'],
            'escola' => ['required', 'string', 'max:255'],
            'professor' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'remover_logo' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'instituicao' => 'instituição',
            'escola' => 'escola',
            'professor' => 'professor',
            'logo' => 'logo',
            'remover_logo' => 'remover logo',
        ];
    }
}
