const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const StockMovement = require('./models/StockMovement');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      Supplier.deleteMany(),
      Product.deleteMany(),
      Sale.deleteMany(),
      StockMovement.deleteMany(),
    ]);
    console.log('Cleared existing data');

    // Create users
    const adminPassword = await bcrypt.hash('admin123', 12);
    const managerPassword = await bcrypt.hash('manager123', 12);

    const [admin, manager] = await User.insertMany([
      { name: 'Admin User', email: 'admin@stocksense.io', password: adminPassword, role: 'admin' },
      { name: 'Inventory Manager', email: 'manager@stocksense.io', password: managerPassword, role: 'manager' },
      { name: 'Viewer', email: 'viewer@stocksense.io', password: await bcrypt.hash('viewer123', 12), role: 'viewer' },
    ]);
    console.log('Users seeded');

    // Create suppliers
    const suppliers = await Supplier.insertMany([
      {
        name: 'TechCore Components Pvt. Ltd.',
        contactPerson: 'Rajesh Kumar',
        email: 'rajesh@techcore.in',
        phone: '+91-9876543210',
        address: { street: '14 Electronics Colony', city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560001' },
        category: 'Electronics',
        rating: 4,
        isActive: true,
      },
      {
        name: 'OfficeHub Supplies',
        contactPerson: 'Priya Sharma',
        email: 'priya@officehub.in',
        phone: '+91-9812345678',
        address: { street: '22 Business Park', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400001' },
        category: 'Stationery',
        rating: 5,
        isActive: true,
      },
      {
        name: 'QuickFurn Industries',
        contactPerson: 'Arjun Nair',
        email: 'arjun@quickfurn.co.in',
        phone: '+91-9845678901',
        address: { street: '7 Industrial Area', city: 'Pune', state: 'Maharashtra', country: 'India', postalCode: '411001' },
        category: 'Furniture',
        rating: 3,
        isActive: true,
      },
      {
        name: 'SafeGuard Safety Co.',
        contactPerson: 'Meena Pillai',
        email: 'meena@safeguard.in',
        phone: '+91-9988776655',
        address: { street: '3 Safety Nagar', city: 'Chennai', state: 'Tamil Nadu', country: 'India', postalCode: '600001' },
        category: 'Safety Equipment',
        rating: 4,
        isActive: true,
      },
      {
        name: 'CleanMax Facility Solutions',
        contactPerson: 'Vijay Reddy',
        email: 'vijay@cleanmax.in',
        phone: '+91-9900112233',
        address: { street: '11 Service Road', city: 'Hyderabad', state: 'Telangana', country: 'India', postalCode: '500001' },
        category: 'Cleaning Supplies',
        rating: 4,
        isActive: true,
      },
    ]);
    console.log('Suppliers seeded');

    // Create products
    const products = await Product.insertMany([
      // Electronics
      { name: 'Dell UltraSharp 27" Monitor', sku: 'ELEC-MON-001', category: 'Electronics', unit: 'piece', costPrice: 22000, sellingPrice: 28000, quantity: 45, lowStockThreshold: 5, supplier: suppliers[0]._id, description: '4K IPS display with USB-C connectivity', location: 'Shelf A1' },
      { name: 'Logitech MX Master 3 Mouse', sku: 'ELEC-MOU-002', category: 'Electronics', unit: 'piece', costPrice: 3500, sellingPrice: 5500, quantity: 120, lowStockThreshold: 20, supplier: suppliers[0]._id, location: 'Shelf A2' },
      { name: 'Mechanical Keyboard 80%', sku: 'ELEC-KEY-003', category: 'Electronics', unit: 'piece', costPrice: 4200, sellingPrice: 6800, quantity: 8, lowStockThreshold: 10, supplier: suppliers[0]._id, location: 'Shelf A3' },
      { name: 'USB-C Hub 7-in-1', sku: 'ELEC-HUB-004', category: 'Electronics', unit: 'piece', costPrice: 1800, sellingPrice: 3200, quantity: 65, lowStockThreshold: 15, supplier: suppliers[0]._id, location: 'Shelf A4' },
      { name: 'Noise-Cancelling Headphones', sku: 'ELEC-HEAD-005', category: 'Electronics', unit: 'piece', costPrice: 8500, sellingPrice: 14500, quantity: 30, lowStockThreshold: 5, supplier: suppliers[0]._id, location: 'Shelf A5' },
      { name: 'Webcam 4K Pro', sku: 'ELEC-CAM-006', category: 'Electronics', unit: 'piece', costPrice: 5500, sellingPrice: 9200, quantity: 22, lowStockThreshold: 8, supplier: suppliers[0]._id, location: 'Shelf A6' },

      // Stationery
      { name: 'A4 Premium Bond Paper (500 sheets)', sku: 'STAT-PAP-001', category: 'Stationery', unit: 'pack', costPrice: 280, sellingPrice: 420, quantity: 350, lowStockThreshold: 50, supplier: suppliers[1]._id, location: 'Shelf B1' },
      { name: 'Pilot G2 Pens (Box of 12)', sku: 'STAT-PEN-002', category: 'Stationery', unit: 'box', costPrice: 160, sellingPrice: 260, quantity: 200, lowStockThreshold: 30, supplier: suppliers[1]._id, location: 'Shelf B2' },
      { name: 'Whiteboard Marker Set', sku: 'STAT-MRK-003', category: 'Stationery', unit: 'pack', costPrice: 220, sellingPrice: 380, quantity: 90, lowStockThreshold: 15, supplier: suppliers[1]._id, location: 'Shelf B3' },
      { name: 'Sticky Notes 3"x3" (6-pack)', sku: 'STAT-STK-004', category: 'Stationery', unit: 'pack', costPrice: 120, sellingPrice: 200, quantity: 5, lowStockThreshold: 20, supplier: suppliers[1]._id, location: 'Shelf B4' },
      { name: 'File Folders A4 (Pack of 50)', sku: 'STAT-FLD-005', category: 'Stationery', unit: 'pack', costPrice: 350, sellingPrice: 550, quantity: 80, lowStockThreshold: 10, supplier: suppliers[1]._id, location: 'Shelf B5' },

      // Furniture
      { name: 'Ergonomic Office Chair', sku: 'FURN-CHR-001', category: 'Furniture', unit: 'piece', costPrice: 12000, sellingPrice: 18500, quantity: 15, lowStockThreshold: 3, supplier: suppliers[2]._id, location: 'Warehouse C1' },
      { name: 'Height-Adjustable Standing Desk', sku: 'FURN-DSK-002', category: 'Furniture', unit: 'piece', costPrice: 18000, sellingPrice: 27000, quantity: 10, lowStockThreshold: 2, supplier: suppliers[2]._id, location: 'Warehouse C2' },
      { name: 'Mobile Pedestal Cabinet', sku: 'FURN-CAB-003', category: 'Furniture', unit: 'piece', costPrice: 5500, sellingPrice: 8800, quantity: 3, lowStockThreshold: 5, supplier: suppliers[2]._id, location: 'Warehouse C3' },
      { name: 'Modular Bookshelf 5-Tier', sku: 'FURN-BSH-004', category: 'Furniture', unit: 'piece', costPrice: 6200, sellingPrice: 9500, quantity: 12, lowStockThreshold: 2, supplier: suppliers[2]._id, location: 'Warehouse C4' },

      // Safety Equipment
      { name: 'Fire Extinguisher CO2 5kg', sku: 'SAFE-EXT-001', category: 'Safety Equipment', unit: 'piece', costPrice: 2200, sellingPrice: 3500, quantity: 25, lowStockThreshold: 5, supplier: suppliers[3]._id, location: 'Safety Store D1' },
      { name: 'First Aid Kit Standard', sku: 'SAFE-FAK-002', category: 'Safety Equipment', unit: 'piece', costPrice: 650, sellingPrice: 1100, quantity: 40, lowStockThreshold: 8, supplier: suppliers[3]._id, location: 'Safety Store D2' },
      { name: 'Safety Helmet (Pack of 5)', sku: 'SAFE-HLM-003', category: 'Safety Equipment', unit: 'pack', costPrice: 1800, sellingPrice: 2800, quantity: 4, lowStockThreshold: 5, supplier: suppliers[3]._id, location: 'Safety Store D3' },

      // Cleaning Supplies
      { name: 'Industrial Floor Cleaner 5L', sku: 'CLEN-CLN-001', category: 'Cleaning Supplies', unit: 'liter', costPrice: 320, sellingPrice: 520, quantity: 80, lowStockThreshold: 20, supplier: suppliers[4]._id, location: 'Shelf E1' },
      { name: 'Microfiber Cleaning Cloths (20-pack)', sku: 'CLEN-CLT-002', category: 'Cleaning Supplies', unit: 'pack', costPrice: 280, sellingPrice: 450, quantity: 60, lowStockThreshold: 10, supplier: suppliers[4]._id, location: 'Shelf E2' },
      { name: 'Eco Hand Sanitizer 500ml', sku: 'CLEN-SAN-003', category: 'Cleaning Supplies', unit: 'piece', costPrice: 110, sellingPrice: 180, quantity: 2, lowStockThreshold: 30, supplier: suppliers[4]._id, location: 'Shelf E3' },
    ]);
    console.log('Products seeded');

    // Create sample sales (last 30 days)
    const saleData = [];
    const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer'];
    const customerNames = ['Acme Corp', 'Bright Solutions', 'TechStart Pvt', 'BlueStar Inc', 'Nova Enterprises'];

    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);

      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, numItems);

      const items = selectedProducts.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1;
        return {
          product: p._id,
          productName: p.name,
          productSku: p.sku,
          quantity: qty,
          unitPrice: p.sellingPrice,
          subtotal: qty * p.sellingPrice,
        };
      });

      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
      const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.05) : 0;
      const tax = Math.floor(subtotal * 0.18);

      saleData.push({
        items,
        subtotal,
        discount,
        tax,
        totalAmount: subtotal - discount + tax,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: 'completed',
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        createdBy: Math.random() > 0.5 ? admin._id : manager._id,
        createdAt: saleDate,
        updatedAt: saleDate,
      });
    }

    // Insert sales one by one to trigger pre-save middleware (sale number generation)
    const createdSales = [];
    for (const s of saleData) {
      const sale = new Sale(s);
      await sale.save();
      createdSales.push(sale);
    }
    console.log(`${createdSales.length} sales seeded`);

    // Create stock movement records for the sales
    const movementsToInsert = [];
    for (const sale of createdSales) {
      for (const item of sale.items) {
        movementsToInsert.push({
          product: item.product,
          productName: item.productName,
          type: 'sale',
          quantityBefore: 0, // Approximate — actual tracked in real flow
          quantityChange: -item.quantity,
          quantityAfter: 0,
          reference: sale.saleNumber,
          referenceId: sale._id,
          referenceModel: 'Sale',
          createdBy: sale.createdBy,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
        });
      }
    }

    // Add some restock movements
    for (let i = 0; i < 10; i++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 50) + 20;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      movementsToInsert.push({
        product: p._id,
        productName: p.name,
        type: 'restock',
        quantityBefore: p.quantity,
        quantityChange: qty,
        quantityAfter: p.quantity + qty,
        reference: `PO-${Math.floor(Math.random() * 9000) + 1000}`,
        notes: 'Regular restocking order',
        createdBy: admin._id,
        createdAt: date,
        updatedAt: date,
      });
    }

    await StockMovement.insertMany(movementsToInsert);
    console.log(`${movementsToInsert.length} stock movements seeded`);

    console.log('\n✅ Seed complete!');
    console.log('📧 Login credentials:');
    console.log('   admin@stocksense.io / admin123  (role: admin)');
    console.log('   manager@stocksense.io / manager123  (role: manager)');
    console.log('   viewer@stocksense.io / viewer123  (role: viewer)');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
