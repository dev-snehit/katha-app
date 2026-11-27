/**
 * KAATHA WHOLESALE – GOOGLE APPS SCRIPT SERVERLESS BACKEND (v2)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Paste this code into Code.gs, replacing any existing code.
 * 4. Click Deploy > Manage deployments > Edit > New version > Deploy.
 *    (Or Deploy > New deployment > Web app > Execute as "Me", Access "Anyone").
 * 5. Copy the deployed Web App URL into Kaatha Wholesale settings.
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
    'Master_Purchases': ['id', 'purchase_no', 'supplier_id', 'date', 'total_bags', 'grand_total', 'reference_bill'],
    'Role_Permissions': ['role', 'config_json', 'updated_at', 'updated_by']
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

  // Pre-seed default Role_Permissions if empty
  const permSheet = ss.getSheetByName('Role_Permissions');
  if (permSheet && permSheet.getLastRow() === 1) {
    const roles = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
    roles.forEach(r => {
      permSheet.appendRow([r, JSON.stringify(DEFAULT_BACKEND_ROLE_PERMISSIONS[r]), new Date().toISOString(), 'SYSTEM']);
    });
  }

  // Deduplicate and clean Users sheet
  deduplicateUsersTable(ss);

  // Lock and protect all specified database sheets by default
  lockDatabaseSheets(ss, Object.keys(tables));
}

/**
 * Deduplicates user rows in Users sheet based on unique email and phone numbers,
 * preserving only the latest, cleanest record and removing all duplicate rows.
 */
function deduplicateUsersTable(ss) {
  const userSheet = ss.getSheetByName('Users');
  if (!userSheet || userSheet.getLastRow() <= 1) return { removed: 0, total: 0 };

  const data = userSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const emailIdx = headers.indexOf('email') !== -1 ? headers.indexOf('email') : 2;
  const phoneIdx = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : 3;
  const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;

  const seenEmails = {};
  const seenPhones = {};
  const uniqueRows = [];

  // Traverse in reverse so latest entries/updates are preserved
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const email = (row[emailIdx] || '').toString().trim().toLowerCase();
    const rawPhone = (row[phoneIdx] || '').toString().replace(/\D/g, '');
    const phone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

    if (!email && !phone) continue;

    // Check duplicate
    if ((email && seenEmails[email]) || (phone && phone.length === 10 && seenPhones[phone])) {
      continue;
    }

    if (email) seenEmails[email] = true;
    if (phone && phone.length === 10) seenPhones[phone] = true;
    uniqueRows.unshift(row);
  }

  const removedCount = rows.length - uniqueRows.length;
  if (removedCount > 0) {
    const cols = headers.length;
    userSheet.getRange(2, 1, userSheet.getLastRow() - 1, cols).clearContent();
    if (uniqueRows.length > 0) {
      userSheet.getRange(2, 1, uniqueRows.length, cols).setValues(uniqueRows);
    }
  }

  return { removed: removedCount, total: uniqueRows.length };
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
          const protection = sheet.protect().setDescription('Kaatha Wholesale Managed - Locked by Default');
          protection.setWarningOnly(false);
          const me = Session.getEffectiveUser();
          if (me) {
            protection.removeEditors(protection.getEditors());
            protection.addEditor(me);
          }
        } catch (err) {
          try {
            const protection = sheet.protect().setDescription('Kaatha Wholesale Managed - Protected');
            protection.setWarningOnly(true);
          } catch (innerErr) {}
        }
      }
    }
  }
}

/**
 * Default role-specific permissions JSON configuration in backend.
 * Defines list of features and functionalities accepted as boolean to globally control what can be seen and executed.
 */
var DEFAULT_BACKEND_ROLE_PERMISSIONS = {
  OWNER: {
    dashboard_page: { enabled: true, functionalities: { view_dashboard: true, view_kpi_metrics: true, view_order_funnel_chart: true, view_inventory_health: true, view_credit_risk_table: true, view_recent_activity: true, quick_actions: true } },
    orders_page: { enabled: true, functionalities: { view_orders: true, create_order: true, edit_order: true, delete_order: true, approve_order: true, dispatch_order: true, deliver_order: true, send_whatsapp_bill: true } },
    stock_page: { enabled: true, functionalities: { view_stock: true, add_product: true, edit_product: true, delete_product: true, unpack_bag: true } },
    customers_page: { enabled: true, functionalities: { view_customers: true, add_customer: true, edit_customer: true, delete_customer: true } },
    suppliers_page: { enabled: true, functionalities: { view_suppliers: true, add_supplier: true, edit_supplier: true, delete_supplier: true } },
    reports_page: { enabled: true, functionalities: { view_reports: true, export_data: true, generate_statement: true } },
    user_management_page: { enabled: true, functionalities: { view_users: true, approve_user: true, deny_user: true, edit_user: true, delete_user: true, manage_role_permissions: true } }
  },
  ADMIN: {
    dashboard_page: { enabled: true, functionalities: { view_dashboard: true, view_kpi_metrics: true, view_order_funnel_chart: true, view_inventory_health: true, view_credit_risk_table: true, view_recent_activity: true, quick_actions: true } },
    orders_page: { enabled: true, functionalities: { view_orders: true, create_order: true, edit_order: true, delete_order: true, approve_order: true, dispatch_order: true, deliver_order: true, send_whatsapp_bill: true } },
    stock_page: { enabled: true, functionalities: { view_stock: true, add_product: true, edit_product: true, delete_product: true, unpack_bag: true } },
    customers_page: { enabled: true, functionalities: { view_customers: true, add_customer: true, edit_customer: true, delete_customer: true } },
    suppliers_page: { enabled: true, functionalities: { view_suppliers: true, add_supplier: true, edit_supplier: true, delete_supplier: true } },
    reports_page: { enabled: true, functionalities: { view_reports: true, export_data: true, generate_statement: true } },
    user_management_page: { enabled: true, functionalities: { view_users: true, approve_user: true, deny_user: true, edit_user: true, delete_user: true, manage_role_permissions: true } }
  },
  STAFF: {
    dashboard_page: { enabled: true, functionalities: { view_dashboard: true, view_kpi_metrics: true, view_order_funnel_chart: true, view_inventory_health: true, view_credit_risk_table: false, view_recent_activity: true, quick_actions: true } },
    orders_page: { enabled: true, functionalities: { view_orders: true, create_order: true, edit_order: false, delete_order: false, approve_order: false, dispatch_order: true, deliver_order: true, send_whatsapp_bill: true } },
    stock_page: { enabled: true, functionalities: { view_stock: true, add_product: false, edit_product: false, delete_product: false, unpack_bag: true } },
    customers_page: { enabled: true, functionalities: { view_customers: true, add_customer: true, edit_customer: false, delete_customer: false } },
    suppliers_page: { enabled: true, functionalities: { view_suppliers: true, add_supplier: false, edit_supplier: false, delete_supplier: false } },
    reports_page: { enabled: true, functionalities: { view_reports: true, export_data: false, generate_statement: true } },
    user_management_page: { enabled: false, functionalities: { view_users: false, approve_user: false, deny_user: false, edit_user: false, delete_user: false, manage_role_permissions: false } }
  },
  CUSTOMER: {
    dashboard_page: { enabled: false, functionalities: { view_dashboard: false, view_kpi_metrics: false, view_order_funnel_chart: false, view_inventory_health: false, view_credit_risk_table: false, view_recent_activity: false, quick_actions: false } },
    orders_page: { enabled: true, functionalities: { view_orders: true, create_order: true, edit_order: false, delete_order: false, approve_order: false, dispatch_order: false, deliver_order: false, send_whatsapp_bill: false } },
    stock_page: { enabled: true, functionalities: { view_stock: true, add_product: false, edit_product: false, delete_product: false, unpack_bag: false } },
    customers_page: { enabled: false, functionalities: { view_customers: false, add_customer: false, edit_customer: false, delete_customer: false } },
    suppliers_page: { enabled: false, functionalities: { view_suppliers: false, add_supplier: false, edit_supplier: false, delete_supplier: false } },
    reports_page: { enabled: false, functionalities: { view_reports: false, export_data: false, generate_statement: false } },
    user_management_page: { enabled: false, functionalities: { view_users: false, approve_user: false, deny_user: false, edit_user: false, delete_user: false, manage_role_permissions: false } }
  }
};

function getOrInitRolePermissions(ss) {
  var sheet = ss.getSheetByName('Role_Permissions');
  if (!sheet) {
    sheet = ss.insertSheet('Role_Permissions');
    sheet.appendRow(['role', 'config_json', 'updated_at', 'updated_by']);
    var roles = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
    roles.forEach(function(r) {
      sheet.appendRow([r, JSON.stringify(DEFAULT_BACKEND_ROLE_PERMISSIONS[r]), new Date().toISOString(), 'SYSTEM']);
    });
  }

  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    var r = data[i][0];
    var json = data[i][1];
    if (r && json) {
      try {
        map[r] = typeof json === 'string' ? JSON.parse(json) : json;
      } catch (err) {
        map[r] = DEFAULT_BACKEND_ROLE_PERMISSIONS[r];
      }
    }
  }
  return map;
}

function checkBackendPermission(ss, userRole, pageKey, funcKey) {
  if (!userRole) return false;
  if (userRole === 'OWNER') return true; // Owner has full uninhibited permissions
  var perms = getOrInitRolePermissions(ss);
  var roleConfig = perms[userRole] || DEFAULT_BACKEND_ROLE_PERMISSIONS[userRole];
  if (!roleConfig) return false;
  var page = roleConfig[pageKey];
  if (!page || page.enabled === false) return false;
  if (page.functionalities && page.functionalities[funcKey] !== undefined) {
    return page.functionalities[funcKey] === true;
  }
  return true;
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
        message: 'Kaatha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getData') {
      const result = {};
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases', 'Role_Permissions'];
      
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
      result['rolePermissions'] = getOrInitRolePermissions(ss);
      return createResponse({ status: 'success', data: result });
    }

    if (action === 'lockSheets') {
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases', 'Role_Permissions'];
      lockDatabaseSheets(ss, sheetNames);
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
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
    const userRole = body.userRole || body.role || 'STAFF';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createResponse({
        status: 'ok',
        sheetName: ss.getName(),
        message: 'Kaatha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getData') {
      const result = {};
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases', 'Role_Permissions'];
      
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
      result['rolePermissions'] = getOrInitRolePermissions(ss);
      return createResponse({ status: 'success', data: result });
    }

    if (action === 'lockSheets') {
      const sheetNames = ['Users', 'Master_Products', 'Master_Customers', 'Master_Suppliers', 'Master_Orders_Sales', 'Pending_Orders', 'Master_Purchases', 'Role_Permissions'];
      lockDatabaseSheets(ss, sheetNames);
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
    }

    // --- Role Permissions Operations ---
    if (action === 'saveRolePermissions') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'manage_role_permissions')) {
        return createResponse({ status: 'error', message: 'Permission denied: manage_role_permissions is disabled for role ' + userRole });
      }

      const { role: targetRole, config, allPermissions } = body;
      const sheet = ss.getSheetByName('Role_Permissions') || ss.insertSheet('Role_Permissions');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['role', 'config_json', 'updated_at', 'updated_by']);
      }

      if (allPermissions && typeof allPermissions === 'object') {
        const roles = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
        roles.forEach(r => {
          if (allPermissions[r]) {
            let found = false;
            const pData = sheet.getDataRange().getValues();
            for (let i = 1; i < pData.length; i++) {
              if (pData[i][0] === r) {
                sheet.getRange(i + 1, 2).setValue(JSON.stringify(allPermissions[r]));
                sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
                sheet.getRange(i + 1, 4).setValue(userRole);
                found = true;
                break;
              }
            }
            if (!found) {
              sheet.appendRow([r, JSON.stringify(allPermissions[r]), new Date().toISOString(), userRole]);
            }
          }
        });
      } else if (targetRole && config) {
        let found = false;
        const pData = sheet.getDataRange().getValues();
        for (let i = 1; i < pData.length; i++) {
          if (pData[i][0] === targetRole) {
            sheet.getRange(i + 1, 2).setValue(JSON.stringify(config));
            sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
            sheet.getRange(i + 1, 4).setValue(userRole);
            found = true;
            break;
          }
        }
        if (!found) {
          sheet.appendRow([targetRole, JSON.stringify(config), new Date().toISOString(), userRole]);
        }
      }

      return createResponse({ status: 'success', message: 'Role permissions saved to database' });
    }

    // --- Order Operations ---
    if (action === 'saveOrder') {
      const order = body.order;
      const targetSheetName = order.status === 'APPROVED' ? 'Master_Orders_Sales' : 'Pending_Orders';
      const sheet = ss.getSheetByName(targetSheetName);
      const data = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === order.id) {
          found = true;
          break;
        }
      }

      if (found && !checkBackendPermission(ss, userRole, 'orders_page', 'edit_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: edit_order is disabled for role ' + userRole });
      }
      if (!found && !checkBackendPermission(ss, userRole, 'orders_page', 'create_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: create_order is disabled for role ' + userRole });
      }
      
      if (order.status === 'APPROVED') {
        const rowData = [
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
        ];
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === order.id) {
            sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
            found = true;
            break;
          }
        }
        if (!found) sheet.appendRow(rowData);
      } else {
        const rowData = [
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
        ];
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === order.id) {
            sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
            found = true;
            break;
          }
        }
        if (!found) sheet.appendRow(rowData);
      }

      return createResponse({ status: 'success', message: 'Order recorded in ' + targetSheetName, orderId: order.id });
    }

    if (action === 'updateOrderStatus') {
      const { orderId, newStatus, approvedByRole } = body;
      if (newStatus === 'APPROVED' && !checkBackendPermission(ss, userRole, 'orders_page', 'approve_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: approve_order is disabled for role ' + userRole });
      }
      if (newStatus === 'DISPATCHED' && !checkBackendPermission(ss, userRole, 'orders_page', 'dispatch_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: dispatch_order is disabled for role ' + userRole });
      }
      if (newStatus === 'DELIVERED' && !checkBackendPermission(ss, userRole, 'orders_page', 'deliver_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: deliver_order is disabled for role ' + userRole });
      }

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

    if (action === 'deleteOrder') {
      if (!checkBackendPermission(ss, userRole, 'orders_page', 'delete_order')) {
        return createResponse({ status: 'error', message: 'Permission denied: delete_order is disabled for role ' + userRole });
      }
      const { orderId } = body;
      const pendingSheet = ss.getSheetByName('Pending_Orders');
      if (pendingSheet) {
        const pData = pendingSheet.getDataRange().getValues();
        for (let i = 1; i < pData.length; i++) {
          if (pData[i][0] === orderId) {
            pendingSheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Order deleted from pending orders' });
          }
        }
      }
      const salesSheet = ss.getSheetByName('Master_Orders_Sales');
      if (salesSheet) {
        const sData = salesSheet.getDataRange().getValues();
        for (let i = 1; i < sData.length; i++) {
          if (sData[i][0] === orderId) {
            salesSheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Order deleted from sales orders' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'Order not found' });
    }

    // --- Customer Operations ---
    if (action === 'saveCustomer') {
      const c = body.customer;
      const sheet = ss.getSheetByName('Master_Customers');
      const data = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === c.id) {
          found = true;
          break;
        }
      }

      if (found && !checkBackendPermission(ss, userRole, 'customers_page', 'edit_customer')) {
        return createResponse({ status: 'error', message: 'Permission denied: edit_customer is disabled for role ' + userRole });
      }
      if (!found && !checkBackendPermission(ss, userRole, 'customers_page', 'add_customer')) {
        return createResponse({ status: 'error', message: 'Permission denied: add_customer is disabled for role ' + userRole });
      }

      if (found) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === c.id) {
            sheet.getRange(i + 1, 1, 1, 9).setValues([[
              c.id, c.name, c.nameTe || '', c.phone, c.businessName || '', c.businessNameTe || '', c.address || '', c.addressTe || '', c.currentDue || 0
            ]]);
            break;
          }
        }
      } else {
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
          found = true;
          break;
        }
      }

      if (found && !checkBackendPermission(ss, userRole, 'suppliers_page', 'edit_supplier')) {
        return createResponse({ status: 'error', message: 'Permission denied: edit_supplier is disabled for role ' + userRole });
      }
      if (!found && !checkBackendPermission(ss, userRole, 'suppliers_page', 'add_supplier')) {
        return createResponse({ status: 'error', message: 'Permission denied: add_supplier is disabled for role ' + userRole });
      }

      if (found) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === s.id) {
            sheet.getRange(i + 1, 1, 1, 10).setValues([[
              s.id, s.businessName, s.businessNameTe || '', s.ownerName || '', s.ownerNameTe || '', s.bankName, s.accountNumber, s.ifscCode, s.nickname, s.nicknameTe || ''
            ]]);
            break;
          }
        }
      } else {
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
          found = true;
          break;
        }
      }

      if (found && !checkBackendPermission(ss, userRole, 'stock_page', 'edit_product')) {
        return createResponse({ status: 'error', message: 'Permission denied: edit_product is disabled for role ' + userRole });
      }
      if (!found && !checkBackendPermission(ss, userRole, 'stock_page', 'add_product')) {
        return createResponse({ status: 'error', message: 'Permission denied: add_product is disabled for role ' + userRole });
      }

      if (found) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === p.id) {
            sheet.getRange(i + 1, 1, 1, 14).setValues([[
              p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
              p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
              p.wholesalePriceBag, p.costPricePerBag, p.retailPriceBag || 0
            ]]);
            break;
          }
        }
      } else {
        sheet.appendRow([
          p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
          p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
          p.wholesalePriceBag, p.costPricePerBag, p.retailPriceBag || 0
        ]);
      }
      return createResponse({ status: 'success', message: 'Product inventory saved to sheet' });
    }

    // --- User Operations ---
    if (action === 'createUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'create_user')) {
        return createResponse({ status: 'error', message: 'Permission denied: create_user is disabled for role ' + userRole });
      }
      const user = body.user;
      const tempPass = body.tempPassword || '';
      const resetLink = body.resetLink || '';

      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const uData = userSheet.getDataRange().getValues();
        let foundIdx = -1;
        const normEmail = (user.email || '').toLowerCase().trim();
        const rawPhone = (user.phone || '').replace(/\D/g, '');
        const normPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

        for (let i = 1; i < uData.length; i++) {
          const rowEmail = (uData[i][2] || '').toString().toLowerCase().trim();
          const rowRawPhone = (uData[i][3] || '').toString().replace(/\D/g, '');
          const rowPhone = rowRawPhone.length > 10 ? rowRawPhone.slice(-10) : rowRawPhone;

          if (uData[i][0] === user.id || (normEmail && rowEmail === normEmail) || (normPhone && normPhone.length === 10 && rowPhone === normPhone)) {
            foundIdx = i + 1;
            break;
          }
        }

        const rowValues = [
          user.id,
          user.name,
          user.email,
          user.phone,
          user.role,
          'APPROVED',
          new Date().toISOString(),
          user.passwordHash || ''
        ];

        if (foundIdx !== -1) {
          userSheet.getRange(foundIdx, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          userSheet.appendRow(rowValues);
        }
        deduplicateUsersTable(ss);
      }

      // Send automated email with credentials and direct password setup link
      if (user.email) {
        try {
          var emailBody = 'Hello ' + user.name + ',\n\n' +
            'Your account for Kaatha Wholesale has been created by the administrator.\n\n' +
            'Role: ' + user.role + '\n' +
            'Email: ' + user.email + '\n';

          if (tempPass) {
            emailBody += 'Temporary Password: ' + tempPass + '\n\n';
          }
          if (resetLink) {
            emailBody += 'Direct Password Setup Link:\n' + resetLink + '\n\n';
          }
          emailBody += 'Security Notice: Please sign in with your temporary password and set your permanent password on initial login.\n\n' +
            'Regards,\nKaatha Wholesale Enterprise';

          MailApp.sendEmail({
            to: user.email,
            subject: 'Kaatha Wholesale - Your Account Credentials & Password Setup',
            body: emailBody
          });
        } catch (mailErr) {
          console.warn('MailApp createUser error:', mailErr);
        }
      }

      return createResponse({ 
        status: 'success', 
        message: 'User created in database with temporary credentials and notification email dispatched',
        userId: user.id 
      });
    }

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

      // 2. Register or update in Users sheet with hashed password
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const uData = userSheet.getDataRange().getValues();
        let foundIdx = -1;
        const normEmail = (user.email || '').toLowerCase().trim();
        const rawPhone = (user.phone || '').replace(/\D/g, '');
        const normPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

        for (let i = 1; i < uData.length; i++) {
          const rowEmail = (uData[i][2] || '').toString().toLowerCase().trim();
          const rowRawPhone = (uData[i][3] || '').toString().replace(/\D/g, '');
          const rowPhone = rowRawPhone.length > 10 ? rowRawPhone.slice(-10) : rowRawPhone;

          if (uData[i][0] === user.id || (normEmail && rowEmail === normEmail) || (normPhone && normPhone.length === 10 && rowPhone === normPhone)) {
            foundIdx = i + 1;
            break;
          }
        }

        const rowValues = [
          user.id,
          user.name,
          user.email,
          user.phone,
          user.role,
          user.status || 'PENDING_APPROVAL',
          new Date().toISOString(),
          user.passwordHash || ''
        ];

        if (foundIdx !== -1) {
          userSheet.getRange(foundIdx, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          userSheet.appendRow(rowValues);
        }
        deduplicateUsersTable(ss);
      }

      // 3. Send automated confirmation email with temporary password
      if (tempPass && user.email) {
        try {
          MailApp.sendEmail({
            to: user.email,
            subject: 'Kaatha Wholesale - Access Request & Temporary Sign-In Code',
            body: 'Hello ' + user.name + ',\n\n' +
                  'Your registration request for Kaatha Wholesale has been received.\n\n' +
                  'Temporary Password: ' + tempPass + '\n\n' +
                  'Security Notice: For your account protection, you will be required to choose a new permanent password on your first sign-in.\n\n' +
                  'Regards,\nKaatha Wholesale Enterprise'
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
      const { email, resetLink, resetToken, expiresAt, name, tempPassword, passwordHash } = body;
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

      if (email) {
        try {
          if (resetLink) {
            MailApp.sendEmail({
              to: email,
              subject: 'Kaatha Wholesale - Password Reset Link',
              body: 'Hello ' + (name ? name : '') + ',\n\n' +
                    'A password reset request was initiated for your Kaatha Wholesale account.\n\n' +
                    'Please click the unique link below to reset your password:\n' +
                    resetLink + '\n\n' +
                    'Security Notice: This link is valid for 1 hour. If you did not make this request, you can safely ignore this email.\n\n' +
                    'Regards,\nKaatha Wholesale Enterprise'
            });
          } else if (tempPassword) {
            MailApp.sendEmail({
              to: email,
              subject: 'Kaatha Wholesale - Temporary Password Reset Code',
              body: 'Hello,\n\n' +
                    'A password reset request was initiated for your Kaatha Wholesale account.\n\n' +
                    'Your Temporary Password: ' + tempPassword + '\n\n' +
                    'Please sign in with this temporary password. You will be prompted immediately to set your new permanent password.\n\n' +
                    'Regards,\nKaatha Wholesale Enterprise'
            });
          }
        } catch (mailErr) {
          console.warn('Password reset email error:', mailErr);
        }
      }
      return createResponse({ status: 'success', message: 'Password reset link dispatched to email' });
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
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'approve_user')) {
        return createResponse({ status: 'error', message: 'Permission denied: approve_user is disabled for role ' + userRole });
      }
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

    if (action === 'updateUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'edit_user')) {
        return createResponse({ status: 'error', message: 'Permission denied: edit_user is disabled for role ' + userRole });
      }
      const { userId, name, role, status } = body;
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const data = userSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === userId) {
            if (name) userSheet.getRange(i + 1, 2).setValue(name);
            if (role) userSheet.getRange(i + 1, 5).setValue(role);
            if (status) userSheet.getRange(i + 1, 6).setValue(status);
            deduplicateUsersTable(ss);
            return createResponse({ status: 'success', message: 'User updated successfully' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'User not found' });
    }

    if (action === 'deleteUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'delete_user')) {
        return createResponse({ status: 'error', message: 'Permission denied: delete_user is disabled for role ' + userRole });
      }
      const { userId } = body;
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const data = userSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === userId) {
            userSheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'User deleted successfully' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'User not found' });
    }

    if (action === 'cleanDuplicateUsers') {
      const stats = deduplicateUsersTable(ss);
      return createResponse({ status: 'success', message: 'Deduplicated users table', stats });
    }

    if (action === 'deleteProduct') {
      if (!checkBackendPermission(ss, userRole, 'stock_page', 'delete_product')) {
        return createResponse({ status: 'error', message: 'Permission denied: delete_product is disabled for role ' + userRole });
      }
      const { productId } = body;
      const sheet = ss.getSheetByName('Master_Products');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === productId) {
            sheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Product deleted' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'Product not found' });
    }

    if (action === 'deleteCustomer') {
      if (!checkBackendPermission(ss, userRole, 'customers_page', 'delete_customer')) {
        return createResponse({ status: 'error', message: 'Permission denied: delete_customer is disabled for role ' + userRole });
      }
      const { customerId } = body;
      const sheet = ss.getSheetByName('Master_Customers');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === customerId) {
            sheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Customer deleted' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'Customer not found' });
    }

    if (action === 'deleteSupplier') {
      if (!checkBackendPermission(ss, userRole, 'suppliers_page', 'delete_supplier')) {
        return createResponse({ status: 'error', message: 'Permission denied: delete_supplier is disabled for role ' + userRole });
      }
      const { supplierId } = body;
      const sheet = ss.getSheetByName('Master_Suppliers');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === supplierId) {
            sheet.deleteRow(i + 1);
            return createResponse({ status: 'success', message: 'Supplier deleted' });
          }
        }
      }
      return createResponse({ status: 'error', message: 'Supplier not found' });
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

      // Update Users (clean deduplicated records)
      const userSheet = ss.getSheetByName('Users');
      if (userSheet && users.length > 0) {
        if (userSheet.getLastRow() > 1) {
          userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 8).clearContent();
        }
        const uRows = users.map(u => [
          u.id, u.name, u.email, u.phone, u.role, u.status || 'APPROVED', u.createdAt || new Date().toISOString(), u.passwordHash || ''
        ]);
        userSheet.getRange(2, 1, uRows.length, 8).setValues(uRows);
        deduplicateUsersTable(ss);
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
