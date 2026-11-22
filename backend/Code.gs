/**
 * KATHA WHOLESALE – GOOGLE APPS SCRIPT SERVERLESS BACKEND
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Paste this code into Code.gs, replacing any existing code.
 * 4. Click Deploy > New deployment > Select type: Web app.
 * 5. Execute as: "Me", Who has access: "Anyone".
 * 6. Copy the deployed Web App URL and configure it in Katha Wholesale settings.
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
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
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
    const action = e.parameter.action || 'ping';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createResponse({ status: 'ok', message: 'Katha Backend is online', timestamp: new Date().toISOString() });
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
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

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
        order.orderDate,
        order.totalOuterBags,
        order.totalWeightKg,
        order.grandTotal,
        order.paymentMode || 'CREDIT',
        order.status,
        order.submittedByRole
      ]);

      return createResponse({ status: 'success', message: 'Order recorded', orderId: order.id });
    }

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
      return createResponse({ status: 'success', message: 'User registration submitted' });
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

    return createResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ status: 'error', error: err.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
