exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.SUPPORT_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: 'Server misconfiguration: missing SUPPORT_API_KEY' };
  }

  const body = event.body || '{}';

  try {
    const resp = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body
    });

    const text = await resp.text();
    const headers = {};
    const contentType = resp.headers.get && resp.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    return { statusCode: resp.status, headers, body: text };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
