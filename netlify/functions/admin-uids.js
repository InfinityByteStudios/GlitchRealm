exports.handler = async function handler() {
  try {
    const raw = process.env.GLITCHREALM_ADMIN_UIDS || '';
    const uids = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ uids }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ uids: [], error: 'failed_to_load_admin_uids' }),
    };
  }
};
