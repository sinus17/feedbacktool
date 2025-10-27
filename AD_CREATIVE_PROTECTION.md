# Ad Creative Protection - Dokumentation

## Übersicht
Es wurden mehrere Schutzebenen implementiert, um sicherzustellen, dass **nur "song-specific" Videos** in den Ad Creative Tab verschoben werden können. Off-topic Videos sind vollständig ausgeschlossen.

## Implementierte Schutzmaßnahmen

### 1. Frontend-Validierung (UI-Ebene)
**Datei:** `/src/components/VideoList.tsx` (Zeile 360)

Der "Move to Ad Creatives" Button wird nur für Videos angezeigt, die:
- Status `ready` haben
- Type `song-specific` haben

```typescript
{submission.status === 'ready' && submission.type === 'song-specific' && (
  // Button wird nur hier angezeigt
)}
```

### 2. Application-Ebene Validierung
**Datei:** `/src/store.ts` (Zeile 1103-1106)

Die `handleMoveToAdCreatives` Funktion prüft explizit den Video-Typ:

```typescript
// Only allow song-specific videos to be moved to ad creatives
if (submission.type !== 'song-specific') {
  throw new Error('Only song-specific videos can be moved to Ad Creatives');
}
```

### 3. Automatische Erstellung bei Status-Änderung (ENTFERNT)
**Datei:** `/src/store.ts` (Zeile 493)

Die Application-Level automatische Erstellung wurde entfernt, da sie zu Duplikaten führte. 
Der Datenbank-Trigger (siehe Punkt 4) übernimmt diese Aufgabe zuverlässiger.

```typescript
// Nur noch Refresh, keine Erstellung mehr
if (updates.status === 'ready' && transformedSubmission.type === 'song-specific') {
  await get().fetchAdCreatives(); // Zeigt vom Trigger erstellte Ad Creatives an
}
```

### 4. Datenbank-Trigger (Automatische Erstellung)
**Datei:** PostgreSQL Trigger `auto_move_ready_to_ad_creatives`

Der Datenbank-Trigger wurde korrigiert, um nur song-specific Videos automatisch zu Ad Creatives zu verschieben:

```sql
IF NEW.status = 'ready' 
   AND (OLD.status IS NULL OR OLD.status != 'ready') 
   AND NEW.type = 'song-specific' THEN
  -- Insert into ad_creatives
END IF;
```

**Wichtig:** Der Trigger prüft jetzt explizit `NEW.type = 'song-specific'` bevor ein Ad Creative erstellt wird.

## Bereinigung
Am 27.10.2025 wurden **79 Off-Topic Ad Creatives** aus der Datenbank entfernt:
- 44 pending
- 25 archived
- 10 active

Die ursprünglichen Submissions (763 Off-Topic Videos) blieben unverändert erhalten.

## Zusammenfassung
Mit diesen drei Schutzebenen ist es unmöglich, Off-Topic Videos in den Ad Creative Tab zu verschieben:
1. ✅ UI zeigt Button nicht an für Off-Topic Videos
2. ✅ Application-Code wirft Fehler bei manuellem Verschieben
3. ✅ Datenbank-Trigger prüft Video-Typ und Existenz vor automatischer Erstellung

**Wichtige Änderung (27.10.2025):**
- Application-Level automatische Erstellung wurde entfernt
- Verhindert Duplikate beim Löschen aus Content Plan
- Datenbank-Trigger ist die einzige Quelle für automatische Ad Creative Erstellung

**Alle Ebenen wurden getestet und funktionieren korrekt.**

Datum: 27.10.2025
