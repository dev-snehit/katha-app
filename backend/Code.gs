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
    'Users': ['id', 'name', 'email', 'phone', 'role', 'status', 'createdAt', 'passwordHash'],
    'User_Registrations': ['id', 'name', 'email', 'phone', 'requested_role', 'status', 'registered_at', 'temp_password_sent'],
    'Master_Products': ['id', 'name_en', 'name_te', 'category', 'brand_en', 'brand_te', 'inner_wt_kg', 'inner_count', 'outer_wt_kg', 'stock_physical', 'stock_reserved', 'price_bag', 'cost_bag', 'retail_price_bag'],
    'Master_Customers': ['id', 'name_en', 'name_te', 'phone', 'business_en', 'business_te', 'address_en', 'address_te', 'current_due'],
    'Master_Suppliers': ['id', 'business_en', 'business_te', 'owner_en', 'owner_te', 'bank_name', 'account_no', 'ifsc_code', 'nickname_en', 'nickname_te'],
    'Master_Orders_Sales': ['id', 'order_no', 'customer_id', 'customer_name', 'customer_phone', 'date', 'total_bags', 'total_weight_kg', 'subtotal', 'discount', 'grand_total', 'payment_mode', 'status', 'approved_by'],
    'Pending_Orders': ['id', 'order_no', 'customer_id', 'customer_name', 'date', 'total_bags', 'discount', 'grand_total', 'status', 'submitted_by'],
    'Master_Purchases': ['id', 'purchase_no', 'supplier_id', 'date', 'total_bags', 'grand_total', 'reference_bill']
  };

  for (const [sheetName, headers] of Object.entries(tables)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fed7aa');
      sheet.setFrozenRows(1);
    } else {
      // Ensure missing headers are filled in row 1
      const maxCol = Math.max(sheet.getLastColumn(), headers.length);
      if (maxCol > 0) {
        const currentHeaders = sheet.getRange(1, 1, 1, maxCol).getValues()[0];
        headers.forEach((h, idx) => {
          if (!currentHeaders[idx] || currentHeaders[idx].toString().trim() === '') {
            sheet.getRange(1, idx + 1).setValue(h).setFontWeight('bold').setBackground('#fed7aa');
          }
        });
      }
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

  // Lock and protect all specified database sheets by default
  lockDatabaseSheets(ss, Object.keys(tables));
}

/**
 * Locks specified sheets by default so human viewers cannot alter cell records.
 * Only the automated Google Apps Script execution engine retains full read/write permission.
 */
function lockDatabaseSheets(ss, sheetNames) {
  for (let i = 0; i < sheetNames.length; i++) {
    const name = sheetNames[i];
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      if (protections.length === 0) {
        try {
          const protection = sheet.protect().setDescription('Katha Wholesale Managed - Locked by Default');
          protection.setWarningOnly(false);
          const me = Session.getEffectiveUser();
          if (me) {
            protection.removeEditors(protection.getEditors());
            protection.addEditor(me);
          }
        } catch (err) {
          try {
            const protection = sheet.protect().setDescription('Katha Wholesale Managed - Protected');
            protection.setWarningOnly(true);
          } catch (innerErr) {}
        }
      }
    }
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

    if (action === 'lockSheets') {
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases'];
      lockDatabaseSheets(ss, sheetNames);
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
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

    if (action === 'lockSheets') {
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases'];
      lockDatabaseSheets(ss, sheetNames);
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
    }

    // --- Order Operations ---
    if (action === 'saveOrder') {
      const order = body.order;
      const targetSheetName = order.status === 'APPROVED' ? 'Master_Orders_Sales' : 'Pending_Orders';
      const sheet = ss.getSheetByName(targetSheetName);
      
      if (order.status === 'APPROVED') {
        sheet.appendRow([
          order.id,
          order.orderNumber,
          order.customerId,
          order.customerName,
          order.customerPhone || '',
          order.orderDate || new Date().toISOString(),
          order.totalOuterBags || 0,
          order.totalWeightKg || 0,
          order.subtotal || 0,
          order.discount || 0,
          order.grandTotal || 0,
          order.paymentMode || 'CREDIT',
          order.status,
          order.submittedByRole || 'STAFF'
        ]);
      } else {
        sheet.appendRow([
          order.id,
          order.orderNumber,
          order.customerId,
          order.customerName,
          order.orderDate || new Date().toISOString(),
          order.totalOuterBags || 0,
          order.discount || 0,
          order.grandTotal || 0,
          order.status,
          order.submittedByRole || 'STAFF'
        ]);
      }

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
          sheet.getRange(i + 1, 1, 1, 14).setValues([[
            p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
            p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
            p.wholesalePriceBag, p.costPricePerBag, p.retailPriceBag || 0
          ]]);
          found = true;
          break;
        }
      }

      if (!found) {
        sheet.appendRow([
          p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
          p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
          p.wholesalePriceBag, p.costPricePerBag, p.retailPriceBag || 0
        ]);
      }
      return createResponse({ status: 'success', message: 'Product inventory saved to sheet' });
    }

    // --- User Operations ---
    if (action === 'registerUser') {
      const user = body.user;
      const tempPass = body.tempPassword || '';
      
      // 1. Record registration in dedicated User_Registrations sheet
      const regSheet = ss.getSheetByName('User_Registrations');
      if (regSheet) {
        regSheet.appendRow([
          user.id,
          user.name,
          user.email,
          user.phone,
          user.role,
          user.status || 'PENDING_APPROVAL',
          new Date().toISOString(),
          tempPass ? 'SENT' : 'NO'
        ]);
      }

      // 2. Also register in Users sheet with hashed password
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        userSheet.appendRow([
          user.id,
          user.name,
          user.email,
          user.phone,
          user.role,
          user.status || 'PENDING_APPROVAL',
          new Date().toISOString(),
          user.passwordHash || ''
        ]);
      }

      // 3. Send automated confirmation email with temporary password
      if (tempPass && user.email) {
        try {
          MailApp.sendEmail({
            to: user.email,
            subject: 'Katha Wholesale - Access Request & Temporary Sign-In Code',
            body: 'Hello ' + user.name + ',\n\n' +
                  'Your registration request for Katha Wholesale has been received.\n\n' +
                  'Temporary Password: ' + tempPass + '\n\n' +
                  'Security Notice: For your account protection, you will be required to choose a new permanent password on your first sign-in.\n\n' +
                  'Regards,\nKatha Wholesale Enterprise'
          });
        } catch (mailErr) {
          console.warn('MailApp delivery error:', mailErr);
        }
      }

      return createResponse({ 
        status: 'success', 
        message: 'Registration recorded in User_Registrations sheet and confirmation email dispatched',
        userId: user.id 
      });
    }

    if (action === 'forgotPassword') {
      const { email, tempPassword, passwordHash } = body;
      const userSheet = ss.getSheetByName('Users');
      if (userSheet && email) {
        const uData = userSheet.getDataRange().getValues();
        for (let i = 1; i < uData.length; i++) {
          if (uData[i][2] && uData[i][2].toString().toLowerCase() === email.toLowerCase()) {
            if (passwordHash) {
              userSheet.getRange(i + 1, 8).setValue(passwordHash);
            }
            break;
          }
        }
      }

      if (tempPassword && email) {
        try {
          MailApp.sendEmail({
            to: email,
            subject: 'Katha Wholesale - Temporary Password Reset Code',
            body: 'Hello,\n\n' +
                  'A password reset request was initiated for your Katha Wholesale account.\n\n' +
                  'Your Temporary Password: ' + tempPassword + '\n\n' +
                  'Please sign in with this temporary password. You will be prompted immediately to set your new permanent password.\n\n' +
                  'Regards,\nKatha Wholesale Enterprise'
          });
        } catch (mailErr) {
          console.warn('Password reset email error:', mailErr);
        }
      }
      return createResponse({ status: 'success', message: 'Temporary reset password sent' });
    }

    if (action === 'resetPassword') {
      const { email, newPasswordHash } = body;
      const userSheet = ss.getSheetByName('Users');
      if (userSheet && email && newPasswordHash) {
        const uData = userSheet.getDataRange().getValues();
        for (let i = 1; i < uData.length; i++) {
          if (uData[i][2] && uData[i][2].toString().toLowerCase() === email.toLowerCase()) {
            userSheet.getRange(i + 1, 8).setValue(newPasswordHash);
            return createResponse({ status: 'success', message: 'Password hash successfully updated' });
          }
        }
      }
      return createResponse({ status: 'success', message: 'Password reset recorded' });
    }

    if (action === 'approveUser') {
      const { userId, newStatus, role } = body;
      
      // Update in User_Registrations
      const regSheet = ss.getSheetByName('User_Registrations');
      if (regSheet) {
        const rData = regSheet.getDataRange().getValues();
        for (let i = 1; i < rData.length; i++) {
          if (rData[i][0] === userId) {
            if (newStatus) regSheet.getRange(i + 1, 6).setValue(newStatus);
            if (role) regSheet.getRange(i + 1, 5).setValue(role);
            break;
          }
        }
      }

      // Update in Users
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const data = userSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === userId) {
            if (newStatus) userSheet.getRange(i + 1, 6).setValue(newStatus);
            if (role) userSheet.getRange(i + 1, 5).setValue(role);
            return createResponse({ status: 'success', message: 'User status updated' });
          }
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
