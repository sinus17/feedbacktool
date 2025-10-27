-- Insert German Release Sheet Template (DE)
-- This template contains all required fields for German artists

DO $$
DECLARE
    template_content jsonb;
BEGIN
    template_content := jsonb_build_object(
        'blocks', jsonb_build_array(
            jsonb_build_object(
                'id', 'main-content',
                'type', 'paragraph',
                'content', '<h1 style="text-align: center;">Release Sheet</h1><br><br><p><strong>🎵 Songname:</strong></p><br><br><p><strong>📆 Release Date:</strong></p><br><br><p><strong>💿 Artist-Genre:</strong></p><br><br><p><strong>💿 Song-Genre:</strong></p><br><br><p><strong>📁 Master:</strong> (wave oder mp3 file mit Player)</p><br><br><p><strong>📀 Snippet:</strong> (wave oder mp3 file mit Player)</p><br><br><p><strong>📱 TikTok:</strong> (TikTok Profil URL)</p><br><br><p><strong>📸 Instagram:</strong> (Instagram Profil URL)</p><br><br><p><strong>🎶 Spotify:</strong> (Spotify Profil URL)</p><br><br><hr><br><h2>🧠 Short Q&A</h2><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Wie lange machst Du schon Musik, was war dein bisher größter Erfolg?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Wie hast du bisher Social Media Content (TikTok / IG Reels) produziert (alleine oder mit der Hilfe von jemand anderem)?</strong></p><p><strong>Mit welcher Videoschnitt-Software bist du vertraut?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Hast du neben der Musik ein besonderes Talent, ein außergewöhnliches Interesse oder gibt es Thematiken die für dich oder dein Branding besonders wichtig sind?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Gibt es Tabuthemen, die du vermeiden möchtest, oder Dinge, die du auf gar keinen Fall machen möchtest?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><hr><br><h2>⭐️ Deine 5 Favoriten</h2><br><br><p>Bitte trage hier die Links deiner 5 Favoriten aus der Video Library ein, die Du selbst ansprechend findest &amp; für dich adaptieren möchtest. Um den Direkt-Link zu kopieren, klicke einfach auf das Share Symbol:</p><br><br><p><strong>1:</strong> https://tool.swipeup-marketing.com/library?tab=feed&amp;public=true&amp;video=894236d6-71cb-4179-b452-b8ad024d2dee<br><em>Ausraub-Sketch, eigener Song läuft im Hintergrund</em></p><br><br><p><strong>2:</strong> https://tool.swipeup-marketing.com/library?tab=feed&amp;public=true&amp;video=5a2ebb62-8fc8-4fe4-9adb-fbf85bcef9cd<br><em>Sprachnachricht als Hook verwenden</em></p><br><br><p><strong>3:</strong></p><br><br><p><strong>4:</strong></p><br><br><p><strong>5:</strong></p><br><br><hr><br><h2>💬 Meta Ebene des Songs</h2><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Wann hast du den Song geschrieben? Und in welcher Situation kam dir die erste Idee dazu?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Was ist das Thema und die Kernaussage deines Songs? (min. 3 bis 5 Sätze)</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>💡 Wer soll mit deinem Song angesprochen werden? Wer ist die Zielgruppe?</strong></p><p><em>Deine Antwort hier...</em></p></div><br><br><hr><br><h2>✍🏼 Song Lyrics</h2><br><br><details><summary><strong>Lyrics anzeigen/verbergen</strong></summary><br><p><em>Füge hier deine Song Lyrics ein...</em></p><br></details><br><br><hr><br><h2>💡 Content Ideen</h2><br><br><p>Du kannst hier deine eigenen Ideen, die du schon hast aufschreiben. Wir ergänzen die Ideen vor dem Content Call noch und besprechen diese.</p><br><br><p><em>Deine Content Ideen hier...</em></p><br><br><hr><br><h2>ℹ️ Nützliche Infos</h2><br><br><h3>👨🏻‍🏫 Content-Feedback</h3><br><br><p>Die Videos können ausschließlich per Direktupload in das Tool hochgeladen werden.</p><br><br><p><strong>Hinweis zur Upload-Qualität / Dateigrößen:</strong> NIEMAND braucht 4K, 10bit, ProRes HQ &amp; solchen Quatsch! ;) Für Social Media reicht 1080p Full HD vollkommen aus. Die Videos dürfen maximal 150 MB groß sein.</p><br><br><p><strong>Neue Videos:</strong> Neue Videos reichst du über „New Submission" ein und wir geben dir i.d.R. bis zum Ende des nächsten Werktages Feedback zu den Videos.</p><br><br><p><strong>Überarbeitete Videos:</strong> Korrigierte Videos lädst du hoch indem du auf die Sprechblase des entsprechenden Videos klickst. Dort fügst du dann das neue Video ein (per Direktupload) und klickst auf „Update".</p><br><br><hr><br><h2>🗓 Content-Plan</h2><br><br><ul><li>übersichtliche Darstellung deines Postingplans</li><li>alle Videos mit dem Status "ready" können dem Contentplan zugeordnet werden</li><li>im Reiter Agenda kannst du deine Videos kompressionsfrei runterladen</li></ul><br><br><hr><br><h2>🔗 Nützliche Links</h2><br><br><p><strong>📑 Content Slides</strong> 👉🏼 <a href="https://docs.google.com/presentation/d/18OqGsZ82aj3liHNNAgmRIvVoAkHGIce1qYLdbFWCi1M/edit?usp=sharing" target="_blank">Google Slides</a></p><br><br><p><strong>🔒 Safezone Vorlage</strong> 👉🏼 <a href="https://www.dropbox.com/s/qljah3raql75zjn/TikTok-Safe-Zones.png?e=1&amp;dl=0" target="_blank">Dropbox Link</a></p><br><br><p><strong>📂 Winning Creatives Folder</strong> 👉🏼 <a href="https://www.dropbox.com/scl/fo/frwp1gv0uvae4y8u7fhhl/AAq51OLH5KpRx8tYzOFPMII?rlkey=nkjsrhhcqhxw2uka68ovu3e85&amp;dl=0" target="_blank">Dropbox Link</a></p><br><br><p><strong>💡 Inspirations Folder</strong> 👉🏼 <a href="https://www.dropbox.com/scl/fo/obf37o7o0ygezcxyzgcf6/AIRA3n_wh6PErlyIdnXc-h8?rlkey=xp71ewpcfj64gyzpx3nmh8r8q&amp;st=m8t403kt&amp;dl=0" target="_blank">Dropbox Link</a></p>'
            )
        )
    );

    INSERT INTO public.release_sheet_templates (
        name,
        description,
        language,
        content,
        is_active,
        is_public
    ) VALUES (
        'Release Sheet Template (DE)',
        'Deutsches Release Sheet Template mit allen wichtigen Feldern für Künstler',
        'de',
        template_content,
        true,
        true
    ) ON CONFLICT DO NOTHING;
END $$;
