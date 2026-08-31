# Datas serializadas em UTC ISO, ignorando `app.timezone`

- **Data:** 2026-08-31
- **Tags:** laravel, inertia, vue, timezone, carbon, primevue-datepicker
- **Status:** resolvido

## Contexto

Laravel 13 + Inertia + Vue, `config('app.timezone') = 'America/Sao_Paulo'`.
Coluna `baixas.data_baixa` é `date`; timestamps são `timestamp`. A ficha do
ativo exibia a data da baixa.

## Sintoma

Na tela aparecia a string crua do JSON:

```
2026-08-31T03:00:00.000000Z
```

Data gravada no banco: `2026-08-31 00:00:00`. O `Z` (UTC) e o deslocamento de
3 h vinham de graça.

## Causa raiz

Dois pontos independentes:

1. **Backend.** `config('app.timezone')` só afeta funções de data do PHP e a
   hora em que o Carbon interpreta valores *sem* fuso. Não muda a
   **serialização**: `Model::serializeDate()` sempre emite ISO-8601 em UTC
   (`Y-m-d\TH:i:s.u\Z`). Como o Carbon nasce em `America/Sao_Paulo` à
   meia-noite, ao converter para UTC vira `03:00Z`.
2. **Frontend.** `new Date(data.data_baixa).toISOString().slice(0, 10)` no
   `BaixaDialog` calculava o dia em UTC. Num navegador a leste de Greenwich
   (ex.: `Asia/Tokyo`), o dia escolhido no `DatePicker` era gravado como o
   **dia anterior**. Além disso `new Date()` como valor inicial / `max-date`
   usava o fuso do navegador, não o de Brasília.

## Solução

Backend — trait `App\Models\Concerns\FormataDatas` aplicada a todos os models
(`Ativo`, `Baixa`, `Categoria`, `Local`, `User`):

```php
protected function serializeDate(DateTimeInterface $date): string
{
    return Carbon::instance($date)
        ->setTimezone(Config::string('app.timezone'))
        ->format('d/m/Y H:i:s');
}
```

`App\Support\Datas::paraData()` / `paraDataHora()` convertem o formato do
formulário (`dd/mm/yyyy [HH:mm[:ss]]`) para o do banco (`Y-m-d` / `Y-m-d H:i:s`)
em `prepareForValidation()` do FormRequest. A regra passou a ser
`date_format:Y-m-d` (formato já normalizado), não `date`.

Frontend — `resources/js/lib/datetime.ts` reescrito, tudo ancorado em
`America/Sao_Paulo` via `Intl.DateTimeFormat`:

- `parseDateTime` aceita `dd/mm/yyyy[ HH:mm[:ss]]`, ISO e `Date`;
- `formatDateTime` (`dd/mm/yyyy HH:mm:ss`) e `formatDate` (`dd/mm/yyyy`);
- `toDatabaseDate` / `toDatabaseDateTime` usam o dia **exibido** no campo, sem
  passar por `toISOString`;
- `hoje()` / `agora()` devolvem a data corrente de Brasília, não do navegador;
- `DATE_PICKER_FORMAT = 'dd/mm/yy'` (ano completo na convenção PrimeVue).

Campo `date` puro (ex.: `data_baixa`): exibir com `formatDate`, não
`formatDateTime` — o backend manda `00:00:00` junto e a hora é ruído.

## Como evitar ou detectar antes

- Todo model novo com data visível na UI deve usar a trait `FormataDatas`.
- Nunca `toISOString().slice(0,10)` para extrair dia de um `DatePicker`: use
  `toDatabaseDate()`.
- Valor inicial / `min-date` / `max-date` de `DatePicker`: `hoje()`/`agora()`,
  nunca `new Date()`.
- Teste de fuso: rodar o bundle da lib com `TZ=Asia/Tokyo` e `TZ=UTC` deve dar
  o mesmo resultado que `TZ=America/Sao_Paulo`.

## Referências

- `app/Models/Concerns/FormataDatas.php`, `app/Support/Datas.php`
- `resources/js/lib/datetime.ts`