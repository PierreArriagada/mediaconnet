# MediConnect — Sistema de Colores y Tokens de Diseño
**Design System: "Empathetic Precision"**  
**Fuente canónica:** `app/src/theme/variables.scss`  
**Última revisión:** Abril 2026

---

## Índice
1. [Filosofía del Sistema](#1-filosofía-del-sistema)
2. [Nomenclatura de Variables](#2-nomenclatura-de-variables)
3. [Paletas de Color](#3-paletas-de-color)
4. [Jerarquía de Superficies (Surface Hierarchy)](#4-jerarquía-de-superficies-surface-hierarchy)
5. [Tokens Compuestos (Ready-to-Use)](#5-tokens-compuestos-ready-to-use)
6. [Escala de Border Radius](#6-escala-de-border-radius)
7. [Escala Tipográfica](#7-escala-tipográfica)
8. [Puente Ionic (Ion Bridge)](#8-puente-ionic-ion-bridge)
9. [Modo Oscuro](#9-modo-oscuro)
10. [Reglas Críticas (Do's & Don'ts)](#10-reglas-críticas-dos--donts)
11. [Guía de Uso por Componente](#11-guía-de-uso-por-componente)

---

## 1. Filosofía del Sistema

### "The No-Line Rule"
**Prohibido** el uso de bordes `1px solid` para separar secciones o tarjetas. La separación visual se logra **exclusivamente** mediante cambios en el valor de fondo entre tokens de superficie adyacentes:
- Sección → `--mc-surface-container-low` (`#f3f3f4`)
- Tarjeta dentro de sección → `--mc-surface-container-lowest` (`#ffffff`)
El contraste entre ambos tonos es suficiente para definir forma sin ruido visual.

### "Never Black"
Nunca usar `#000000` como color de texto. El color canónico de texto es `--mc-on-surface` (`#1a1c1c`), que produce un contraste premium y suave.

### "Tonal Layering over Drop Shadows"
Las sombras tradicionales son **último recurso**. La jerarquía visual se comunica mediante capas de superficie (fondo claro sobre fondo ligeramente más oscuro). Cuando se requiere sombra, usar únicamente el token `--mc-shadow-fab`.

---

## 2. Nomenclatura de Variables

| Prefijo | Scope | Ejemplo |
|---------|-------|---------|
| `--mc-*` | Token propio de MediConnect (canónico) | `--mc-primary` |
| `--ion-color-*` | Puente para Ionic Framework | `--ion-color-primary` |
| `--ion-*` | Configuración global de Ionic | `--ion-background-color` |

**Regla de actualización:** Si se necesita cambiar un color, **solo se modifica el token `--mc-*`**. El puente Ionic (`--ion-*`) hereda el cambio automáticamente mediante `var(--mc-*)`.

---

## 3. Paletas de Color

### 3.1 Primario — Core Brand Blue
| Token | Valor | Uso |
|-------|-------|-----|
| `--mc-primary` | `#005ea4` | Botones primarios, iconos activos, indicadores de selección |
| `--mc-on-primary` | `#ffffff` | Texto/icono sobre fondo primario |
| `--mc-primary-container` | `#0077ce` | Endpoint del gradiente en botones (135°) |
| `--mc-on-primary-container` | `#001d35` | Texto sobre `primary-container` |
| `--mc-primary-fixed` | `#d3e4ff` | Fondo de chips "Health Vital" |
| `--mc-primary-fixed-dim` | `#a5c8f9` | Estado activo de chips |
| `--mc-on-primary-fixed` | `#001c38` | Texto en chips con fondo `primary-fixed` |
| `--mc-on-primary-fixed-variant` | `#004a87` | Texto secundario en chips |
| `--mc-inverse-primary` | `#a5c8f9` | Uso en superficies inversas (dark mode accent) |

### 3.2 Secundario — Soft Blue
| Token | Valor | Uso |
|-------|-------|-----|
| `--mc-secondary` | `#446084` | Botones secundarios, etiquetas de categoría |
| `--mc-on-secondary` | `#ffffff` | Texto sobre fondo secundario |
| `--mc-secondary-container` | `#b7d4fd` | Fondos de badges, tags |
| `--mc-on-secondary-container` | `#001d35` | Texto sobre `secondary-container` |
| `--mc-secondary-fixed` | `#d2e4ff` | Superficies fijas secundarias |
| `--mc-secondary-fixed-dim` | `#b7d4fd` | Variante dim de `secondary-fixed` |
| `--mc-on-secondary-fixed` | `#001d35` | Texto sobre `secondary-fixed` |
| `--mc-on-secondary-fixed-variant` | `#2c4866` | Variante de texto sobre fijo secundario |

### 3.3 Terciario — "Clinical Warmth"
| Token | Valor | Uso |
|-------|-------|-----|
| `--mc-tertiary` | `#8f4a00` | Alertas de atención, métricas críticas |
| `--mc-on-tertiary` | `#ffffff` | Texto sobre terciario |
| `--mc-tertiary-container` | `#ffb870` | Fondos de alertas warm |
| `--mc-on-tertiary-container` | `#2e1400` | Texto sobre `tertiary-container` |
| `--mc-tertiary-fixed` | `#ffdcc4` | Chips warm, etiquetas de urgencia leve |
| `--mc-tertiary-fixed-dim` | `#ffb870` | Variante activa de chips terciarios |
| `--mc-on-tertiary-fixed` | `#2e1400` | Texto en chips terciarios |
| `--mc-on-tertiary-fixed-variant` | `#6d3600` | Texto secundario en chips terciarios |

### 3.4 Error
| Token | Valor | Uso |
|-------|-------|-----|
| `--mc-error` | `#ba1a1a` | Estado de error en validaciones |
| `--mc-on-error` | `#ffffff` | Texto/icono sobre fondo de error |
| `--mc-error-container` | `#ffdad6` | **Tint de fondo completo** del campo inválido (NO borde rojo) |
| `--mc-on-error-container` | `#410002` | Texto de mensaje de error |

### 3.5 Texto y Contornos
| Token | Valor | Uso |
|-------|-------|-----|
| `--mc-on-surface` | `#1a1c1c` | **Color de texto principal** — obligatorio en toda la app |
| `--mc-on-surface-variant` | `#424748` | Texto secundario, captions, placeholders |
| `--mc-inverse-surface` | `#2e3132` | Superficies de snackbar / toasts |
| `--mc-inverse-on-surface` | `#eff1f1` | Texto en superficies inversas |
| `--mc-outline` | `#72787a` | Contornos de íconos, separadores de paso |
| `--mc-outline-variant` | `#c1c7c9` | Base del "Ghost Border" (usar al 15% de opacidad) |
| `--mc-scrim` | `#000000` | Overlay de modales, drawers |

---

## 4. Jerarquía de Superficies (Surface Hierarchy)

El sistema de superficies funciona como capas de **vidrio esmerilado físico**. El ojo humano percibe la capa más clara como más cercana.

```
┌─────────────────────────────────────────────────────────┐
│  Level 3  Modal / Popover   Glassmorphism               │
│           --mc-glass-bg (rgba surface 72%) + blur 20px  │
├─────────────────────────────────────────────────────────┤
│  Level 2  Tarjeta Activa    --mc-surface-container-     │
│                             lowest (#ffffff)            │
├─────────────────────────────────────────────────────────┤
│  Level 1  Sección           --mc-surface-container-     │
│                             low (#f3f3f4)               │
├─────────────────────────────────────────────────────────┤
│  Level 0  Fondo de la App   --mc-surface (#f9f9f9)      │
└─────────────────────────────────────────────────────────┘
```

### Tokens de superficie completos (light mode)
| Token | Valor | Nivel |
|-------|-------|-------|
| `--mc-surface` | `#f9f9f9` | 0 — Background de la app |
| `--mc-surface-container-lowest` | `#ffffff` | 2 — Tarjetas activas / cards |
| `--mc-surface-container-low` | `#f3f3f4` | 1 — Fondo de secciones |
| `--mc-surface-container` | `#ededed` | — Paneles intermedios |
| `--mc-surface-container-high` | `#e7e7e8` | — Estado hover / pressed |
| `--mc-surface-container-highest` | `#e2e2e3` | — Campos de input (estado normal) |
| `--mc-surface-tint` | `#005ea4` | — Hue para inner-glow de chips |

---

## 5. Tokens Compuestos (Ready-to-Use)

Estos tokens están **pre-calculados** en `variables.scss` y deben usarse directamente en los componentes, sin recalcular manualmente los valores.

| Token | Valor | Uso en Componente |
|-------|-------|------------------|
| `--mc-gradient-primary` | `linear-gradient(135deg, #005ea4 0%, #0077ce 100%)` | `background` de botones primarios |
| `--mc-glass-bg` | `rgba(249, 249, 249, 0.72)` | `background` de headers/navbars flotantes |
| `--mc-glass-blur` | `20px` | `backdrop-filter: blur(var(--mc-glass-blur))` |
| `--mc-shadow-fab` | `0 8px 32px 0 rgba(26,28,28,0.04)` | `box-shadow` en FABs y modales prioritarios |
| `--mc-border-ghost` | `rgba(193, 199, 201, 0.15)` | `border` en botones ghost / high-contrast mode |

### Ejemplo de uso — Botón Primario
```scss
.btn-primary {
  background: var(--mc-gradient-primary);
  color: var(--mc-on-primary);
  border-radius: var(--mc-radius-xl);
  padding: 16px 32px;
  border: none;
}
```

### Ejemplo de uso — Header con Glassmorphism
```scss
ion-toolbar {
  --background: var(--mc-glass-bg);
  backdrop-filter: blur(var(--mc-glass-blur));
  -webkit-backdrop-filter: blur(var(--mc-glass-blur));
}
```

### Ejemplo de uso — Campo con Error
```scss
ion-input.is-error {
  --background: var(--mc-error-container);
  // NO usar border rojo — el tint completo es la señal de error
}
```

---

## 6. Escala de Border Radius

| Token | Valor | Componente destino |
|-------|-------|--------------------|
| `--mc-radius-sm` | `0.5rem` (8px) | Chips, badges, elementos menores |
| `--mc-radius-md` | `1.5rem` (24px) | Campos de input |
| `--mc-radius-lg` | `2rem` (32px) | Cards, contenedores de lista |
| `--mc-radius-xl` | `3rem` (48px) | Botones de acción primaria |

---

## 7. Escala Tipográfica

| Token | Valor | Fuente | Uso |
|-------|-------|--------|-----|
| `--mc-font-authority` | `'Manrope', system-ui` | — | `display`, `headline` |
| `--mc-font-utility` | `'Inter', system-ui` | — | `title`, `body`, `label` |
| `--mc-type-display-lg` | `3.5rem` (56px) | Manrope | Saludos ("Hola, Dr. García") |
| `--mc-type-headline-sm` | `1.5rem` (24px) | Manrope | Encabezados de sección |
| `--mc-type-body-lg` | `1rem` (16px) | Inter | Datos de paciente, instrucciones |
| `--mc-tracking-headline` | `-0.02em` | — | `letter-spacing` en Headline-SM |
| `--mc-leading-body` | `1.6` | — | `line-height` en Body-LG |

```scss
// Ejemplo: Encabezado de sección
.section-title {
  font-family: var(--mc-font-authority);
  font-size: var(--mc-type-headline-sm);
  letter-spacing: var(--mc-tracking-headline);
  color: var(--mc-on-surface);
}

// Ejemplo: Texto de datos clínicos
.patient-data {
  font-family: var(--mc-font-utility);
  font-size: var(--mc-type-body-lg);
  line-height: var(--mc-leading-body);
  color: var(--mc-on-surface);
}
```

---

## 8. Puente Ionic (Ion Bridge)

Ionic Framework usa sus propias variables `--ion-*`. Para mantener consistencia, los tokens `--mc-*` se mapean automáticamente a `--ion-*` dentro de `:root` en `variables.scss`. **No modificar las variables `--ion-*` directamente**; el cambio debe hacerse en el token `--mc-*` fuente.

| Variable Ionic | Mapeada a token MC |
|----------------|-------------------|
| `--ion-background-color` | `var(--mc-surface)` |
| `--ion-text-color` | `var(--mc-on-surface)` |
| `--ion-border-color` | `transparent` ← No-Line rule |
| `--ion-item-border-color` | `transparent` ← No-Line rule |
| `--ion-item-background` | `var(--mc-surface-container-lowest)` |
| `--ion-toolbar-background` | `var(--mc-glass-bg)` |
| `--ion-color-primary` | `var(--mc-primary)` |
| `--ion-color-secondary` | `var(--mc-secondary)` |
| `--ion-color-tertiary` | `var(--mc-tertiary)` |
| `--ion-color-danger` | `var(--mc-error)` |
| `--ion-color-light` | `var(--mc-surface-container-lowest)` |
| `--ion-color-medium` | `var(--mc-on-surface-variant)` |
| `--ion-color-dark` | `var(--mc-on-surface)` |

---

## 9. Modo Oscuro

El modo oscuro se activa automáticamente vía `@media (prefers-color-scheme: dark)` que ya está importado en `global.scss` (`dark.system.css`). **Todos los tokens `--mc-*` se reinvierten dentro de ese media query** en `variables.scss`.

No es necesaria ninguna clase adicional. El sistema respeta la preferencia del sistema operativo del usuario.

### Resumen de cambios principales en dark mode
| Token | Light | Dark |
|-------|-------|------|
| `--mc-primary` | `#005ea4` | `#a5c8f9` |
| `--mc-surface` | `#f9f9f9` | `#111415` |
| `--mc-surface-container-lowest` | `#ffffff` | `#0c0f0f` |
| `--mc-on-surface` | `#1a1c1c` | `#e1e3e3` |
| `--mc-error` | `#ba1a1a` | `#ffb4ab` |
| `--mc-glass-bg` | `rgba(249,249,249,0.72)` | `rgba(17,20,21,0.72)` |

---

## 10. Reglas Críticas (Do's & Don'ts)

### ✅ Hacer
- Usar `--mc-on-surface` (`#1a1c1c`) como color de texto en **todo** el proyecto.
- Separar secciones solo con cambio de `background-color` entre tokens de superficie adyacentes.
- Aplicar `--mc-gradient-primary` en botones de acción primaria.
- Usar `--mc-error-container` como fondo completo del campo inválido (no borde rojo).
- Usar `--mc-border-ghost` (outline-variant al 15%) para botones ghost o modo alto contraste.
- Usar nombres en español en Title Case para encabezados ("Próximas Citas").
- Dejar "oxígeno": alinear titular a la izquierda y dejar el 40% derecho vacío.
- Usar íconos de trazo fino (1px) consistente con el peso del typeface Inter.

### ❌ No Hacer
- **Nunca** usar `#000000` como color de texto.
- **Nunca** usar bordes `1px solid` para separar secciones o tarjetas.
- **Nunca** usar `box-shadow` con offset/blur grandes (Material "Drop Shadow"). Solo `--mc-shadow-fab`.
- **Nunca** modificar variables `--ion-color-*` directamente; cambiar el `--mc-*` fuente.
- **Nunca** usar `border-color` al 100% de opacidad; usar `--mc-border-ghost` o similar reducido.
- **Nunca** saturar una pantalla; si se siente llena, mover 20% del contenido a sub-página o "Ver más".
- **Nunca** reinventar colores fuera de este documento. Si se necesita un nuevo token, añadirlo aquí primero.

---

## 11. Guía de Uso por Componente

### Botón Primario
```scss
background: var(--mc-gradient-primary);
color: var(--mc-on-primary);
border-radius: var(--mc-radius-xl);   // 3rem
padding: 16px 32px;
border: none;
```

### Botón Secundario (Ghost)
```scss
background: transparent;
color: var(--mc-primary);
border: 1px solid var(--mc-border-ghost);
border-radius: var(--mc-radius-xl);
```

### Card
```scss
background: var(--mc-surface-container-lowest);
border-radius: var(--mc-radius-lg);   // 2rem
// NO box-shadow, NO border — solo contraste con section background
// Estado pressed:
transform: scale(0.98);
background: var(--mc-surface-container-highest);
```

### Sección / Contenedor de Lista
```scss
background: var(--mc-surface-container-low);
border-radius: var(--mc-radius-lg);
// Ítems separados con gap: 8px, sin dividers
```

### Input Field
```scss
// Normal
--background: var(--mc-surface-container-highest);
border-radius: var(--mc-radius-md);   // 1.5rem

// Error — background tint completo, sin borde rojo
--background: var(--mc-error-container);
```

### Chip "Health Vital"
```scss
background: var(--mc-primary-fixed);
color: var(--mc-on-primary-fixed);
border-radius: var(--mc-radius-sm);   // 0.5rem
// Estado activo:
box-shadow: inset 0 0 0 2px var(--mc-surface-tint);
```

### Toolbar / Header Flotante
```scss
--background: var(--mc-glass-bg);
backdrop-filter: blur(var(--mc-glass-blur));
-webkit-backdrop-filter: blur(var(--mc-glass-blur));
```

### FAB / Modal de alta prioridad
```scss
box-shadow: var(--mc-shadow-fab);
```

---

*Documento mantenido por el equipo de diseño y front-end de MediConnect. Cualquier adición de token debe pasar revisión de diseño antes de ser añadida a `variables.scss`.*
