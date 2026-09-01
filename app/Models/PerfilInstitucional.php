<?php

namespace App\Models;

use Database\Factories\PerfilInstitucionalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $instituicao
 * @property string $escola
 * @property string $professor
 * @property string|null $logo_path
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string|null $logo_url
 */
#[Fillable(['user_id', 'instituicao', 'escola', 'professor', 'logo_path'])]
class PerfilInstitucional extends Model
{
    /** @use HasFactory<PerfilInstitucionalFactory> */
    use HasFactory;

    protected $table = 'perfis_institucionais';

    /** @var list<string> */
    protected $appends = ['logo_url'];

    /**
     * Get the owning professor.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the public URL of the logo, if any.
     *
     * @return Attribute<string|null, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->logo_path ? asset('storage/'.$this->logo_path) : null,
        );
    }
}
