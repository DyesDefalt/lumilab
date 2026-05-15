import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getBusinessData() {
  const productsPath = join(__dirname, '..', 'mock-data', 'commerce_products.json');
  const ordersPath = join(__dirname, '..', 'mock-data', 'commerce_orders.json');
  const [productsRaw, ordersRaw] = await Promise.all([
    readFile(productsPath, 'utf-8'),
    readFile(ordersPath, 'utf-8'),
  ]);
  const products = JSON.parse(productsRaw);
  const orders = JSON.parse(ordersRaw);

  return {
    source: 'mock',
    connector: 'business_commerce',
    status: 'mock_active',
    label: 'MOCK BUSINESS/COMMERCE DATA',
    data: {
      products,
      orders,
      highValuePages: products.high_value_pages || [],
    },
  };
}

export default { getBusinessData };
