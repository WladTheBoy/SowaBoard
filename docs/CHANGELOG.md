# Changelog

## 2026-11-26 – KI-Chat entfernt
**Typ:** chore
**Zusammenfassung:** Der Gemini-Chat ist vollständig ausgebaut: UI, IPC-Kanäle, Main-Prozess-Anbindung und CSS. Er soll später neu gebaut werden.
**Geänderte Dateien:**
- `src/renderer/src/App.tsx` – Einbindung von `AIChat` entfernt
- `src/main/index.ts` – Handler `ai:has-api-key`, `ai:save-api-key`, `ai:ask` entfernt
- `src/preload/index.ts`, `src/preload/index.d.ts` – `ai`-API entfernt
- `src/main/ai.ts`, `src/shared/ai.ts`, `src/renderer/src/components/AIChat.tsx`, `src/renderer/src/components/aiActions.ts` – gelöscht
- `src/renderer/src/assets/main.css` – Abschnitt KI-Chat entfernt (2756 auf 2204 Zeilen)
- `README.md` – Abschnitt KI-Chat entfernt
- `docs/PROJECT_STRUCTURE.md`, `docs/API.md` – KI-Chat und Gemini-API entfernt
**Hinweise:**
- Die KI-Dateien waren nie committet und sind nicht in der Git-Historie.
- Ein früher gespeicherter Schlüssel liegt weiter unter `userData/gemini-api-key.enc` und wird nicht mehr gelesen.

## 2026-11-26 – Code nach Unslop-Regeln bereinigt
**Typ:** refactor
**Zusammenfassung:** Template-Kommentare, toter Code, lose Casts, eine Non-null Assertion und doppelte Hilfsfunktionen entfernt. Das Verhalten bleibt gleich.
**Geänderte Dateien:**
- `src/main/index.ts` – Template-Kommentare entfernt
- `src/preload/index.ts` – Template-Kommentar und nie genutzten Zweig ohne Context Isolation entfernt
- `src/renderer/src/App.tsx` – `as`-Casts durch `isTicketStatus`, `isTicketPriority` und `isOutside` ersetzt
- `src/renderer/src/components/PageEditor.tsx` – `relatedTarget`-Cast durch `instanceof`-Prüfung ersetzt
- `src/renderer/src/main.tsx` – `!` durch Guard Clause ersetzt
- `src/shared/guards.ts` – neu, gemeinsames `isRecord`
- `src/main/api.ts`, `src/main/auth.ts`, `src/main/ai.ts` – lokale `isRecord`-Kopien entfernt
- `src/renderer/src/components/Versions.tsx` – gelöscht
**Hinweise:**
- `isRecord` schließt jetzt überall Arrays aus. Vorher galt das nur in `ai.ts`.
- Offen: Biome-Fehler aus Format und Import-Sortierung (automatisch behebbar), Zod für die IPC-Validierung, Aufteilung von `App.tsx`.

## 2026-11-25 – Login-Seite überarbeitet
**Typ:** style
**Zusammenfassung:**
- Die Login-Seite passt zum überarbeiteten Board: Tokens, Akzentfarbe, Fokusringe und lucide-Icons.
- Das Login-CSS steht in einem einzigen Abschnitt.
- Neu sind ein Button "Passwort anzeigen", ein Ladezustand im Anmelde-Button, eine Feature-Liste auf der linken Seite und ein verständlicherer Hinweistext.

**Geänderte Dateien:**
- `src/renderer/src/assets/main.css` – Abschnitt "Login" konsolidiert und überarbeitet, Tokens `--brand-navy*` und `--radius-xl`, Ausblenden des Markennamens unter 780 px auf die Sidebar beschränkt
- `src/renderer/src/components/Login.tsx` – Felder mit `label htmlFor` und Icon, Passwort-Toggle, Spinner, Fehler mit Icon, Feature-Liste, neuer Hinweistext
- `docs/PROJECT_STRUCTURE.md` – Aufbau von `main.css`, gemeinsame Klassen, offene Punkte

**Hinweise:**
- Behoben: grüner Moduswechsel-Link, hellblaue (kaum lesbare) Überschrift über dem Formular, fehlender Schriftzug "SowaBoard" unter 780 px Breite.
- Offen: Fehlermeldungen beim Login enthalten das Electron-IPC-Präfix und den englischen Backend-Text.

## 2026-11-25 – Design von Board und Sidebar verfeinert
**Typ:** style
**Zusammenfassung:**
- Board und Sidebar behalten den hellen Look mit blauem Akzent. Sie sind jetzt einheitlicher, besser lesbar und frei von Darstellungsfehlern.
- `main.css` hat zentrale Design-Tokens. Die Regeln für Board und Sidebar stehen in einem einzigen Abschnitt statt in vier übereinanderliegenden Durchgängen.
- Unicode-Icons sind durch lucide-react ersetzt.

**Geänderte Dateien:**
- `package.json`, `bun.lock` – neue Abhängigkeit `lucide-react`
- `src/renderer/src/assets/main.css` – Design-Tokens, Abschnitt „Board und Sidebar" konsolidiert und überarbeitet, ungenutzte Klassen entfernt (3772 auf 2715 Zeilen)
- `src/renderer/src/App.tsx` – lucide-Icons in Board und Sidebar, `type="button"` für Board-Buttons, gekürzte Ticket-ID mit Tooltip
- `docs/decisions/0001-icons-lucide-react.md` – neu
- `docs/PROJECT_STRUCTURE.md` – Aufbau von `main.css`, Icons, Konventionen, offene Punkte

**Hinweise:**
- Behobene Darstellungsfehler: dunkles, kaum lesbares Projekt-Kontextmenü; dunkle Trennlinien und Ränder aus einem alten Dark-Theme; unsichtbares Suchsymbol; hellblaue Icon-Hover.
- Dialoge, Login, Seiteneditor und KI-Chat sind unverändert. Der Button „Projekt löschen" ist weiterhin blau statt rot.

## 2026-11-25 – Projektdokumentation angelegt
**Typ:** docs
**Zusammenfassung:** Das Projekt wurde einmal vollständig analysiert und das Ergebnis in `/docs` festgehalten. Dabei wurde kein Code geändert.
**Geänderte Dateien:**
- `docs/PROJECT_STRUCTURE.md` – neu: Architektur, IPC-Kanäle, Scripts, Konventionen, bekannte Abweichungen
- `docs/API.md` – neu: Übersicht der Backend-Endpunkte aus `openapi/openapi.yaml`
- `docs/CHANGELOG.md` – neu
**Hinweise:** Bei der Analyse war Biome `check` fehlgeschlagen (14 Fehler, 69 Warnungen), der Typecheck bestanden. Wo das externe Backend liegt, ist noch nicht dokumentiert.
