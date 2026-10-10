# Geräteverwaltung für den Garten- und Landschaftsbau

Web-App für Geräte, Maschinen und Fahrzeuge: Wartungs- und Prüffristen, Lagerplätze, Kalender, Schadensmeldungen und QR-Etiketten als PDF. Läuft am Handy und am Rechner, lässt sich auf dem Handy als App installieren und funktioniert nach dem ersten Laden auch offline. Gestaltung und Logo angelehnt an boeger-galabau.de.

Reine statische Seite ohne Server und ohne Build-Schritt.

## Veröffentlichen mit GitHub Pages

1. Dieses Repository auf GitHub anlegen (Branch `main`).
2. **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen.
3. Beim nächsten Push (oder unter **Actions → GitHub Pages → Run workflow**) wird die App veröffentlicht, Adresse: `https://<benutzer>.github.io/<repository>/`.
4. Adresse auf dem Handy öffnen und „Zum Startbildschirm hinzufügen“ bzw. „App installieren“ wählen.

Hinweis: Bei privaten Repositories ist GitHub Pages nur mit bezahlten GitHub-Plänen verfügbar, und die Seite ist dann je nach Einstellung trotzdem für alle mit Link erreichbar. Die App enthält keine Zugangssperre. Wer die Adresse kennt, kann die App öffnen, sieht aber nur die Daten, die in seinem eigenen Browser liegen.

## Wie die Daten gespeichert werden

Alle Daten liegen **im Browser des jeweiligen Geräts** (IndexedDB). Es gibt keinen gemeinsamen Server.

- Zwischen Geräten gleichen Sie mit **Einstellungen → Sicherung und Abgleich** ab: Sicherung speichern (JSON), auf dem anderen Gerät „Sicherung einlesen“ (zusammenführen oder ersetzen).
- Browserdaten können verloren gehen (Website-Daten löschen, privater Modus, wenig Speicher). **Regelmäßig Sicherung speichern.**
- Soll später eine gemeinsame Datenbank dahinter, ist nur `local-db.js` zu ersetzen. `app.js` nutzt ausschließlich `collection().doc()`, `doc()`, `get`, `set`, `update`, `delete` und `onSnapshot`.

## QR-Etiketten

- Der QR-Code enthält `<Adresse der App>#<Inventarnummer>`, z. B. `https://…/#M-0001`. Die Handy-Kamera öffnet damit direkt das Gerät, **sofern dieses Handy die Daten hat** (siehe Abgleich oben).
- Die Adresse wird automatisch aus der aktuellen Seite genommen. Wer die App unter einer anderen Adresse betreibt, trägt sie unter Einstellungen ein. **Ändert sich die Adresse, müssen Etiketten neu gedruckt werden.**
- PDF-Formate: A4-Bögen 3×8 (70×37 mm) und 2×5 (105×57 mm), Rollenetiketten 62×29 mm (ein Etikett pro Seite).
- Scannen in der App: Foto eines QR-Codes aufnehmen/auswählen oder Inventarnummer eingeben.
- Erst eine Testseite drucken und mit dem Handy scannen, bevor ein ganzer Satz Etiketten gedruckt wird.

## Fristen und E-Mail

Die App verschickt **keine E-Mails**. Überfällige und bald fällige Fristen erscheinen als rote bzw. gelbe Hinweise. Unter Einstellungen steht ein fertiger Fristenbericht zum Kopieren oder zum Öffnen im Mail-Programm. Die Prüfintervalle in den Vorlagen sind Vorschläge; maßgeblich sind Herstellerangaben, UVV und DGUV.

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Seite, Gestaltung, Logo |
| `app.js` | Anwendung |
| `local-db.js` | lokale Datenhaltung, Export/Import |
| `seed.js` | Beispieldaten (Button „Beispieldaten laden“) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Modus und Installierbarkeit |
| `.github/workflows/pages.yml` | automatische Veröffentlichung |

Nach Änderungen an App-Dateien in `sw.js` die Zeile `VERSION` erhöhen, damit installierte Apps neu laden.

## Externe Bibliotheken

Per CDN geladen und nach dem ersten Besuch zwischengespeichert: `qrcode-generator` 1.4.4, `jsQR` 1.4.0, `jsPDF` 2.5.1 sowie die Schriften Ubuntu und Open Sans (Google Fonts). Ohne Internet beim allerersten Start fehlen QR-Anzeige, Foto-Scan und PDF-Erstellung. Wer die Dateien selbst ausliefern will, legt sie in das Repository und passt die `<script>`-Zeilen in `index.html` an.
