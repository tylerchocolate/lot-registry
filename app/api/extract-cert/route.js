import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const { fileData, mediaType } = await request.json();
  const isPdf = mediaType === 'application/pdf';

  const block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: fileData } };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [block, { type: 'text', text:
          'Extract from this ICA phytosanitary certificate. Return ONLY valid JSON, no markdown:\n' +
          '{"certificate_number":"No. CFE-... exactly as printed","exporter":"company name","consignee":"company name",' +
          '"lot_code":"LOT code","container_code":"CONTAINER code","quantity_kg":"numeric string","bags":"numeric string",' +
          '"destination_country":"country","destination_port":"port","date_of_issue":"date as printed",' +
          '"place_of_issue":"city","authorized_officer":"full name","issuing_authority":"ICA or other","confidence":0}' +
          '\nIf a field is missing use null.'
        }]
      }]
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    return NextResponse.json({ error: err.error?.message || 'Claude API error' }, { status: resp.status });
  }

  const data = await resp.json();
  const raw  = (data.content.find(b => b.type === 'text')?.text || '{}')
    .replace(/```json|```/g, '').trim();

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: 'Failed to parse extraction response' }, { status: 500 });
  }
}
