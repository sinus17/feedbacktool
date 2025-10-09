# Video Library Feature

## Übersicht

Das Video Library Modul ist eine kuratierte Sammlung von Social Media Videos (TikTok & Instagram), die als Inspiration für Artists dienen. Die Bibliothek bietet eine Netflix-artige Benutzeroberfläche mit automatisierter Video-Verarbeitung.

## Features

### Für Admin & Management
- **Video hinzufügen**: TikTok und Instagram URLs über "+ Add Video" Button
- **Automatische Verarbeitung**: Videos werden automatisch heruntergeladen, analysiert und kategorisiert
- **Kuratierung**: Videos können mit Metadaten, Beschreibungen und Empfehlungen versehen werden
- **Kategorisierung**: Genre, Kategorie, Tags
- **Featured Videos**: Hervorhebung besonders relevanter Videos
- **Veröffentlichung**: Kontrolle über Sichtbarkeit (Published/Unpublished)

### Für alle Nutzer
- **Netflix-artige Ansicht**: Übersichtliche Grid-Darstellung mit Thumbnails
- **Filterung**: Nach Genre, Platform, Featured Status
- **Suche**: Volltextsuche über Titel, Beschreibung, Account, Tags
- **Video Details**: Detailansicht mit:
  - Video Player
  - Statistiken (Views, Likes, Comments, Shares)
  - Content Beschreibung
  - "Why It Works" - Analyse
  - Artist Recommendations - Wie kann man das als Inspiration nutzen

## Technische Architektur

### Datenbank
- **video_library**: Haupttabelle für Videos
- **video_library_queue**: Verarbeitungs-Queue
- **library-videos**: Supabase Storage Bucket

### Edge Functions
1. **add-library-video**: 
   - Nimmt Video URL entgegen
   - Validiert URL
   - Fügt zur Queue hinzu
   - Triggert Verarbeitung

2. **process-library-video**:
   - Holt Video-Details via RapidAPI
   - Lädt Video herunter
   - Speichert in Supabase Storage
   - Extrahiert Metadaten
   - Speichert in Datenbank

### RapidAPI Integration
- **API**: TikTok API23 (tiktok-api23.p.rapidapi.com)
- **Key**: Konfiguriert in Edge Functions
- **Endpoints**:
  - `GET /api/post/detail` - Video Details
  - `GET /api/download/video` - Video Download

## Verwendung

### Video hinzufügen
1. Navigiere zu `/library`
2. Klicke auf "+ Add Video" (nur für Admin/Management)
3. Füge TikTok oder Instagram URL ein
4. Video wird automatisch verarbeitet

### Video kuratieren
1. Öffne Video in Detail-Ansicht
2. Klicke auf "Edit"
3. Füge hinzu:
   - Genre (z.B. "Music", "Comedy")
   - Category (z.B. "Tutorial", "Performance")
   - Tags
   - Content Description
   - Why It Works (Analyse)
   - Artist Recommendation (Empfehlung)
4. Setze Published/Featured Status
5. Speichern

### Video suchen
- Nutze Suchfeld für Freitext-Suche
- Filtere nach Genre
- Filtere nach Platform (TikTok/Instagram)
- Toggle "Featured" für nur hervorgehobene Videos
- Wechsle zwischen Grid und List View

## Berechtigungen

### Admin & Management
- Videos hinzufügen
- Videos bearbeiten
- Videos löschen
- Videos veröffentlichen/verstecken
- Videos als Featured markieren

### Andere Nutzer
- Nur veröffentlichte Videos anzeigen
- Videos durchsuchen und filtern
- Video Details ansehen

## Deployment

### Migration
```bash
supabase db push
```

### Edge Functions
```bash
supabase functions deploy add-library-video --no-verify-jwt
supabase functions deploy process-library-video --no-verify-jwt
```

## Zukünftige Erweiterungen

- [ ] Instagram Video Support (aktuell nur TikTok implementiert)
- [ ] Automatische Kategorisierung via AI
- [ ] Video-Playlists
- [ ] Favoriten-System
- [ ] Kommentare/Notizen zu Videos
- [ ] Export-Funktion für Inspiration Boards
- [ ] Analytics: Welche Videos werden am meisten angesehen

## Troubleshooting

### Video wird nicht verarbeitet
- Prüfe Queue Status in `video_library_queue` Tabelle
- Prüfe Edge Function Logs im Supabase Dashboard
- Stelle sicher, dass RapidAPI Key gültig ist

### Video kann nicht abgespielt werden
- Prüfe ob Video in Storage hochgeladen wurde
- Prüfe Storage Bucket Permissions
- Prüfe Browser Console für CORS Fehler

### Suche funktioniert nicht
- Stelle sicher, dass Videos `is_published = true` haben
- Prüfe ob Indizes erstellt wurden
- Prüfe RLS Policies
