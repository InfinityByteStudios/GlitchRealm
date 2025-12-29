// Netlify serverless function to handle SendFox newsletter subscriptions
// This keeps the API token secure on the backend

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get email from request body
  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  // Validate email
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid email address is required' })
    };
  }

  // Get SendFox API token from environment variable
  const SENDFOX_TOKEN = process.env.SENDFOX_API_TOKEN;
  
  if (!SENDFOX_TOKEN) {
    console.error('SENDFOX_API_TOKEN environment variable not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    // Subscribe to SendFox
    const response = await fetch('https://api.sendfox.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDFOX_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        // Optional: Add list IDs if you have specific lists
        // lists: [YOUR_LIST_ID]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SendFox API error:', data);
      
      // Handle duplicate email (already subscribed)
      if (response.status === 422 && data.message?.includes('already exists')) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            success: true, 
            message: 'You are already subscribed!' 
          })
        };
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.message || 'Subscription failed' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed! Check your email to confirm.' 
      })
    };

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process subscription' })
    };
  }
};
