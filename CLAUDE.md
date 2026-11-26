# CLAUDE.md

Diese Datei legt fest, wie Claude in diesem Projekt arbeitet. Die Regeln hier sind **verbindlich** und gelten für jede Sitzung, jede Aufgabe und jede Änderung – egal wie klein sie ist.

---

## 1. Grundprinzipien

1. **Erst planen, dann fragen, dann handeln.** Claude ändert niemals Code, Konfiguration oder Dateien, ohne vorher einen Schritt-für-Schritt-Plan vorgelegt und eine ausdrückliche Freigabe erhalten zu haben.
2. **Jeder Schritt braucht eine eigene Freigabe.** Claude führt immer nur **einen** Schritt aus, erklärt ihn und fragt dann, ob er den nächsten Schritt machen darf. Mehrere Schritte am Stück sind verboten.
3. **Transparenz statt Blindflug.** Nach jedem Schritt erklärt Claude, was er gemacht hat und warum, damit Änderungen nicht ungeprüft akzeptiert werden.
4. **Kontext wird dokumentiert.** Claude pflegt den Ordner `/docs`, damit das Projektwissen über Sitzungen hinweg erhalten bleibt.
5. **Git gehört dem Entwickler.** Claude committet und pusht **niemals** selbst. Er liefert am Ende nur eine fertige Commit-Message.
6. **Bun statt npm.** Alle Paket- und Script-Befehle laufen über Bun.
7. **Keine Emojis.** Weder im Code noch in der Dokumentation, in Commit-Messages oder in Antworten (siehe Abschnitt 6).

---

## 2. Tech-Stack

Claude hält sich an diesen Stack und führt keine zusätzlichen Frameworks oder Libraries ein, ohne das vorher im Plan zu nennen und freigeben zu lassen.

### Frontend
| Technologie | Verwendung |
|---|---|
| **React** | UI-Komponenten (Function Components + Hooks, keine Class Components) |
| **TypeScript** | Strikte Typisierung (`strict: true`), kein `any` ohne Begründung |
| **Tailwind CSS** | Styling über Utility-Klassen, keine separaten CSS-Dateien ohne Grund |
| **Electron** | Desktop-Shell (Main-Prozess, Preload, Renderer) |

### Backend
| Technologie | Verwendung |
|---|---|
| **Bun** | Runtime, Paketmanager, Test-Runner, Scripts |
| **Hono** | HTTP-Framework / Routing |
| **Zod** | Validierung von Requests, Responses, Env-Variablen |
| **OpenAPI** | API-Spezifikation (aus Zod-Schemas generiert) |
| **Swagger** | API-Dokumentation / UI für die OpenAPI-Spec |

### Stack-Konventionen
- **Bun statt npm – ohne Ausnahme.** `npm`, `npx`, `yarn` und `pnpm` werden nie verwendet, weder in Befehlen noch in Scripts, Doku oder Anleitungen. Es gilt:

  | Statt | Verwende |
  |---|---|
  | `npm install` | `bun install` |
  | `npm install <paket>` | `bun add <paket>` |
  | `npm install -D <paket>` | `bun add -d <paket>` |
  | `npm uninstall <paket>` | `bun remove <paket>` |
  | `npm run <script>` | `bun run <script>` |
  | `npm test` | `bun test` |
  | `npx <tool>` | `bunx <tool>` |
  | `node <datei>` | `bun <datei>` |

  - Lockfile ist die Bun-Lockfile (`bun.lock` bzw. `bun.lockb`). Claude legt keine `package-lock.json`, `yarn.lock` oder `pnpm-lock.yaml` an. Findet er eine, weist er darauf hin, statt sie zu benutzen.
  - Schlägt eine Anleitung oder Library-Doku `npm`/`npx` vor, übersetzt Claude den Befehl in das Bun-Äquivalent.
  - Ausnahme nur, wenn ein Tool nachweislich nicht mit Bun funktioniert. Dann erklärt Claude das im Plan und fragt vorher.
- **Zod ist die einzige Quelle der Wahrheit** für Datenstrukturen an der API-Grenze. Typen werden per `z.infer<>` abgeleitet, nicht doppelt geschrieben.
- **OpenAPI-Spec wird aus den Zod-Schemas erzeugt** (z. B. über `@hono/zod-openapi`), nicht von Hand gepflegt. Neue oder geänderte Endpunkte müssen in der Spec und damit in Swagger sichtbar sein.
- **Electron-Sicherheit:** `contextIsolation: true`, `nodeIntegration: false`, Kommunikation zwischen Renderer und Main nur über eine definierte Preload-API (`contextBridge`) und typisierte IPC-Kanäle.
- **Keine Secrets im Code.** Konfiguration über Umgebungsvariablen, validiert mit Zod.

---

## 3. Arbeitsablauf (verpflichtend)

Jede Aufgabe – Feature, Änderung, Refactoring oder Bugfix – läuft in diesen Phasen ab:

```
1. Verstehen  →  2. Plan vorlegen  →  3. Freigabe für Schritt 1 abwarten  →
4. Schleife pro Schritt:  EINEN Schritt ausführen → erklären → Freigabe für nächsten Schritt abwarten
5. Dokumentieren (eigener Schritt, ebenfalls mit Freigabe)  →  6. Commit-Message liefern
```

### Phase 1 – Verstehen
- Claude liest die relevanten Dateien und die Dokumentation in `/docs` (vor allem `docs/PROJECT_STRUCTURE.md`).
- **Lesen ist ohne Freigabe erlaubt.** Schreiben, Löschen, Umbenennen, Installieren oder Ausführen von verändernden Befehlen nicht.
- Wenn die Aufgabe unklar ist, stellt Claude Rückfragen, **bevor** er einen Plan schreibt.

### Phase 2 – Plan vorlegen
Claude listet auf, was er Schritt für Schritt tun wird. Der Plan folgt immer diesem Format:

```markdown
## Plan: <kurzer Titel der Aufgabe>

**Ziel:** <Was am Ende erreicht sein soll>

**Betroffene Dateien:**
- `pfad/zur/datei.ts` – neu / geändert / gelöscht
- ...

**Schritte:**
1. <Schritt 1 – was genau gemacht wird und warum>
2. <Schritt 2 – ...>
3. ...
N. Dokumentation in `/docs` aktualisieren

**Neue Abhängigkeiten:** <keine / Paketname + Begründung>
**Risiken / Seiteneffekte:** <z. B. Breaking Change an API, Migration nötig>
**Offene Fragen:** <falls vorhanden>

Ist der Plan so in Ordnung? Darf ich mit Schritt 1 beginnen?
```

### Phase 3 – Freigabe abwarten
- Claude **stoppt** nach dem Plan und wartet auf eine Antwort.
- Als Freigabe gilt nur eine **eindeutige Zustimmung**, z. B. „go“, „ja“, „passt, mach“, „freigegeben“.
- Die Zustimmung zum Plan gibt **nur Schritt 1** frei – nicht den ganzen Plan. Jeder weitere Schritt braucht eine eigene Freigabe (siehe Phase 4).
- Rückfragen, Kommentare oder Änderungswünsche sind **keine** Freigabe. Claude überarbeitet dann den Plan bzw. den Schritt und fragt erneut.
- **Planänderungen während der Umsetzung:** Stellt Claude fest, dass vom Plan abgewichen werden muss (zusätzliche Datei, anderer Ansatz, neues Paket), hält er an, erklärt die Abweichung und holt eine **neue Freigabe** ein.

### Phase 4 – Schritt für Schritt umsetzen, jeder Schritt mit Absprache
**Grundregel: Ein Schritt – eine Freigabe.** Claude führt immer genau **einen** Schritt aus und hält danach an.

Ablauf pro Schritt:
1. Claude führt **nur den aktuell freigegebenen Schritt** aus.
2. Claude **stoppt** und erklärt, was er gemacht hat (Format unten).
3. Claude **fragt**, ob er den nächsten Schritt machen darf, und nennt dabei, was dieser Schritt konkret tun wird.
4. Claude **wartet** auf eine eindeutige Freigabe. Erst dann beginnt er mit dem nächsten Schritt.

Verboten:
- Mehrere Schritte in einer Antwort ausführen
- „Ich mache gleich noch Schritt 3 mit, weil der klein ist“
- Einen Schritt schon vorbereiten oder teilweise anfangen, bevor er freigegeben ist
- Eine frühere Freigabe als Freigabe für weitere Schritte werten
- Aussagen wie „mach einfach“ oder „passt“ als Freigabe für **alle** restlichen Schritte interpretieren

#### Beispiel für den korrekten Ablauf

```
Claude:     Plan: Ich werde folgende Schritte machen:
            1. Zod-Schema für Aufträge anlegen
            2. POST /orders in Hono registrieren
            3. Doku in /docs aktualisieren
            Darf ich mit Schritt 1 beginnen?

Entwickler: go

Claude:     [macht NUR Schritt 1]
            Schritt 1/3 abgeschlossen: Zod-Schema angelegt
            Was ich gemacht habe: ...
            Warum: ...
            Nächster Schritt (2/3): POST /orders in Hono registrieren
            Darf ich mit Schritt 2 weitermachen?

Entwickler: ja

Claude:     [macht NUR Schritt 2]
            Schritt 2/3 abgeschlossen: ...
            Darf ich mit Schritt 3 weitermachen?

Entwickler: ja

Claude:     [macht NUR Schritt 3]
            Schritt 3/3 abgeschlossen: ...
            [Abschluss-Zusammenfassung + Commit-Message]
```

Falsch wäre zum Beispiel: Nach dem „go“ für Schritt 1 direkt Schritt 1 und 2 machen, oder nach Schritt 2 ohne Rückfrage mit Schritt 3 weitermachen.

Nach **jedem** Schritt antwortet Claude in diesem Format:

```markdown
### Schritt X/N abgeschlossen: <Titel>

**Was ich gemacht habe:**
- <konkrete Änderung, z. B. „Zod-Schema `CreateOrderSchema` in `src/schemas/order.ts` angelegt“>

**Warum:**
- <Begründung / Bezug zum Ziel>

**Geänderte Dateien:**
- `pfad/datei.ts` (+12 / −3 Zeilen)

**Worauf du achten / was du prüfen solltest:**
- <z. B. „Feldname `customerId` statt `clientId` – bitte bestätigen, ob das zur DB passt“>

**Nächster Schritt (X+1/N):** <Titel>
- <was in diesem Schritt konkret gemacht wird>
- <welche Dateien betroffen sein werden>

Darf ich mit Schritt X+1 weitermachen?
```

Danach endet Claudes Antwort. Es folgt keine weitere Änderung, bis die Freigabe da ist.

Regeln dazu:
- Die Erklärung ist so konkret, dass sich die Änderung **ohne Diff-Lesen** nachvollziehen lässt.
- Claude benennt Annahmen, die er getroffen hat, ausdrücklich.
- Schlägt ein Schritt fehl (Typfehler, Test rot, Build kaputt), meldet Claude das sofort, erklärt die Ursache und schlägt eine Lösung vor, **statt still weiterzumachen**.
- Wenn der Entwickler nach einem Schritt Einwände hat, wird erst darauf eingegangen, bevor es weitergeht.

### Phase 5 – Dokumentieren
Die Dokumentation ist **immer der letzte Schritt** jeder Aufgabe (siehe Abschnitt 4). Sie ist ein eigener Schritt im Plan und braucht wie jeder andere Schritt eine eigene Freigabe.

### Phase 6 – Abschluss und Commit-Message
Wenn alle Schritte erfolgreich abgeschlossen sind, liefert Claude eine Zusammenfassung und eine Commit-Message (siehe Abschnitt 7).

---

## 4. Dokumentation in `/docs`

### 4.1 Grundregel
- Existiert noch kein Ordner `/docs` im Projekt-Root, legt Claude ihn an. Wie jede andere Änderung wird das vorher im Plan genannt und freigegeben.
- Die Dokumentation wird **am Ende jeder Aufgabe** aktualisiert, damit Claude in künftigen Sitzungen den Projektkontext hat.
- Zu Beginn jeder Sitzung liest Claude zuerst `/docs`, **bevor** er das Projekt erneut durchsucht.

### 4.2 Struktur

```
docs/
├── PROJECT_STRUCTURE.md   # Projektstruktur & Architektur-Überblick (einmalig erfasst, danach gepflegt)
├── CHANGELOG.md           # Chronologisches Protokoll aller Änderungen durch Claude
├── API.md                 # Überblick über Backend-Endpunkte (ergänzend zu Swagger)
├── decisions/             # Architekturentscheidungen (ADR), eine Datei pro Entscheidung
│   └── 0001-<titel>.md
└── features/              # Optional: eine Datei pro größerem Feature
    └── <feature-name>.md
```

### 4.3 Projektstruktur einmalig erfassen (`PROJECT_STRUCTURE.md`)
- Claude analysiert die **gesamte Projektstruktur genau einmal** gründlich – beim ersten Arbeiten im Projekt bzw. wenn `docs/PROJECT_STRUCTURE.md` noch nicht existiert.
- Das Ergebnis speichert er in `docs/PROJECT_STRUCTURE.md`.
- **Danach wird das Projekt nicht erneut komplett gescannt.** Claude nutzt diese Datei als Kontext und liest nur gezielt die Dateien, die er für die jeweilige Aufgabe braucht.
- **Jede strukturelle Änderung wird nachgetragen:** neue/gelöschte/verschobene Dateien oder Ordner, neue Module, neue Endpunkte, neue IPC-Kanäle, neue Abhängigkeiten, geänderte Scripts. So bleibt der Kontext aktuell.

Inhalt von `PROJECT_STRUCTURE.md`:

```markdown
# Projektstruktur

_Zuletzt aktualisiert: <YYYY-MM-DD> – <Anlass>_

## Überblick
<2–4 Sätze: Was ist das Projekt, wie hängen Frontend, Electron und Backend zusammen?>

## Verzeichnisbaum
<Baum der relevanten Ordner/Dateien, ohne node_modules, dist, build, .git>

## Frontend (React / TypeScript / Tailwind)
- Einstiegspunkt:
- Routing:
- State-Management:
- Wichtige Komponenten / Ordner:

## Electron
- Main-Prozess:
- Preload / contextBridge-API:
- IPC-Kanäle: <Name – Richtung – Zweck>

## Backend (Bun / Hono / Zod / OpenAPI / Swagger)
- Einstiegspunkt / Server-Start:
- Routen-Struktur:
- Zod-Schemas (Ort):
- OpenAPI-Spec / Swagger-UI (URL):
- Datenbank / Persistenz:

## Scripts (package.json)
| Script | Zweck |
|---|---|

## Konfiguration & Umgebungsvariablen
<Name – Zweck – wo validiert (ohne Werte!)>

## Wichtige Konventionen im Projekt
<Namensgebung, Ordnerlogik, Patterns, die Claude einhalten muss>
```

### 4.4 `CHANGELOG.md`
Nach jeder abgeschlossenen Aufgabe ergänzt Claude oben einen Eintrag:

```markdown
## <YYYY-MM-DD> – <Titel der Aufgabe>
**Typ:** feat / fix / refactor / docs / chore
**Zusammenfassung:** <1–3 Sätze>
**Geänderte Dateien:**
- `pfad/datei.ts` – <was>
**Hinweise:** <Breaking Changes, Migrationen, offene Punkte>
```

### 4.5 Weitere Doku
- **`API.md`**: Bei neuen oder geänderten Endpunkten wird ein kurzer Eintrag ergänzt (Methode, Pfad, Zweck, Schema-Name). Die Detaildoku bleibt Swagger.
- **`decisions/`**: Bei grundlegenden Entscheidungen (neue Library, Architekturwechsel, neues Pattern) legt Claude eine kurze ADR an: Kontext → Entscheidung → Alternativen → Konsequenzen.
- Doku wird **knapp und aktuell** gehalten. Veraltete Infos werden korrigiert, nicht nur ergänzt.

---

## 5. Code-Qualität

- Vor Abschluss einer Aufgabe prüft Claude, soweit im Projekt vorhanden:
  - Typecheck (z. B. `bun run typecheck` / `bunx tsc --noEmit`)
  - Lint (z. B. `bun run lint`)
  - Tests (`bun test`)
- Diese Prüfbefehle verändern keinen Code und dürfen im Rahmen eines freigegebenen Plans ausgeführt werden. Befehle mit Auto-Fix (`--fix`, Formatter mit Schreibzugriff) gelten als Änderung und müssen im Plan stehen.
- Claude hält sich an vorhandene Patterns und Namenskonventionen des Projekts, statt eigene einzuführen.
- Keine auskommentierten Code-Leichen, keine `console.log`-Reste, keine ungenutzten Imports.
- Fehler werden im Backend über Hono-Error-Handling mit sauberen HTTP-Statuscodes behandelt. Validierungsfehler kommen aus Zod und werden verständlich zurückgegeben.

---

## 6. Keine Emojis

Claude verwendet **nirgendwo** Emojis oder emoji-artige Symbole, die typisch nach KI-generiertem Inhalt aussehen. Das gilt ohne Ausnahme für:

- **Quellcode:** Kommentare, Strings, Log-Ausgaben, Fehlermeldungen, Variablen- und Funktionsnamen, UI-Texte
- **Dokumentation:** alle Dateien in `/docs`, README, Code-Kommentare, JSDoc/TSDoc
- **Commit-Messages:** Betreff und Body
- **API-Doku:** OpenAPI-Beschreibungen, Swagger-Texte, Zod-`.describe()`-Texte
- **Antworten im Chat:** Pläne, Schritt-Erklärungen, Zusammenfassungen

Verboten sind insbesondere:
- Emojis jeder Art (z. B. Häkchen, Raketen, Feuer, Daumen, Glühbirnen, Warnschilder, Flaggen)
- Dekorative Unicode-Symbole als Emoji-Ersatz (z. B. ✓ ✔ ✗ ★ ☆ ➜ ◆ ●)
- Gitmoji in Commit-Messages

Stattdessen:
- Status wird in **Worten** ausgedrückt: „erledigt“, „bestanden“, „fehlgeschlagen“, „offen“, „Hinweis:“, „Achtung:“
- Für Checklisten wird Markdown-Syntax verwendet: `- [ ]` / `- [x]`
- Hervorhebungen erfolgen über **Fettdruck**, Überschriften oder Listen, nicht über Symbole

Allgemein gilt: Texte sollen sachlich und so klingen, wie ein erfahrener Entwickler sie schreiben würde. Keine übertriebenen Formulierungen („Perfekt!“, „Großartig!“, „Fantastisch!“), keine Werbesprache.

---

## 7. Git-Regeln

### Verboten (ohne Ausnahme)
- `git commit`
- `git push`
- `git merge`, `git rebase`, `git reset --hard`, `git checkout -- .`, `git stash`
- Branches erstellen, löschen oder wechseln
- Tags setzen
- Git-Konfiguration oder Hooks verändern

### Erlaubt (nur lesend)
- `git status`, `git diff`, `git log`, `git show`, `git branch` (Anzeige)

### Commit-Message am Ende
Nach jeder **erfolgreich abgeschlossenen** Bearbeitung, Änderung oder jedem Fix, wenn **alle** geplanten Schritte inklusive Dokumentation erledigt sind, liefert Claude eine fertige Commit-Message, die der Entwickler selbst verwenden kann.

Format: **Conventional Commits**

```
<typ>(<scope>): <kurze Beschreibung im Imperativ, max. ~72 Zeichen>

- <Änderung 1>
- <Änderung 2>
- <Änderung 3>

Docs: <welche Doku-Dateien aktualisiert wurden>
```

Typen: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `chore`, `build`, `ci`
Scopes (Beispiele): `frontend`, `electron`, `backend`, `api`, `ui`, `schemas`, `docs`

Beispiel:

```
feat(api): Endpunkt zum Anlegen von Aufträgen hinzufügen

- Zod-Schema CreateOrderSchema in src/schemas/order.ts angelegt
- POST /orders mit @hono/zod-openapi registriert
- Endpunkt in Swagger-UI sichtbar

Docs: PROJECT_STRUCTURE.md, API.md, CHANGELOG.md
```

Claude gibt die Message in einem Codeblock aus, zusammen mit dem passenden Befehl zum Kopieren, **führt ihn aber nicht aus**:

```bash
git add <dateien>
git commit -m "<betreff>" -m "<body>"
```

---

## 8. Abschluss-Format

Am Ende jeder Aufgabe antwortet Claude in diesem Format:

```markdown
## Aufgabe abgeschlossen: <Titel>

**Zusammenfassung:** <2–4 Sätze, was jetzt anders ist>

**Alle Schritte:**
1. <Schritt 1> – erledigt
2. <Schritt 2> – erledigt
...

**Geprüft:** Typecheck: bestanden / Lint: bestanden / Tests: bestanden (oder: nicht vorhanden / nicht ausgeführt + Grund)

**Dokumentation aktualisiert:**
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md`

**Offene Punkte / Empfehlungen:** <falls vorhanden>

**Commit-Message:**
<Codeblock wie in Abschnitt 7>

Hinweis: Ich habe nichts committet oder gepusht. Das übernimmst du.
```

---

## 9. Kurzfassung (Checkliste für Claude)

Vor jeder Änderung:
- [ ] `/docs` gelesen (vor allem `PROJECT_STRUCTURE.md`)?
- [ ] Schritt-für-Schritt-Plan vorgelegt?
- [ ] Ausdrücklich gefragt: „Darf ich mit der Bearbeitung beginnen?“
- [ ] Eindeutiges Go für Schritt 1 erhalten?

Während der Umsetzung:
- [ ] Nur **einen** Schritt ausgeführt und danach angehalten?
- [ ] Nach dem Schritt erklärt, was, warum und was zu prüfen ist?
- [ ] Gefragt, ob der nächste Schritt gemacht werden darf, und auf das Go gewartet?
- [ ] Nur Bun-Befehle verwendet (kein `npm`, `npx`, `yarn`, `pnpm`)?
- [ ] Bei Abweichungen angehalten und neu gefragt?

Zum Abschluss:
- [ ] Typecheck / Lint / Tests geprüft?
- [ ] `/docs` aktualisiert (Struktur, Changelog, ggf. API/ADR)?
- [ ] Keine Emojis in Code, Doku, Commit-Message und Antwort?
- [ ] Commit-Message geliefert?
- [ ] **Nicht** selbst committet oder gepusht?

# TypeScript Backend & Unslop Guidelines

## Antwort- & Kommunikationsregeln (Unslop Mode)
- **Kein Fülltext & keine Floskeln:** Dringe direkt zum Kern vor. Verzichte komplett auf Einleitungen oder Abschlüsse wie „Hier ist der Code“, „Ich hoffe, das hilft“ oder „Lass mich wissen, falls du noch Fragen hast“.
- **Keine offensichtlichen Code-Kommentare:** Schreibe niemals selbsterklärende Kommentare (z. B. `// Importiere Abhängigkeiten`, `// Handler definieren`, `// Antwort zurückgeben`). Kommentiere ausschließlich komplexe Logik, Algorithmen oder unoffensichtliche Spezialfälle.
- **Keine unnötigen Zusammenfassungen:** Fasse deine Änderungen am Ende nicht noch einmal zusammen, es sei denn, es wurde ausdrücklich gefordert. Falls Erklärungen notwendig sind, nutze Stichpunkte.

## Code-Qualität & Technische Standards
- **Strikte Typsicherheit:** Vermeide `any` oder lose Type-Casts (`as X`). Nutze explizite Typen, Type Guards und Schema-Validierungen.
- **Fail Fast & Explizite Fehler:** Handle Fehlerfälle frühzeitig ab (Guard Clauses), um tief verschachtelte Logik zu vermeiden. Gib saubere Fehler-Statuscodes und -Meldungen zurück.
- **Saubere Architektur:** Halte Handler, Controller und Datenbankschicht getrennt und modular.
- **Kein unnötiger Boilerplate:** Schreibe präzisen, funktionalen und idiomatischen TypeScript-Code. Erstelle keine unnötigen Abstraktionen oder zusätzlichen Dateien für einfache Aufgaben.
