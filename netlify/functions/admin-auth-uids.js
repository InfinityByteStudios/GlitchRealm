exports.handler = async function handler() {
  try {
    const fallbackUids = [
      '6iZDTXC78aVwX22qrY43BOxDRLt1',
      'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
      'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
      '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
      'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
    ];

    const raw = process.env.GLITCHREALM_ADMIN_UIDS || '';
    const envUids = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...(envUids.length ? envUids : []), ...fallbackUids]));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ uids: merged }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ uids: [], error: 'failed_to_load_admin_auth_uids' }),
    };
  }
};
