const Report = require('../models/Report');

exports.getSalesSummary = async (_req, res) => {
  try {
    const summary = await Report.getSalesSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const top = await Report.getTopCustomers(startDate || null, endDate || null);
    res.json({ success: true, data: top });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getInventoryAlerts = async (_req, res) => {
  try {
    const alerts = await Report.getInventoryStatus();
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCombinedReport = async (req, res) => {
  try {
    const { customerName, itemId, startDate, endDate } = req.query;
    const data = await Report.getCombinedReport(
      customerName || null,
      itemId || null,
      startDate || null,
      endDate || null
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Item Sale Report
exports.getItemSaleReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await Report.getItemSaleReport(startDate || null, endDate || null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Monthly Sales by Customer
exports.getMonthlySalesByCustomer = async (req, res) => {
  try {
    const { year } = req.query;
    const data = await Report.getMonthlySalesByCustomer(year ? parseInt(year) : null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Monthly Sales by Salesperson
exports.getMonthlySalesBySalesperson = async (req, res) => {
  try {
    const { year } = req.query;
    const data = await Report.getMonthlySalesBySalesperson(year ? parseInt(year) : null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Sales by Time Period
exports.getSalesByTimePeriod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await Report.getSalesByTimePeriod(startDate || null, endDate || null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Top Selling Items
exports.getTopSellingItems = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const data = await Report.getTopSellingItems(
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Top Salespeople
exports.getTopSalespeople = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const data = await Report.getTopSalespeople(
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
