// SKUNK'D — generate-avatar Edge Function
// Generates a SKUNK'D-style caricature using Gemini Imagen.
// NOTE: Requires Gemini Imagen API access (paid tier).
// Stores result in Supabase Storage and updates user.avatar_url.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { description } = await req.json() as { description?: string };

    // Auth
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Imagen not configured' }), { status: 503 });
    }

    // Prompt: SKUNK'D cartoon style with user description
    const imagePrompt = `SKUNK'D card game avatar: ${description ?? 'a cribbage player'}.
    Cartoon style, bold lines, dark background with green neon glow.
    Exaggerated expression — competitive smugness or mock-disgust.
    Playing card motifs visible. High contrast, mobile app icon proportions.`;

    // Gemini Imagen 3 API call
    const imagenRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'BLOCK_ONLY_HIGH',
          },
        }),
      }
    );

    if (!imagenRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Image generation failed — Imagen API not available on this tier.' }),
        { status: 503 }
      );
    }

    const imagenData = await imagenRes.json();
    const b64Image: string = imagenData.predictions?.[0]?.bytesBase64Encoded;
    if (!b64Image) {
      return new Response(JSON.stringify({ error: 'No image generated' }), { status: 500 });
    }

    // Store in Supabase Storage
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const imageBytes = Uint8Array.from(atob(b64Image), c => c.charCodeAt(0));
    const filePath = `avatars/${user.id}.png`;

    const { error: uploadError } = await supabaseService.storage
      .from('avatars')
      .upload(filePath, imageBytes, { contentType: 'image/png', upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseService.storage.from('avatars').getPublicUrl(filePath);

    // Update user avatar_url
    await supabaseService.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);

    return new Response(JSON.stringify({ avatar_url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err) {
    console.error('generate-avatar error:', err);
    return new Response(JSON.stringify({ error: 'Avatar generation failed.' }), { status: 500 });
  }
});
