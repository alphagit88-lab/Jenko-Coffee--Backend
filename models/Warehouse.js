const pool = require('../config/database');

class Warehouse {
  static async create({ name, location }) {
    const query = `
      INSERT INTO warehouses (name, location, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [name, location]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `SELECT * FROM warehouses ORDER BY name ASC`;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `SELECT * FROM warehouses WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, { name, location }) {
    const query = `
      UPDATE warehouses 
      SET name = $1, location = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, location, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM warehouses WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Warehouse;
