# API-Übersicht

_Zuletzt aktualisiert: 2026-11-25 – Erstanalyse_

Das Backend ist ein separates Projekt und nicht Teil dieses Repos. Diese Übersicht beruht auf `openapi/openapi.yaml` (OpenAPI 3.1). Die Detaildoku liefert die Spec bzw. die Swagger-UI des Backends.

- **Basis-URL:** `VITE_API_BASE_URL`, Standard `http://localhost:3000`
- **Auth:** JWT als Bearer-Token (`BearerAuth`). Den Token gibt es über `/auth/login` oder `/auth/register`.
- **Typen im Renderer:** werden mit `bun run api:generate` nach `src/renderer/src/api/generated/schema.d.ts` generiert.
- **Aufruf aus der App:** Der Renderer nutzt `api` aus `src/renderer/src/api/client.ts`. Der Request geht über den IPC-Kanal `api:request` an den Main-Prozess, der ihn ans Backend weiterleitet. Login und Registrierung laufen direkt über die Kanäle `auth:login` und `auth:register`.

## Endpunkte

| Methode | Pfad | Zweck | Auth | In der App genutzt |
|---|---|---|---|---|
| GET | `/` | Backend-Status (Text) | nein | nein |
| GET | `/health/db` | Datenbankverbindung prüfen (200 / 503) | nein | nein |
| POST | `/auth/register` | Benutzer registrieren, liefert Token | nein | ja (`main/auth.ts`) |
| POST | `/auth/login` | Anmelden, liefert Token | nein | ja (`main/auth.ts`) |
| GET | `/auth/me` | Angemeldeten Benutzer abrufen | ja | nur als Typ |
| GET | `/users` | Benutzer auflisten | ja | ja (Vorschläge für Zuständige) |
| POST | `/users` | Benutzer anlegen | ja | nein |
| GET | `/users/{id}` | Benutzer abrufen | ja | nein |
| PATCH | `/users/{id}` | Benutzer ändern | ja | nein |
| DELETE | `/users/{id}` | Benutzer löschen | ja | nein |
| GET | `/projects` | Projekte auflisten | ja | ja (Board, KI) |
| POST | `/projects` | Projekt anlegen | ja | ja |
| GET | `/projects/{id}` | Projekt abrufen | ja | nein |
| PATCH | `/projects/{id}` | Projekt ändern (Umbenennen) | ja | ja |
| DELETE | `/projects/{id}` | Projekt löschen | ja | ja |
| GET | `/tickets` | Tickets auflisten | ja | ja (Board, KI) |
| POST | `/tickets` | Ticket anlegen | ja | ja (Board, KI) |
| GET | `/tickets/{id}` | Ticket abrufen | ja | ja (KI-Prüfung vor Update/Delete) |
| PATCH | `/tickets/{id}` | Ticket ändern | ja | ja (Board, KI) |
| DELETE | `/tickets/{id}` | Ticket löschen | ja | ja (Board, KI) |
| GET | `/pages` | Dokumentationsseiten auflisten | ja | ja |
| POST | `/pages` | Seite anlegen | ja | ja |
| GET | `/pages/{id}` | Seite abrufen | ja | nein |
| PATCH | `/pages/{id}` | Seite ändern (Titel, Inhalt) | ja | ja |
| DELETE | `/pages/{id}` | Seite löschen | ja | ja |
| GET | `/ticket-statuses` | Erlaubte Ticket-Status | ja | nein (Werte sind im Code fest) |
| GET | `/ticket-priorities` | Erlaubte Prioritäten | ja | nein (Werte sind im Code fest) |

## Wichtige Felder

- **Ticket:** `id` (UUID), `projectId` (UUID), `title`, `description`, `priority` (`Niedrig` / `Mittel` / `Hoch`), `assignee` (Benutzername), `status` (`todo` / `in-progress` / `done`), `label`
- **Project:** `id`, `name`, `color` (unter anderem `violet`, `orange`, `cyan`)
- **Page:** `id`, `projectId`, `title`, `content` (Markdown oder `null`), `icon` (oder `null`), `parentId` (für Unterseiten, oder `null`), `order`, `createdById`, `updatedById`
- **AuthSession:** `accessToken`, `tokenType: 'Bearer'`, `expiresIn` (Sekunden), `user { id, username }`
