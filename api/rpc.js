const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_dlpIN32jrLwm@ep-red-feather-b5i2m2vo-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(DATABASE_URL);

// Whitelist: nom de fonction -> ordre des paramètres nommés côté Postgres.
// Aucune autre fonction ne peut être appelée depuis le client.
const FUNCTIONS = {
  api_login: ['p_email', 'p_password'],
  api_create_receipt: ['p_payload', 'p_user_id'],
  api_create_sale: ['p_payload', 'p_user_id'],
  api_record_payment: ['p_payload', 'p_user_id'],
  api_create_expense: ['p_payload', 'p_user_id'],
  api_create_customer: ['p_payload'],
  api_create_product: ['p_payload'],
  api_update_stock_unit: ['p_id', 'p_payload', 'p_user_id'],
  api_dashboard: [],
  api_create_exchange: ['p_payload', 'p_user_id'],
  api_create_repair: ['p_payload', 'p_user_id'],
  api_update_repair: ['p_id', 'p_payload', 'p_user_id'],
  api_create_user: ['p_payload', 'p_actor_id'],
  api_update_user: ['p_id', 'p_payload', 'p_actor_id'],
  api_search: ['p_query'],
  api_reports: ['p_from', 'p_to'],
  api_margins: ['p_from', 'p_to'],
  api_list_receipts: [],
  api_get_receipt_detail: ['p_id'],
  api_receive_shipment: ['p_receipt_id', 'p_items_units', 'p_user_id'],
  api_list_products: [],
  api_list_stock: ['p_origin'],
  api_list_available_units: [],
  api_list_customers: ['p_q'],
  api_list_sales: [],
  api_list_debts: [],
  api_list_expenses: [],
  api_list_exchanges: [],
  api_list_repairs: [],
  api_list_users: [],
  api_find_unit_by_imei: ['p_imei'],
  api_get_invoice_data: ['p_sale_id'],
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { fn, args } = req.body || {};
  const paramNames = FUNCTIONS[fn];
  if (!paramNames) return res.status(400).json({ error: 'Fonction inconnue : ' + fn });

  try {
    const values = paramNames.map((p) => {
      const v = args ? args[p] : undefined;
      if (v === undefined || v === null) return null;
      return typeof v === 'object' ? JSON.stringify(v) : v;
    });
    const placeholders = paramNames.map((_, i) => `$${i + 1}`).join(',');
    const query = `SELECT ${fn}(${placeholders}) AS result`;
    const rows = await sql(query, values);
    res.status(200).json(rows[0] ? rows[0].result : null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
