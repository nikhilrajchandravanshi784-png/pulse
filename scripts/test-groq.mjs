async function testRealImageBase64() {
  // Fetch a real small image
  const imgRes = await fetch("https://picsum.photos/200/200");
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const mimeType = "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const t0 = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe what you see. Return JSON with key "description".' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  console.log('Status:', res.status, 'Duration:', Date.now() - t0, 'ms');
  console.log('Result:', JSON.stringify(data, null, 2));
}

testRealImageBase64().catch(console.error);
