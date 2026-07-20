const pool = require('../config/database');

class Report {
  static async getSalesSummary() {
    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(id) as total_orders,
        SUM(total_amount) as total_revenue
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
      LIMIT 30;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTopCustomers(startDate = null, endDate = null) {
    let dateFilter = '';
    const values = [];
    let paramCount = 1;

    if (startDate) {
      dateFilter += ` AND o.created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND o.created_at <= $${paramCount++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        c.id,
        c.dba as customer_name,
        c.account_id,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
      WHERE 1=1
      ${dateFilter}
      GROUP BY c.id, c.dba, c.account_id
      ORDER BY total_spent DESC NULLS LAST, c.dba
      LIMIT 10;
    `;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getInventoryStatus() {
    const query = `
      SELECT 
        i.description_name as item_name,
        COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(si.quantity) FROM salesperson_inventory si WHERE si.item_id = i.id), 0) as stock,
        inv.reorder_level
      FROM items i
      LEFT JOIN inventory inv ON i.id = inv.item_id
      WHERE (COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(si.quantity) FROM salesperson_inventory si WHERE si.item_id = i.id), 0)) <= COALESCE(inv.reorder_level, 10)
      ORDER BY stock ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getCombinedReport(customerName = null, itemId = null, startDate = null, endDate = null) {
    let ordersJoin = '';
    let ordersExtraWhere = '';
    let returnsExtraWhere = '';
    let paramCount = 1;

    const values = [];

    if (itemId) {
      ordersJoin = 'JOIN order_items oi ON o.id = oi.order_id';
      ordersExtraWhere = `AND oi.item_id = $${paramCount}`;
      returnsExtraWhere = `AND r.item_id = $${paramCount}`;
      values.push(parseInt(itemId));
      paramCount++;
    }

    let whereParts = [];

    if (customerName) {
      whereParts.push(`customer_name ILIKE $${paramCount} || '%'`);
      values.push(customerName);
      paramCount++;
    }

    if (startDate) {
      whereParts.push(`created_at >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereParts.push(`created_at <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : 'WHERE 1=1';

    const query = `
      WITH combined_data AS (
        SELECT 
          o.id as id,
          'order' as type,
          o.order_number as number,
          o.load_number,
          c.name as customer_name,
          u.name as user_name,
          o.total_credits,
          o.total_deposit,
          o.total_amount,
          o.status,
          o.created_at
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.user_id = u.id
        ${ordersJoin}
        WHERE 1=1
        ${ordersExtraWhere}
        
        UNION ALL
        
        SELECT 
          r.id as id,
          'return' as type,
          CAST(r.id as text) as number,
          null as load_number,
          c.name as customer_name,
          u.name as user_name,
          0 as total_credits,
          0 as total_deposit,
          -1 * (i.price * r.quantity) as total_amount,
          'returned' as status,
          r.created_at
        FROM returns r
        JOIN items i ON r.item_id = i.id
        JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE 1=1
        ${returnsExtraWhere}
      )
      SELECT DISTINCT * FROM combined_data
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Item Sale Report
  static async getItemSaleReport(startDate = null, endDate = null) {
    let dateFilter = '';
    const values = [];
    let paramCount = 1;

    if (startDate) {
      dateFilter += ` AND o.created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND o.created_at <= $${paramCount++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        i.id as item_id,
        i.item_number,
        i.description_name,
        i.cost as cost_price,
        i.price as average_sale_price,
        -- Current inventory (warehouse + salespersons)
        COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(si.quantity) FROM salesperson_inventory si WHERE si.item_id = i.id), 0) as current_inventory,
        -- Total sold quantity
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        -- Total revenue
        COALESCE(SUM(oi.subtotal), 0) as total_revenue,
        -- Total cost
        COALESCE(SUM(oi.quantity * i.cost), 0) as total_cost,
        -- Total profit
        COALESCE(SUM(oi.subtotal - (oi.quantity * i.cost)), 0) as total_profit
      FROM items i
      LEFT JOIN order_items oi ON i.id = oi.item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      LEFT JOIN inventory inv ON i.id = inv.item_id
      WHERE 1=1
      ${dateFilter}
      GROUP BY i.id, i.item_number, i.description_name, i.cost, i.price, inv.quantity
      ORDER BY total_sold DESC;
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Monthly Sales by Customer
  static async getMonthlySalesByCustomer(year = null) {
    const queryYear = year || new Date().getFullYear();
    const query = `
      SELECT 
        c.id as customer_id,
        c.name,
        c.dba,
        EXTRACT(MONTH FROM o.created_at) as month,
        EXTRACT(YEAR FROM o.created_at) as year,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_sales
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id 
        AND o.status != 'cancelled' 
        AND EXTRACT(YEAR FROM o.created_at) = $1
      GROUP BY c.id, c.name, c.dba, EXTRACT(MONTH FROM o.created_at), EXTRACT(YEAR FROM o.created_at)
      ORDER BY year DESC, month DESC, total_sales DESC;
    `;
    const result = await pool.query(query, [queryYear]);
    return result.rows;
  }

  // Monthly Sales by Salesperson
  static async getMonthlySalesBySalesperson(year = null) {
    const queryYear = year || new Date().getFullYear();
    const query = `
      SELECT 
        u.id as user_id,
        u.name as salesperson_name,
        EXTRACT(MONTH FROM o.created_at) as month,
        EXTRACT(YEAR FROM o.created_at) as year,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_sales
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id 
        AND o.status != 'cancelled' 
        AND EXTRACT(YEAR FROM o.created_at) = $1
      WHERE u.role = 'staff'
      GROUP BY u.id, u.name, EXTRACT(MONTH FROM o.created_at), EXTRACT(YEAR FROM o.created_at)
      ORDER BY year DESC, month DESC, total_sales DESC;
    `;
    const result = await pool.query(query, [queryYear]);
    return result.rows;
  }

  // Sales by Time Period
  static async getSalesByTimePeriod(startDate = null, endDate = null) {
    let dateFilter = '';
    const values = [];
    let paramCount = 1;

    if (startDate) {
      dateFilter += ` AND o.created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND o.created_at <= $${paramCount++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        o.id,
        o.order_number,
        c.name as customer_name,
        u.name as salesperson_name,
        o.total_amount,
        o.status,
        o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status != 'cancelled'
      ${dateFilter}
      ORDER BY o.created_at DESC;
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Top Selling Items
  static async getTopSellingItems(startDate = null, endDate = null, limit = 10) {
    let dateFilter = '';
    const values = [limit];
    let paramCount = 2;

    if (startDate) {
      dateFilter += ` AND o.created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND o.created_at <= $${paramCount++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        i.id,
        i.item_number,
        i.description_name,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) as total_revenue
      FROM items i
      LEFT JOIN order_items oi ON i.id = oi.item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      WHERE 1=1
      ${dateFilter}
      GROUP BY i.id, i.item_number, i.description_name
      ORDER BY total_quantity_sold DESC NULLS LAST, i.description_name
      LIMIT $1;
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Top Salespeople
  static async getTopSalespeople(startDate = null, endDate = null, limit = 10) {
    let dateFilter = '';
    const values = [limit];
    let paramCount = 2;

    if (startDate) {
      dateFilter += ` AND o.created_at >= $${paramCount++}`;
      values.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND o.created_at <= $${paramCount++}`;
      values.push(endDate);
    }

    const query = `
      SELECT 
        u.id,
        u.name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
      WHERE u.role = 'staff'
      ${dateFilter}
      GROUP BY u.id, u.name
      ORDER BY total_sales DESC NULLS LAST, u.name
      LIMIT $1;
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Report;
