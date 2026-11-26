# Projektstruktur

_Zuletzt aktualisiert: 2026-11-26 – KI-Chat entfernt_

## Überblick

SowaBoard ist eine Electron-Desktop-App (React 19, TypeScript, electron-vite) zur Verwaltung von Projekten, Tickets (Kanban-Board) und Dokumentationsseiten pro Projekt. Ein KI-Chat ist geplant, aber derzeit nicht eingebaut. Das Backend ist **nicht Teil dieses Repos**: Es läuft als separater Server (Standard `http://localhost:3000`, PostgreSQL laut `/health/db`). Der Vertrag zwischen App und Backend ist `openapi/openapi.yaml`, aus dem die TypeScript-Typen für den Renderer generiert werden. Alle Backend-Requests laufen vom Renderer über IPC durch den Main-Prozess.

## Verzeichnisbaum

```
SowaBoard/
├── .github/workflows/Ci.yml      # CI: Biome, tsc, Tests, Build, Deploy auf GitHub Pages
├── build/                        # Icons und Entitlements für electron-builder
├── docs/                         # Projektdokumentation (diese Dateien)
│   └── decisions/                # Architekturentscheidungen (ADR)
├── openapi/openapi.yaml          # API-Vertrag des externen Backends (OpenAPI 3.1)
├── resources/icon.png            # App-Icon (Main-Prozess)
├── src/
│   ├── main/                     # Electron-Main-Prozess
│   │   ├── index.ts              # Fenster, IPC-Handler
│   │   ├── api.ts                # Weiterleitung von API-Requests (CORS-Umgehung)
│   │   └── auth.ts               # Login / Registrierung gegen das Backend
│   ├── preload/
│   │   ├── index.ts              # contextBridge: window.electron
│   │   └── index.d.ts            # Typen für window.electron
│   ├── shared/                   # Typen, die Main, Preload und Renderer teilen
│   │   ├── api.ts                # ApiRequest / ApiResponse
│   │   ├── auth.ts               # AuthSession / AuthenticatedUser
│   │   └── guards.ts             # Gemeinsame Type Guards (isRecord)
│   └── renderer/
│       ├── index.html            # HTML-Einstieg inkl. CSP
│       └── src/
│           ├── main.tsx          # React-Einstieg
│           ├── App.tsx           # App (Login/Board) und Board-Komponente
│           ├── env.d.ts          # Typen für import.meta.env
│           ├── api/
│           │   ├── client.ts     # openapi-fetch-Client, Token-Handling
│           │   └── generated/schema.d.ts  # generiert, nicht von Hand ändern
│           ├── assets/
│           │   ├── base.css      # Basis-Reset
│           │   ├── main.css      # Design-Tokens und gesamtes App-Styling (eigene CSS-Klassen)
│           │   └── logo.svg
│           └── components/
│               ├── Login.tsx     # Anmelden / Registrieren (inkl. Passwort anzeigen)
│               └── PageEditor.tsx# Tiptap-Editor für Dokumentationsseiten
├── biome.json                    # Lint- und Format-Konfiguration
├── electron-builder.yml          # Packaging-Konfiguration
├── electron.vite.config.ts       # Build-Konfiguration (main, preload, renderer)
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
└── package.json / bun.lock
```

## Frontend (React / TypeScript / Tailwind)

- **Einstiegspunkt:** `src/renderer/src/main.tsx` rendert `App` aus `App.tsx` im StrictMode.
- **Routing:** keins. `App` zeigt `Login`, solange kein Benutzer angemeldet ist, sonst `Board`. Innerhalb des Boards wird über State umgeschaltet: ist `selectedPageId` gesetzt, erscheint der `PageEditor`, sonst das Kanban-Board.
- **State-Management:** nur lokaler React-State (`useState`) in `Board`. Kein globaler Store. Projekte, Tickets, Benutzer und Seiten werden beim Start über `loadBoard()` parallel geladen. Danach werden sie nach jeder Mutation lokal aktualisiert.
- **API-Zugriff:** ausschließlich über `api` aus `api/client.ts` (`openapi-fetch`, typisiert über `paths` aus `generated/schema.d.ts`). Datentypen werden aus `paths[...]` abgeleitet, zum Beispiel `Ticket`, `Project`, `Page`. Hilfsfunktionen: `requireApiData`, `throwOnApiError`, `apiErrorMessage`.
- **Auth im Renderer:** Access-Token und Ablaufzeit liegen nur im Speicher (`setAccessToken`/`clearAccessToken`). Der Bearer-Header wird per Middleware gesetzt. Bei 401 oder abgelaufenem Token ruft der Client `onUnauthorized` auf, und `App` meldet den Benutzer ab. Nach einem Neustart muss man sich neu anmelden.
- **Wichtige Komponenten:**
  - `Board` (in `App.tsx`): Sidebar mit Projekten und Seitenbaum, Kanban mit drei Spalten (`todo`, `in-progress`, `done`), Drag-and-drop, Suche, Dialoge für Tickets und Projekte.
  - `PageEditor`: Tiptap (StarterKit, Markdown, Placeholder), speichert Markdown. Autosave 800 ms nach der letzten Änderung, außerdem beim Verlassen des Editors und manuell. Gespeichert wird über eine Promise-Warteschlange.
- **Styling:** Tailwind v4 wird in `main.css` importiert, die App nutzt aber fast nur eigene semantische CSS-Klassen in `main.css` (ca. 2200 Zeilen). Utility-Klassen kommen im JSX praktisch nicht vor. Aufbau der Datei:
  1. **Design-Tokens** (`:root` am Dateianfang): Flächen (`--surface-*`), Rahmen (`--border-*`), Text (`--text-*`), Akzent (`--accent*`), Marke (`--brand-navy*`), Status (`--danger*`), Abstände (`--space-1` bis `--space-6` = 4 bis 32 px), Radien (`--radius-*`), Schatten (`--shadow-*`), Schriftgrößen (`--font-size-2xs` bis `--font-size-lg` = 10 bis 15 px), Dauer (`--duration-*`).
  2. Basisregeln, gemeinsame Bausteine (`.icon-button`, `.primary-button`, `.login-error`), Dialoge, Formulare und Seiteneditor. Diese Bereiche bestehen noch aus mehreren übereinanderliegenden Design-Durchgängen. Für einen Selektor gilt dort die letzte Definition.
  3. **Abschnitt „Board und Sidebar"**: Jeder Selektor ist genau einmal definiert. Er nutzt nur Tokens und die lokalen Variablen `--sidebar-width` und `--topbar-height` auf `.app-shell`. Die Media-Queries ändern nur diese Variablen und wenige Layoutwerte.
  4. **Abschnitt „Login"**: Jeder Selektor ist genau einmal definiert. `.login-error` wird auch im Board für Fehlermeldungen benutzt. Im Login wird sie deshalb nur über `.login-form .login-error` gestaltet.
- **Gemeinsame Klassen:** `.app-brand` (Sidebar und Login), `.primary-button` (Board, Dialoge, Login), `.login-error` (Board und Login). Bereichsspezifische Regeln für diese Klassen werden eingegrenzt, zum Beispiel über `.sidebar .app-brand`, `.login-brand` oder `.login-submit`.
- **Icons:** `lucide-react` (siehe `docs/decisions/0001-icons-lucide-react.md`). Icons werden als Komponente mit `size` und `aria-hidden="true"` eingebunden. Unicode-Zeichen als Icons kommen nur noch außerhalb von Board und Sidebar vor (Dialoge, Seiteneditor).

## Electron

- **Main-Prozess:** `src/main/index.ts`. Erstellt ein `BrowserWindow` (900x670, `sandbox: false`, `contextIsolation` und `nodeIntegration` auf Standard, also sicher). Externe Links werden im Browser geöffnet.
- **Preload / contextBridge-API:** `src/preload/index.ts` stellt `window.electron` bereit (Typ `SowaBoardAPI` in `index.d.ts`):
  - `electronAPI` aus `@electron-toolkit/preload`
  - `apiRequest(request)`
  - `auth.login(username, password)`, `auth.register(username, password)`
- **IPC-Kanäle** (alle Renderer zu Main per `invoke`/`handle`):

| Kanal | Zweck | Implementierung |
|---|---|---|
| `api:request` | Backend-Request weiterleiten. Erlaubt sind nur der Origin von `VITE_API_BASE_URL`, GET/POST/PATCH/DELETE und die Header `accept`, `authorization`, `content-type`. | `main/api.ts` – `forwardApiRequest` |
| `auth:login` | Anmeldung über `POST /auth/login` | `main/auth.ts` – `login` |
| `auth:register` | Registrierung über `POST /auth/register` (Passwort mindestens 8 Zeichen) | `main/auth.ts` – `register` |

- **Validierung im Main-Prozess:** handgeschrieben mit Typprüfungen und dem gemeinsamen `isRecord` aus `src/shared/guards.ts` (schließt Arrays aus), ohne Zod.

## Backend (Bun / Hono / Zod / OpenAPI / Swagger)

- **Nicht in diesem Repo.** Das Backend ist ein separates Projekt. Wo es liegt, ist noch nicht dokumentiert.
- **Basis-URL:** `VITE_API_BASE_URL`, Standard `http://localhost:3000`.
- **Vertrag:** `openapi/openapi.yaml` (OpenAPI 3.1, Auth per JWT-Bearer). Daraus generiert `bun run api:generate` die Datei `src/renderer/src/api/generated/schema.d.ts`. Die generierte Datei wird nicht von Hand geändert. Ändert sich das Backend, wird die Spec aktualisiert und neu generiert.
- **Datenbank / Persistenz:** PostgreSQL im Backend. Lokal speichert die App nichts.
- **Endpunkte:** siehe `docs/API.md`.

## Scripts (package.json)

| Script | Zweck |
|---|---|
| `dev` | electron-vite im Dev-Modus mit HMR |
| `start` | Gebauten Stand per `electron-vite preview` starten |
| `build` | Typecheck und `electron-vite build` |
| `build:unpack` / `build:win` / `build:mac` / `build:linux` | Packaging mit electron-builder |
| `typecheck` | `typecheck:node` und `typecheck:web` (intern per `npm run` verkettet) |
| `typecheck:node` / `typecheck:web` | `tsc --noEmit` für Main/Preload bzw. Renderer |
| `lint` / `lint:fix` | Biome Lint (`lint:fix` schreibt) |
| `format` | Biome Format (schreibt) |
| `check` | Biome Check (Lint, Format, Imports), nur lesend |
| `api:generate` | TypeScript-Typen aus `openapi/openapi.yaml` erzeugen |
| `test` | Platzhalter (`echo`), es gibt keine Tests |
| `postinstall` | Electron installieren und native Abhängigkeiten bauen |

## Konfiguration & Umgebungsvariablen

| Name | Zweck | Wo verwendet / validiert |
|---|---|---|
| `VITE_API_BASE_URL` | Basis-URL des Backends | `electron.vite.config.ts` (in den Main-Build injiziert), `main/api.ts`, `renderer/src/api/client.ts`. Keine Zod-Validierung, `main/api.ts` prüft den Origin. |
| `ELECTRON_RENDERER_URL` | Dev-Server-URL (von electron-vite gesetzt) | `main/index.ts` |

## Wichtige Konventionen im Projekt

- **Paketmanager Bun.** Die `package.json`-Scripts verketten intern aber noch `npm run`.
- **Formatierung (Biome):** 2 Leerzeichen, Zeilenbreite 100, einfache Anführungszeichen, keine Semikolons, keine Trailing Commas, Imports werden sortiert. `src/renderer/src/api/generated` ist ausgenommen.
- **Sprache:** UI-Texte und Fehlermeldungen auf Deutsch. Code-Bezeichner und OpenAPI-Beschreibungen auf Englisch.
- **Typen aus der API:** Typen werden aus `paths[...]` des generierten Schemas abgeleitet und nicht nachgebaut.
- **Komponenten:** Function Components mit Hooks, Default-Export pro Komponente, Props-Interface `<Name>Props`.
- **Typsicherheit:** Keine `as X`-Casts und keine `!`-Assertions. Unsichere Werte (Select-Werte, `relatedTarget`, DOM-Abfragen) werden per Type Guard oder Guard Clause geprüft, zum Beispiel `isTicketStatus`, `isTicketPriority` und `isOutside` in `App.tsx`. `as const` ist erlaubt.
- **Kommentare:** Nur für nicht offensichtliche Logik, auf Deutsch.
- **Fehlerbehandlung im Renderer:** `requireApiData` / `throwOnApiError` mit deutscher Fallback-Meldung. Die Meldung landet im State (`apiError`, `pageError`) und wird als `role="alert"` angezeigt.
- **IPC:** Kanalnamen nach dem Schema `<bereich>:<aktion>`. Eingaben aus dem Renderer kommen im Main-Prozess als `unknown` an und werden dort geprüft.
- **Ticket-Werte:** Status `todo` | `in-progress` | `done`, Priorität `Niedrig` | `Mittel` | `Hoch`. Standardwerte: `Mittel`, `todo`, Label `Allgemein`. IDs sind UUIDs. Auf den Ticketkarten werden die ersten 8 Zeichen angezeigt, die volle ID steht im Tooltip.
- **CSS:** Neue Regeln verwenden Design-Tokens statt fester Werte. Für Board und Sidebar wird der bestehende Abschnitt angepasst, statt weiter unten neue Überschreibungen anzuhängen.

## Bekannte Abweichungen und offene Punkte (Stand Erstanalyse)

Diese Punkte sind nur dokumentiert, nicht behoben.

- **Kein Hono/Zod/Swagger in diesem Repo.** Die Backend-Vorgaben in `CLAUDE.md` gelten für das externe Backend.
- **Tailwind ungenutzt:** Das Styling steckt in eigenem CSS (`main.css`). `CLAUDE.md` sieht dagegen Utility-Klassen vor.
- **Unicode-Symbole in UI-Texten** gibt es noch in den Dialogen (`App.tsx`, Schließen-Button) und in `PageEditor.tsx`. Sie widersprechen Abschnitt 6 von `CLAUDE.md`. Board, Sidebar und Login sind bereinigt.
- **Fehlermeldungen aus IPC:** Fehler aus `auth:login` und `auth:register` kommen im Renderer mit dem Electron-Präfix `Error invoking remote method 'auth:login': Error: ...` an, die Backend-Meldung zudem auf Englisch (zum Beispiel `Invalid username or password`). `apiErrorMessage` entfernt das Präfix nicht.
- **CSS-Altlasten außerhalb von Board und Login:** Dialoge, Formulare und Seiteneditor bestehen in `main.css` noch aus mehreren Design-Durchgängen, darunter Reste eines Dark-Themes. Beispiele: `.ticket-modal` hat die Schriftfarbe `#e1e4eb`. Der Button „Projekt löschen" ist blau statt rot, weil `.primary-button` nach `.danger-button` definiert ist.
- **Biome `check` schlägt fehl** (5 Fehler, 30 Warnungen). Ursachen:
  - Markdown-Formatierung (nicht aufgefüllte Tabellen) in `CLAUDE.md` und `docs/`
  - Formatierung des `background`-Werts der linken Login-Seite in `main.css`
  - `noDescendingSpecificity` in `main.css` außerhalb des Boards
  - a11y-Hinweise in den Dialogen von `App.tsx`
- **CI:**
  - `bun run test` ist nur ein `echo` und damit immer grün.
  - `bunx tsc --noEmit` auf die Root-`tsconfig.json` (`files: []`) prüft nichts. Besser wäre `bun run typecheck`.
  - Der Deploy von `out/renderer` auf GitHub Pages ist ohne Electron nicht lauffähig, weil `window.electron` fehlt.
- **Template-Reste:**
  - `README.md` beginnt mit dem electron-vite-Template-Text.
  - `appId: com.electron.app` und `setAppUserModelId('com.electron')` stammen aus der Vorlage.
  - `author` und die Publish-URL zeigen auf `example.com`.
- **Projekt löschen ist nicht atomar:** Der Renderer löscht erst alle Tickets einzeln und dann das Projekt. Bricht das mittendrin ab, bleibt ein Teilzustand zurück. Existieren noch Dokumentationsseiten, wird das Löschen blockiert.
- `BrowserWindow` läuft mit `sandbox: false`.
