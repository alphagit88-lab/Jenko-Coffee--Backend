const Warehouse = require('../models/Warehouse');

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll();
    res.json({ success: true, data: warehouses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const warehouse = await Warehouse.create({ name, location });
    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const updated = await Warehouse.update(id, { name, location });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    await Warehouse.delete(id);
    res.json({ success: true, message: 'Warehouse deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
