# 0001 – Icons mit lucide-react

_Datum: 2026-11-25 – Status: angenommen_

## Kontext

Die UI hat Unicode-Zeichen als Icons verwendet, zum Beispiel für Bearbeiten, Löschen, Abmelden, Suche, Priorität und das Board. Diese Zeichen sehen je nach Schrift und Betriebssystem unterschiedlich aus und lassen sich kaum einheitlich ausrichten. Außerdem verbietet `CLAUDE.md`, Abschnitt 6, dekorative Unicode-Symbole.

## Entscheidung

Icons kommen aus `lucide-react`. Die Icons werden als React-Komponenten importiert, mit expliziter `size` (12 bis 16 px) und `aria-hidden="true"`. Die Bedeutung trägt das umgebende Element, zum Beispiel über Text, `aria-label` oder `title`.

## Alternativen

- **Eigene Inline-SVGs:** Es gäbe keine neue Abhängigkeit. Dafür müssten Pfade, Strichstärken und Größen selbst gepflegt werden, und das Icon-Set wäre bei Erweiterungen uneinheitlich.
- **Unicode beibehalten:** Kein Aufwand, aber die beschriebenen Darstellungsprobleme und der Widerspruch zu `CLAUDE.md` blieben bestehen.

## Konsequenzen

- Neue Abhängigkeit `lucide-react` (1.80). Durch Tree-Shaking landen nur die importierten Icons im Bundle.
- Icons erben die Textfarbe über `currentColor` und lassen sich per CSS über `svg`-Selektoren einfärben.
- Bisher sind nur Board und Sidebar umgestellt. Dialoge, Seiteneditor und KI-Chat verwenden noch Unicode-Zeichen und sollten bei ihrer Überarbeitung ebenfalls lucide-Icons bekommen.
