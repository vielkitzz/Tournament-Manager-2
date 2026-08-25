# Ícone do torneio no Modo Foto

Complemento pequeno da última atualização do modo foto: permitir exibir um escudo/ícone no cabeçalho da imagem capturada.

## O que muda para o usuário

Em Configurações da competição > Modo Foto, junto às opções de cabeçalho, aparece um novo bloco "Ícone":

- **Escudo da competição** (padrão): usa o logo já salvo do torneio.
- **Personalizado**: upload/colar imagem só para as fotos (não altera o logo do torneio).
- **Sem ícone**.

O ícone aparece à esquerda do título na faixa do cabeçalho, e também na prévia do card de configuração (celular/desktop), no mesmo tamanho relativo ao zoom.

## Detalhes técnicos

- `src/lib/photoMode.ts`: adicionar `logoMode: "tournament" | "custom" | "none"` (default `"tournament"`) e `logoUrl?: string` em `PhotoModeSettings` + `DEFAULT_PHOTO_MODE`. Persistência já é feita pelo `savePhotoMode` por torneio (localStorage), sem migração necessária.
- `src/components/ScreenshotButton.tsx`: resolver a imagem final (logo do torneio via store quando `logoMode === "tournament"`, `logoUrl` quando custom) e passar como `logo` para `captureScreenshotDataUrl`.
- `src/lib/screenshotUtils.ts`: no bloco `#photo-header`, renderizar `<img class="logo">` antes da barra/título quando houver imagem; converter para data URL com o helper já existente (mesmo caminho usado pelos escudos dos times) para não quebrar no Safari/CORS; tamanho `~2.6rem` acompanhando a escala tipográfica; sem imagem, layout atual permanece igual.
- `src/components/tournament/PhotoModeSettingsCard.tsx`: seletor de 3 opções + `ImageUpload` (componente existente) quando "Personalizado", e render do ícone na prévia.
- Teste: estender `src/test/photoMode.test.ts` com o default e o resolve de `logoMode`/`logoUrl`.

Nada de backend, nada de mudança em dados do torneio.
