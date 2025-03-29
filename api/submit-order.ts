import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const PESAPAL_URL = 'https://pay.pesapal.com/v3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const { token, orderData } = req.body;

    if (!token || !orderData) {
      res.writeHead(400, corsHeaders).end(JSON.stringify({ error: 'Missing token or order data' }));
      return;
    }

    // First, register the IPN URL
    console.log('Registering IPN URL with PesaPal...');
    const ipnResponse = await axios.post(
      `${PESAPAL_URL}/api/URLSetup/RegisterIPN`,
      {
        url: orderData.callback_url,
        ipn_notification_type: "GET"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );

    console.log('IPN registration response:', ipnResponse.data);

    if (!ipnResponse.data.ipn_id) {
      throw new Error(`IPN registration failed: No ipn_id in response - ${JSON.stringify(ipnResponse.data)}`);
    }

    // Update the order data with the IPN ID
    const updatedOrderData = {
      ...orderData,
      notification_id: ipnResponse.data.ipn_id
    };

    console.log('Submitting order to PesaPal...', { updatedOrderData });
    const response = await axios.post(
      `${PESAPAL_URL}/api/Transactions/SubmitOrderRequest`,
      updatedOrderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );

    console.log('Order submission response:', response.data);
    res.writeHead(200, corsHeaders).end(JSON.stringify(response.data));
  } catch (error) {
    console.error('Error submitting order:', error);
    const errorMessage = error.response?.data || error.message;
    res.writeHead(500, corsHeaders).end(JSON.stringify({ error: `Failed to submit order: ${errorMessage}` }));
  }
}
