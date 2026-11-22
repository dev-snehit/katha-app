/**
 * KATHA WHOLESALE – GOOGLE APPS SCRIPT SERVERLESS BACKEND (v2)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Paste this code into Code.gs, replacing any existing code.
 * 4. Click Deploy > Manage deployments > Edit > New version > Deploy.
 *    (Or Deploy > New deployment > Web app > Execute as "Me", Access "Anyone").
 * 5. Copy the deployed Web App URL into Katha Wholesale settings.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tables = {
    'Users': ['id', 'name', 'email', 'phone', 'role', 'status', 'createdAt'],
    'Master_Products': ['id', 'name_en', 'name_te', 'category', 'brand_en', 'brand_te', 'inner_wt_kg', 'inner_count', 'outer_wt_kg', 'stock_physical', 'stock_reserved', 'price_bag', 'cost_bag'],
    'Master_Customers': ['id', 'name_en', 'name_te', 'phone', 'business_en', 'business_te', 'address_en', 'address_te', 'current_due'],
    'Master_Suppliers': ['id', 'business_en', 'business_te', 'owner_en', 'owner_te', 'bank_name', 'account_no', 'ifsc_code', 'nickname_en', 'nickname_te'],
    'Master_Orders_Sales': ['id', 'order_no', 'customer_id', 'customer_name', 'customer_phone', 'date', 'total_bags', 'total_weight_kg', 'grand_total', 'payment_mode', 'status', 'approved_by'],
    'Pending_Orders': ['id', 'order_no', 'customer_id', 'customer_name', 'date', 'total_bags', 'grand_total', 'status', 'submitted_by'],
    'Master_Purchases': ['id', 'purchase_no', 'supplier_id', 'date', 'total_bags', 'grand_total', 'reference_bill']
  };

  for (const [sheetName, headers] of Object.entries(tables)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fed7aa');
      sheet.setFrozenRows(1);
    }
  }

  // Pre-seed Master Admin if Users sheet is empty
  const userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() === 1) {
    userSheet.appendRow([
      '00000000-0000-0000-0000-000000000001',
      'Snehit Tadepalli',
      'dev.snehit@gmail.com',
      '9999999999',
      'ADMIN',
      'APPROVED',
      new Date().toISOString()
    ]);
  }
}

function doGet(e) {
  try {
    setupDatabase();
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createResponse({
        status: 'ok',
        sheetName: ss.getName(),
        message: 'Katha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getData') {
      const result = {};
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases'];
      
      for (const name of sheetNames) {
        const sheet = ss.getSheetByName(name);
        if (sheet && sheet.getLastRow() > 1) {
          const rows = sheet.getDataRange().getValues();
          const headers = rows[0];
          result[name] = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => obj[h] = row[i]);
            return obj;
          });
        } else {
          result[name] = [];
        }
      }
      return createResponse({ status: 'success', data: result });
    }

    return createResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ status: 'error', error: err.toString() });
  }
}

function doPost(e) {
  try {
    setupDatabase();
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload received' });
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createResponse({
        status: 'ok',
        sheetName: ss.getName(),
        message: 'Katha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    // --- Order Operations ---
    if (action === 'saveOrder') {
      const order = body.order;
      const targetSheetName = order.status === 'APPROVED' ? 'Master_Orders_Sales' : 'Pending_Orders';
      const sheet = ss.getSheetByName(targetSheetName);
      
      sheet.appendRow([
        order.id,
        order.orderNumber,
        order.customerId,
        order.customerName,
        order.customerPhone || '',
        order.orderDate || new Date().toISOString(),
        order.totalOuterBags || 0,
        order.totalWeightKg || 0,
        order.grandTotal || 0,
        order.paymentMode || 'CREDIT',
        order.status,
        order.submittedByRole || 'STAFF'
      ]);

      return createResponse({ status: 'success', message: 'Order recorded in ' + targetSheetName, orderId: order.id });
    }

    if (action === 'updateOrderStatus') {
      const { orderId, newStatus, approvedByRole } = body;
      // Search in Pending_Orders
      const pendingSheet = ss.getSheetByName('Pending_Orders');
      const salesSheet = ss.getSheetByName('Master_Orders_Sales');
      const pData = pendingSheet.getDataRange().getValues();

      for (let i = 1; i < pData.length; i++) {
        if (pData[i][0] === orderId) {
          if (newStatus === 'APPROVED' || newStatus === 'DELIVERED') {
            // Move row to Master_Orders_Sales
            salesSheet.appendRow([
              pData[i][0],
              pData[i][1],
              pData[i][2],
              pData[i][3],
              '',
              pData[i][4],
              pData[i][5],
              0,
              pData[i][6],
              'CREDIT',
              newStatus,
              approvedByRole || 'ADMIN'
            ]);
            pendingSheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Order approved & moved to Master Sales' });
          } else {
            pendingSheet.getRange(i + 1, 8).setValue(newStatus);
            return createResponse({ status: 'success', message: 'Pending order status updated' });
          }
        }
      }

      return createResponse({ status: 'success', message: 'Order status recorded' });
    }

    // --- Customer Operations ---
    if (action === 'saveCustomer') {
      const c = body.customer;
      const sheet = ss.getSheetByName('Master_Customers');
      const data = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === c.id) {
          sheet.getRange(i + 1, 1, 1, 9).setValues([[
            c.id, c.name, c.nameTe || '', c.phone, c.businessName || '', c.businessNameTe || '', c.address || '', c.addressTe || '', c.currentDue || 0
          ]]);
          found = true;
          break;
        }
      }

      if (!found) {
        sheet.appendRow([
          c.id, c.name, c.nameTe || '', c.phone, c.businessName || '', c.businessNameTe || '', c.address || '', c.addressTe || '', c.currentDue || 0
        ]);
      }
      return createResponse({ status: 'success', message: 'Customer saved to sheet' });
    }

    // --- Supplier Operations ---
    if (action === 'saveSupplier') {
      const s = body.supplier;
      const sheet = ss.getSheetByName('Master_Suppliers');
      const data = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === s.id) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            s.id, s.businessName, s.businessNameTe || '', s.ownerName || '', s.ownerNameTe || '', s.bankName, s.accountNumber, s.ifscCode, s.nickname, s.nicknameTe || ''
          ]]);
          found = true;
          break;
        }
      }

      if (!found) {
        sheet.appendRow([
          s.id, s.businessName, s.businessNameTe || '', s.ownerName || '', s.ownerNameTe || '', s.bankName, s.accountNumber, s.ifscCode, s.nickname, s.nicknameTe || ''
        ]);
      }
      return createResponse({ status: 'success', message: 'Supplier saved to sheet' });
    }

    // --- Product Operations ---
    if (action === 'saveProduct') {
      const p = body.product;
      const sheet = ss.getSheetByName('Master_Products');
      const data = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === p.id) {
          sheet.getRange(i + 1, 1, 1, 13).setValues([[
            p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
            p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
            p.wholesalePriceBag, p.costPricePerBag
          ]]);
          found = true;
          break;
        }
      }

      if (!found) {
        sheet.appendRow([
          p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
          p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
          p.wholesalePriceBag, p.costPricePerBag
        ]);
      }
      return createResponse({ status: 'success', message: 'Product inventory saved to sheet' });
    }

    // --- User Operations ---
    if (action === 'registerUser') {
      const user = body.user;
      const sheet = ss.getSheetByName('Users');
      sheet.appendRow([
        user.id,
        user.name,
        user.email,
        user.phone,
        user.role,
        user.status || 'PENDING_APPROVAL',
        new Date().toISOString()
      ]);
      return createResponse({ status: 'success', message: 'User registration recorded in Users tab' });
    }

    if (action === 'approveUser') {
      const { userId, newStatus, role } = body;
      const sheet = ss.getSheetByName('Users');
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          if (newStatus) sheet.getRange(i + 1, 6).setValue(newStatus);
          if (role) sheet.getRange(i + 1, 5).setValue(role);
          return createResponse({ status: 'success', message: 'User status updated' });
        }
      }
      return createResponse({ status: 'error', message: 'User not found' });
    }

    // --- Batch Full Sync ---
    if (action === 'syncAll') {
      const { products = [], customers = [], suppliers = [], orders = [], users = [] } = body;

      // Update Products
      const prodSheet = ss.getSheetByName('Master_Products');
      if (prodSheet && products.length > 0) {
        if (prodSheet.getLastRow() > 1) {
          prodSheet.getRange(2, 1, prodSheet.getLastRow() - 1, 13).clearContent();
        }
        const rows = products.map(p => [
          p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
          p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
          p.wholesalePriceBag, p.costPricePerBag
        ]);
        prodSheet.getRange(2, 1, rows.length, 13).setValues(rows);
      }

      // Update Customers
      const custSheet = ss.getSheetByName('Master_Customers');
      if (custSheet && customers.length > 0) {
        if (custSheet.getLastRow() > 1) {
          custSheet.getRange(2, 1, custSheet.getLastRow() - 1, 9).clearContent();
        }
        const rows = customers.map(c => [
          c.id, c.name, c.nameTe || '', c.phone, c.businessName || '', c.businessNameTe || '', c.address || '', c.addressTe || '', c.currentDue || 0
        ]);
        custSheet.getRange(2, 1, rows.length, 9).setValues(rows);
      }

      // Update Suppliers
      const suppSheet = ss.getSheetByName('Master_Suppliers');
      if (suppSheet && suppliers.length > 0) {
        if (suppSheet.getLastRow() > 1) {
          suppSheet.getRange(2, 1, suppSheet.getLastRow() - 1, 10).clearContent();
        }
        const rows = suppliers.map(s => [
          s.id, s.businessName, s.businessNameTe || '', s.ownerName || '', s.ownerNameTe || '', s.bankName, s.accountNumber, s.ifscCode, s.nickname, s.nicknameTe || ''
        ]);
        suppSheet.getRange(2, 1, rows.length, 10).setValues(rows);
      }

      return createResponse({
        status: 'success',
        message: 'Master Google Sheet fully updated with local records',
        counts: {
          products: products.length,
          customers: customers.length,
          suppliers: suppliers.length,
          orders: orders.length
        }
      });
    }

    return createResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ status: 'error', error: err.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
