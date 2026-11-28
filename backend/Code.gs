/**
 * KAATHA WHOLESALE – GOOGLE APPS SCRIPT SERVERLESS BACKEND (v3 — Repository + Constraint Engine)
 *
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Paste this code into Code.gs, replacing any existing code.
 * 4. Click Deploy > Manage deployments > Edit > New version > Deploy.
 *    (Or Deploy > New deployment > Web app > Execute as "Me", Access "Anyone").
 * 5. Copy the deployed Web App URL into Kaatha Wholesale settings.
 */

// Temporary hold on outbound emails until a dedicated SMTP server is configured
const ENABLE_EMAIL_DELIVERY = false;

var ERROR_CODES = {
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  CHECK_CONSTRAINT_FAILED: 'CHECK_CONSTRAINT_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT_STALE_VERSION: 'CONFLICT_STALE_VERSION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
};

var ORDER_STATUS_TRANSITIONS = {
  PENDING_REVIEW: ['PENDING_REVIEW', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
  APPROVED: ['APPROVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
  DISPATCHED: ['DISPATCHED', 'DELIVERED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED']
};

var AUDIT_COLUMNS = ['version', 'created_at', 'updated_at', 'is_deleted'];

/**
 * Single Source of Truth Schema & Constraint Registry.
 * Designed to map 1:1 to Google Sheets, PostgreSQL, MySQL, MongoDB, or Firestore adapters.
 */
var DB_SCHEMA = {
  Users: {
    primaryKey: 'id',
    columns: ['id', 'name', 'email', 'phone', 'role', 'status', 'createdAt', 'passwordHash', 'requestedRole', 'requestedName', 'mustResetPassword', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['email'], ['phone']],
    foreignKeys: [],
    checks: {
      role: ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'],
      status: ['PENDING_APPROVAL', 'APPROVED', 'DENIED']
    }
  },
  User_Registrations: {
    primaryKey: 'id',
    columns: ['id', 'name', 'email', 'phone', 'requested_role', 'status', 'registered_at', 'temp_password_sent', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [],
    foreignKeys: [],
    checks: {}
  },
  Master_Products: {
    primaryKey: 'id',
    columns: ['id', 'name_en', 'name_te', 'category', 'brand_en', 'brand_te', 'inner_wt_kg', 'inner_count', 'outer_wt_kg', 'stock_physical', 'stock_reserved', 'price_bag', 'cost_bag', 'retail_price_bag', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['name_en', 'brand_en']],
    foreignKeys: [],
    checks: {
      productIntegrity: true
    }
  },
  Master_Customers: {
    primaryKey: 'id',
    columns: ['id', 'name_en', 'name_te', 'phone', 'business_en', 'business_te', 'address_en', 'address_te', 'current_due', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['phone']],
    foreignKeys: [],
    checks: {
      nonNegativeDue: true
    }
  },
  Master_Suppliers: {
    primaryKey: 'id',
    columns: ['id', 'business_en', 'business_te', 'owner_en', 'owner_te', 'bank_name', 'account_no', 'ifsc_code', 'nickname_en', 'nickname_te', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['business_en', 'account_no']],
    foreignKeys: [],
    checks: {}
  },
  Master_Orders_Sales: {
    primaryKey: 'id',
    columns: ['id', 'order_no', 'customer_id', 'customer_name', 'customer_phone', 'date', 'total_bags', 'total_weight_kg', 'subtotal', 'discount', 'grand_total', 'payment_mode', 'status', 'approved_by', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['order_no']],
    foreignKeys: [{ field: 'customer_id', targetTable: 'Master_Customers', targetField: 'id' }],
    checks: {
      orderIntegrity: true
    }
  },
  Pending_Orders: {
    primaryKey: 'id',
    columns: ['id', 'order_no', 'customer_id', 'customer_name', 'date', 'total_bags', 'discount', 'grand_total', 'status', 'submitted_by', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['order_no']],
    foreignKeys: [{ field: 'customer_id', targetTable: 'Master_Customers', targetField: 'id' }],
    checks: {
      orderIntegrity: true
    }
  },
  Order_Items: {
    primaryKey: 'id',
    columns: ['id', 'order_id', 'product_id', 'unit_type', 'quantity', 'rate_per_unit', 'line_total', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [],
    foreignKeys: [
      { field: 'order_id', targetTable: 'Master_Orders_Sales', targetField: 'id', altTargetTable: 'Pending_Orders' },
      { field: 'product_id', targetTable: 'Master_Products', targetField: 'id' }
    ],
    checks: {
      positiveQty: true
    }
  },
  Master_Purchases: {
    primaryKey: 'id',
    columns: ['id', 'purchase_no', 'supplier_id', 'date', 'total_bags', 'grand_total', 'reference_bill', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [['purchase_no']],
    foreignKeys: [{ field: 'supplier_id', targetTable: 'Master_Suppliers', targetField: 'id' }],
    checks: {
      nonNegativeGrandTotal: true
    }
  },
  Role_Permissions: {
    primaryKey: 'role',
    columns: ['role', 'config_json', 'updated_by', 'version', 'created_at', 'updated_at', 'is_deleted'],
    uniqueKeys: [],
    foreignKeys: [],
    checks: {
      role: ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER']
    }
  }
};

function createConstraintError(code, message) {
  var err = new Error(message);
  err.code = code;
  err.isConstraintError = true;
  return err;
}

function normalizeEmailValue(val) {
  var s = (val || '').toString().trim().toLowerCase();
  if (s.endsWith('@gmail')) s += '.com';
  return s;
}

function normalizePhoneValue(val) {
  var digits = (val || '').toString().replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeFieldValue(tableName, field, val) {
  if (val === undefined || val === null) return '';
  if (field === 'email') return normalizeEmailValue(val);
  if (field === 'phone' && (tableName === 'Users' || tableName === 'Master_Customers')) {
    return normalizePhoneValue(val);
  }
  return val.toString().trim().toLowerCase();
}

function nextBusinessNumber(prefix) {
  var props = PropertiesService.getScriptProperties();
  var year = new Date().getFullYear();
  var propKey = 'SEQ_' + prefix + '_' + year;
  var current = Number(props.getProperty(propKey) || '0');
  var next = current + 1;
  props.setProperty(propKey, String(next));
  var padded = ('0000' + next).slice(-4);
  return prefix + '-' + year + '-' + padded;
}

function getManagedTableNames() {
  return Object.keys(DB_SCHEMA);
}

function ensureSheetHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fed7aa');
    sheet.setFrozenRows(1);
    return;
  }
  var maxCol = Math.max(sheet.getLastColumn(), headers.length);
  if (maxCol > 0) {
    var currentHeaders = sheet.getRange(1, 1, 1, maxCol).getValues()[0];
    headers.forEach(function(h, idx) {
      if (!currentHeaders[idx] || currentHeaders[idx].toString().trim() === '') {
        sheet.getRange(1, idx + 1).setValue(h).setFontWeight('bold').setBackground('#fed7aa');
      }
    });
  }
}

function getIndexSheet(ss) {
  var idxSheet = ss.getSheetByName('_Indexes');
  if (!idxSheet) {
    idxSheet = ss.insertSheet('_Indexes');
    idxSheet.appendRow(['index_key', 'table_name', 'field_key', 'lookup_value', 'row_index', 'updated_at']);
    idxSheet.setFrozenRows(1);
  }
  return idxSheet;
}

/**
 * Constraint Engine: validates CHECKs, state transitions, PK/UK uniqueness, FKs, and delete referential integrity.
 */
var ConstraintEngine = {
  validateChecks: function(tableName, record, existingRecord) {
    var schema = DB_SCHEMA[tableName];
    if (!schema || !schema.checks) return;
    var checks = schema.checks;

    if (checks.role && record.role !== undefined && checks.role.indexOf(record.role) === -1) {
      throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'Invalid role "' + record.role + '" for ' + tableName);
    }
    if (checks.status && record.status !== undefined && checks.status.indexOf(record.status) === -1) {
      throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'Invalid status "' + record.status + '" for ' + tableName);
    }

    if (checks.productIntegrity) {
      var innerWt = Number(record.inner_wt_kg);
      var innerCnt = Number(record.inner_count);
      var physical = Number(record.stock_physical || 0);
      var reserved = Number(record.stock_reserved || 0);
      var costBag = Number(record.cost_bag || 0);
      var priceBag = Number(record.price_bag || 0);
      var retailBag = Number(record.retail_price_bag || 0);

      if (!(innerWt > 0)) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'inner_wt_kg must be > 0');
      }
      if (!(innerCnt >= 1)) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'inner_count must be >= 1');
      }
      if (physical < 0 || reserved < 0) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'stock_physical and stock_reserved must be >= 0');
      }
      if (reserved > physical) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'stock_reserved cannot exceed stock_physical');
      }
      if (costBag > priceBag) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'cost_bag cannot exceed price_bag');
      }
      if (retailBag > 0 && priceBag > retailBag) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'price_bag cannot exceed retail_price_bag');
      }
    }

    if (checks.nonNegativeDue) {
      if (Number(record.current_due || 0) < 0) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'current_due must be >= 0');
      }
    }

    if (checks.nonNegativeGrandTotal) {
      if (Number(record.grand_total || 0) < 0) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'grand_total must be >= 0');
      }
    }

    if (checks.positiveQty) {
      if (!(Number(record.quantity || 0) > 0)) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'Order item quantity must be > 0');
      }
    }

    if (checks.orderIntegrity) {
      if (Number(record.grand_total || 0) < 0) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'grand_total must be >= 0');
      }
      var validStatuses = Object.keys(ORDER_STATUS_TRANSITIONS);
      var nextStatus = record.status || 'PENDING_REVIEW';
      if (validStatuses.indexOf(nextStatus) === -1) {
        throw createConstraintError(ERROR_CODES.CHECK_CONSTRAINT_FAILED, 'Invalid order status: ' + nextStatus);
      }
      if (existingRecord && existingRecord.status) {
        var allowedNext = ORDER_STATUS_TRANSITIONS[existingRecord.status] || [];
        if (allowedNext.indexOf(nextStatus) === -1) {
          throw createConstraintError(
            ERROR_CODES.CHECK_CONSTRAINT_FAILED,
            'Invalid order status transition from ' + existingRecord.status + ' to ' + nextStatus
          );
        }
      }
    }
  },

  validateUniqueness: function(repo, tableName, record, excludePk) {
    var schema = DB_SCHEMA[tableName];
    if (!schema) return;
    var pkField = schema.primaryKey;
    var pkVal = record[pkField];
    if (pkVal && !excludePk) {
      var existingByPk = repo.findById(tableName, pkVal);
      if (existingByPk) {
        throw createConstraintError(ERROR_CODES.DUPLICATE_KEY, tableName + ' duplicate primary key: ' + pkVal);
      }
    }

    var uniqueKeys = schema.uniqueKeys || [];
    for (var i = 0; i < uniqueKeys.length; i++) {
      var keyFields = uniqueKeys[i];
      var allPresent = true;
      var parts = [];
      for (var j = 0; j < keyFields.length; j++) {
        var f = keyFields[j];
        var norm = normalizeFieldValue(tableName, f, record[f]);
        if (!norm) {
          allPresent = false;
          break;
        }
        parts.push(norm);
      }
      if (!allPresent) continue;

      var compositeVal = parts.join('|');
      var hit = repo.findByUniqueIndex(tableName, keyFields, compositeVal);
      if (hit && (!excludePk || String(hit[pkField]) !== String(excludePk))) {
        throw createConstraintError(
          ERROR_CODES.DUPLICATE_KEY,
          tableName + ' duplicate unique key (' + keyFields.join(' + ') + '): ' + compositeVal
        );
      }
    }
  },

  validateForeignKeys: function(repo, tableName, record) {
    var schema = DB_SCHEMA[tableName];
    if (!schema || !schema.foreignKeys) return;
    for (var i = 0; i < schema.foreignKeys.length; i++) {
      var fk = schema.foreignKeys[i];
      var fkVal = record[fk.field];
      if (fkVal === undefined || fkVal === null || fkVal === '') {
        throw createConstraintError(
          ERROR_CODES.FOREIGN_KEY_VIOLATION,
          tableName + '.' + fk.field + ' is required and must reference ' + fk.targetTable + '.' + fk.targetField
        );
      }
      var parent = repo.findById(fk.targetTable, fkVal);
      if (!parent && fk.altTargetTable) {
        parent = repo.findById(fk.altTargetTable, fkVal);
      }
      if (!parent) {
        throw createConstraintError(
          ERROR_CODES.FOREIGN_KEY_VIOLATION,
          'Foreign key violation: ' + tableName + '.' + fk.field + ' (' + fkVal + ') not found in ' + fk.targetTable
        );
      }
    }
  },

  checkDeleteReferentialIntegrity: function(repo, tableName, pkVal) {
    var allTables = Object.keys(DB_SCHEMA);
    for (var i = 0; i < allTables.length; i++) {
      var childTable = allTables[i];
      var fks = DB_SCHEMA[childTable].foreignKeys || [];
      for (var j = 0; j < fks.length; j++) {
        var fk = fks[j];
        if (fk.targetTable === tableName || fk.altTargetTable === tableName) {
          var where = {};
          where[fk.field] = pkVal;
          var children = repo.query(childTable, { where: where, limit: 1 });
          if (children.total > 0) {
            throw createConstraintError(
              ERROR_CODES.FOREIGN_KEY_VIOLATION,
              'Cannot delete ' + tableName + ' (' + pkVal + '): referenced by active record in ' + childTable
            );
          }
        }
      }
    }
  }
};

/**
 * Google Sheets Repository Adapter implementing the Database-Agnostic Repository Interface:
 *   findById, findOne, query, insert, update, softDelete, transaction
 * Uses LockService.getScriptLock() for concurrency and CacheService + _Indexes for O(1) lookups.
 */
function createSheetsRepository(ss) {
  var cache = CacheService.getScriptCache();

  function getSheetAndHeaders(tableName) {
    var schema = DB_SCHEMA[tableName];
    if (!schema) throw new Error('Unknown table: ' + tableName);
    var sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      ensureSheetHeaders(sheet, schema.columns);
    }
    var lastCol = Math.max(sheet.getLastColumn(), schema.columns.length);
    var headers = sheet.getLastRow() >= 1
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : schema.columns.slice();
    return { sheet: sheet, headers: headers, schema: schema };
  }

  function rowToObject(headers, row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h) obj[h] = row[i];
    }
    return obj;
  }

  function objectToRow(headers, obj) {
    return headers.map(function(h) {
      return obj[h] !== undefined ? obj[h] : '';
    });
  }

  function isRowDeleted(obj) {
    return obj.is_deleted === true || obj.is_deleted === 'true';
  }

  function makeIndexCacheKey(tableName, fieldKey, lookupVal) {
    return 'idx:' + tableName + ':' + fieldKey + ':' + lookupVal;
  }

  function getIndexedRow(tableName, fieldKey, lookupVal) {
    var cacheKey = makeIndexCacheKey(tableName, fieldKey, lookupVal);
    var cached = cache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      var num = Number(cached);
      if (num >= 2) return num;
    }
    return null;
  }

  function setIndexedRow(tableName, fieldKey, lookupVal, rowIndex) {
    var cacheKey = makeIndexCacheKey(tableName, fieldKey, lookupVal);
    cache.put(cacheKey, String(rowIndex), 300);
  }

  function invalidateRecordIndexes(tableName, record) {
    var schema = DB_SCHEMA[tableName];
    if (!schema || !record) return;
    var keys = [];
    var pkField = schema.primaryKey;
    if (record[pkField]) {
      keys.push(makeIndexCacheKey(tableName, pkField, String(record[pkField])));
    }
    var uks = schema.uniqueKeys || [];
    for (var i = 0; i < uks.length; i++) {
      var fields = uks[i];
      var parts = fields.map(function(f) { return normalizeFieldValue(tableName, f, record[f]); });
      if (parts.every(Boolean)) {
        keys.push(makeIndexCacheKey(tableName, fields.join('+'), parts.join('|')));
      }
    }
    if (keys.length > 0) cache.removeAll(keys);
  }

  function writeRecordIndexes(tableName, record, rowIndex) {
    var schema = DB_SCHEMA[tableName];
    if (!schema || !record) return;
    var pkField = schema.primaryKey;
    if (record[pkField]) {
      setIndexedRow(tableName, pkField, String(record[pkField]), rowIndex);
    }
    var uks = schema.uniqueKeys || [];
    for (var i = 0; i < uks.length; i++) {
      var fields = uks[i];
      var parts = fields.map(function(f) { return normalizeFieldValue(tableName, f, record[f]); });
      if (parts.every(Boolean)) {
        setIndexedRow(tableName, fields.join('+'), parts.join('|'), rowIndex);
      }
    }
  }

  var repo = {
    findById: function(tableName, id, options) {
      if (id === undefined || id === null || id === '') return null;
      var includeDeleted = options && options.includeDeleted;
      var info = getSheetAndHeaders(tableName);
      var sheet = info.sheet;
      var headers = info.headers;
      var pkField = info.schema.primaryKey;
      var pkIdx = headers.indexOf(pkField);
      if (sheet.getLastRow() <= 1 || pkIdx === -1) return null;

      // 1. O(1) CacheService index probe
      var cachedRowIdx = getIndexedRow(tableName, pkField, String(id));
      if (cachedRowIdx && cachedRowIdx <= sheet.getLastRow()) {
        var singleRow = sheet.getRange(cachedRowIdx, 1, 1, headers.length).getValues()[0];
        if (String(singleRow[pkIdx]) === String(id)) {
          var cachedObj = rowToObject(headers, singleRow);
          if (!includeDeleted && isRowDeleted(cachedObj)) return null;
          cachedObj._rowIndex = cachedRowIdx;
          return cachedObj;
        }
      }

      // 2. Fallback scan & populate index
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][pkIdx]) === String(id)) {
          var obj = rowToObject(headers, data[i]);
          writeRecordIndexes(tableName, obj, i + 1);
          if (!includeDeleted && isRowDeleted(obj)) return null;
          obj._rowIndex = i + 1;
          return obj;
        }
      }
      return null;
    },

    findByUniqueIndex: function(tableName, keyFields, compositeVal) {
      var info = getSheetAndHeaders(tableName);
      var sheet = info.sheet;
      var headers = info.headers;
      if (sheet.getLastRow() <= 1) return null;
      var fieldKey = keyFields.join('+');

      var cachedRowIdx = getIndexedRow(tableName, fieldKey, compositeVal);
      if (cachedRowIdx && cachedRowIdx <= sheet.getLastRow()) {
        var singleRow = sheet.getRange(cachedRowIdx, 1, 1, headers.length).getValues()[0];
        var cachedObj = rowToObject(headers, singleRow);
        var cachedParts = keyFields.map(function(f) { return normalizeFieldValue(tableName, f, cachedObj[f]); });
        if (cachedParts.join('|') === compositeVal && !isRowDeleted(cachedObj)) {
          cachedObj._rowIndex = cachedRowIdx;
          return cachedObj;
        }
      }

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var obj = rowToObject(headers, data[i]);
        if (isRowDeleted(obj)) continue;
        var parts = keyFields.map(function(f) { return normalizeFieldValue(tableName, f, obj[f]); });
        if (parts.every(Boolean) && parts.join('|') === compositeVal) {
          writeRecordIndexes(tableName, obj, i + 1);
          obj._rowIndex = i + 1;
          return obj;
        }
      }
      return null;
    },

    findOne: function(tableName, where, options) {
      var res = repo.query(tableName, { where: where, limit: 1, includeDeleted: options && options.includeDeleted });
      return res.rows.length > 0 ? res.rows[0] : null;
    },

    query: function(tableName, opts) {
      opts = opts || {};
      var info = getSheetAndHeaders(tableName);
      var sheet = info.sheet;
      var headers = info.headers;
      if (sheet.getLastRow() <= 1) {
        return { rows: [], total: 0, limit: opts.limit || 50, offset: opts.offset || 0 };
      }

      var data = sheet.getDataRange().getValues();
      var where = opts.where || {};
      var whereKeys = Object.keys(where);
      var matched = [];

      for (var i = 1; i < data.length; i++) {
        var obj = rowToObject(headers, data[i]);
        if (!opts.includeDeleted && isRowDeleted(obj)) continue;

        var ok = true;
        for (var k = 0; k < whereKeys.length; k++) {
          var key = whereKeys[k];
          var expected = where[key];
          if (expected === undefined) continue;
          if (String(obj[key]) !== String(expected)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          obj._rowIndex = i + 1;
          matched.push(obj);
        }
      }

      if (opts.sortBy) {
        var sortField = opts.sortBy;
        var dir = (opts.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
        matched.sort(function(a, b) {
          var va = a[sortField];
          var vb = b[sortField];
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va || '').localeCompare(String(vb || '')) * dir;
        });
      }

      var total = matched.length;
      var offset = Math.max(0, Number(opts.offset || 0));
      var limit = opts.limit !== undefined ? Math.max(1, Number(opts.limit)) : total || 50;
      var paged = matched.slice(offset, offset + limit);

      return { rows: paged, total: total, limit: limit, offset: offset };
    },

    insert: function(tableName, payload, options) {
      return repo.transaction(function() {
        var info = getSheetAndHeaders(tableName);
        var schema = info.schema;
        var pkField = schema.primaryKey;
        var now = new Date().toISOString();
        var record = Object.assign({}, payload);

        // Server-controlled ID generation for new records
        if (pkField === 'id' && !(options && options.preserveId)) {
          record.id = Utilities.getUuid();
        }

        record.version = 1;
        record.created_at = record.created_at || now;
        record.updated_at = now;
        record.is_deleted = false;

        ConstraintEngine.validateChecks(tableName, record, null);
        ConstraintEngine.validateUniqueness(repo, tableName, record, null);
        ConstraintEngine.validateForeignKeys(repo, tableName, record);

        if ((tableName === 'Master_Orders_Sales' || tableName === 'Pending_Orders') && !(options && options.preserveBusinessNo)) {
          record.order_no = nextBusinessNumber('ORD');
        }
        if (tableName === 'Master_Purchases' && !(options && options.preserveBusinessNo)) {
          record.purchase_no = nextBusinessNumber('PUR');
        }

        var rowValues = objectToRow(info.headers, record);
        info.sheet.appendRow(rowValues);
        var newRowIdx = info.sheet.getLastRow();
        writeRecordIndexes(tableName, record, newRowIdx);
        record._rowIndex = newRowIdx;
        return record;
      });
    },

    update: function(tableName, id, patch, expectedVersion) {
      return repo.transaction(function() {
        var existing = repo.findById(tableName, id);
        if (!existing) {
          throw createConstraintError(ERROR_CODES.NOT_FOUND, tableName + ' record not found: ' + id);
        }
        if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== '') {
          var curVer = Number(existing.version || 1);
          if (Number(expectedVersion) !== curVer) {
            throw createConstraintError(
              ERROR_CODES.CONFLICT_STALE_VERSION,
              'Stale version conflict on ' + tableName + ' (' + id + '): expected ' + expectedVersion + ', current ' + curVer
            );
          }
        }

        var now = new Date().toISOString();
        var updated = Object.assign({}, existing, patch);
        delete updated._rowIndex;
        updated[DB_SCHEMA[tableName].primaryKey] = existing[DB_SCHEMA[tableName].primaryKey];
        updated.version = Number(existing.version || 1) + 1;
        updated.created_at = existing.created_at || now;
        updated.updated_at = now;
        updated.is_deleted = existing.is_deleted === true || existing.is_deleted === 'true';

        ConstraintEngine.validateChecks(tableName, updated, existing);
        ConstraintEngine.validateUniqueness(repo, tableName, updated, id);
        ConstraintEngine.validateForeignKeys(repo, tableName, updated);

        invalidateRecordIndexes(tableName, existing);
        var info = getSheetAndHeaders(tableName);
        var rowValues = objectToRow(info.headers, updated);
        info.sheet.getRange(existing._rowIndex, 1, 1, info.headers.length).setValues([rowValues]);
        writeRecordIndexes(tableName, updated, existing._rowIndex);
        updated._rowIndex = existing._rowIndex;
        return updated;
      });
    },

    softDelete: function(tableName, id, expectedVersion) {
      return repo.transaction(function() {
        var existing = repo.findById(tableName, id);
        if (!existing) {
          throw createConstraintError(ERROR_CODES.NOT_FOUND, tableName + ' record not found: ' + id);
        }
        if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== '') {
          var curVer = Number(existing.version || 1);
          if (Number(expectedVersion) !== curVer) {
            throw createConstraintError(
              ERROR_CODES.CONFLICT_STALE_VERSION,
              'Stale version conflict on ' + tableName + ' (' + id + '): expected ' + expectedVersion + ', current ' + curVer
            );
          }
        }

        ConstraintEngine.checkDeleteReferentialIntegrity(repo, tableName, id);

        var now = new Date().toISOString();
        var deleted = Object.assign({}, existing, {
          is_deleted: true,
          version: Number(existing.version || 1) + 1,
          updated_at: now
        });
        delete deleted._rowIndex;

        invalidateRecordIndexes(tableName, existing);
        var info = getSheetAndHeaders(tableName);
        var rowValues = objectToRow(info.headers, deleted);
        info.sheet.getRange(existing._rowIndex, 1, 1, info.headers.length).setValues([rowValues]);
        return deleted;
      });
    },

    transaction: function(fn) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        return fn();
      } finally {
        lock.releaseLock();
      }
    }
  };

  return repo;
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tableNames = getManagedTableNames();

  for (var i = 0; i < tableNames.length; i++) {
    var sheetName = tableNames[i];
    var headers = DB_SCHEMA[sheetName].columns;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    ensureSheetHeaders(sheet, headers);
  }

  getIndexSheet(ss);

  // Pre-seed Master Admin if Users sheet is empty and ScriptProperties are configured
  var userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() === 1) {
    var props = PropertiesService.getScriptProperties();
    var initEmail = (props.getProperty('INITIAL_ADMIN_EMAIL') || '').toString().trim().toLowerCase();
    var initHash = (props.getProperty('INITIAL_ADMIN_PASSWORD_HASH') || '').toString().trim();
    if (initEmail && initHash) {
      var now = new Date().toISOString();
      userSheet.appendRow([
        '00000000-0000-0000-0000-000000000001',
        props.getProperty('INITIAL_ADMIN_NAME') || 'Administrator',
        initEmail,
        props.getProperty('INITIAL_ADMIN_PHONE') || '9999999999',
        'ADMIN',
        'APPROVED',
        now,
        initHash,
        '',
        '',
        false,
        1,
        now,
        now,
        false
      ]);
    }
  }

  // Ensure JWT signing secret is initialized in ScriptProperties
  getJwtSecret();

  // Pre-seed default Role_Permissions if empty
  var permSheet = ss.getSheetByName('Role_Permissions');
  if (permSheet && permSheet.getLastRow() === 1) {
    var roles = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
    var permNow = new Date().toISOString();
    roles.forEach(function(r) {
      permSheet.appendRow([r, JSON.stringify(DEFAULT_BACKEND_ROLE_PERMISSIONS[r]), 'SYSTEM', 1, permNow, permNow, false]);
    });
  }

  // Auto-seed deterministic "Walk-In Customer" so counter-cash orders never violate FK
  var custSheet = ss.getSheetByName('Master_Customers');
  if (custSheet) {
    var walkInId = '00000000-0000-0000-0000-000000000002';
    var custRows = custSheet.getDataRange().getValues();
    var hasWalkIn = false;
    for (var ci = 1; ci < custRows.length; ci++) {
      if (String(custRows[ci][0]) === walkInId) {
        hasWalkIn = true;
        break;
      }
    }
    if (!hasWalkIn) {
      var walkInNow = new Date().toISOString();
      custSheet.appendRow([
        walkInId,
        'Walk-In Customer',
        'వాక్-ఇన్ కస్టమర్',
        '0000000000',
        'Counter Cash Sale',
        'కౌంటర్ నగదు అమ్మకం',
        'Counter',
        'కౌంటర్',
        0,
        1,
        walkInNow,
        walkInNow,
        false
      ]);
    }
  }

  deduplicateUsersTable(ss);
  lockDatabaseSheets(ss, tableNames);
}

/**
 * Deduplicates user rows in Users sheet based on unique email and phone numbers,
 * preserving only the latest, cleanest record and removing all duplicate rows.
 */
function deduplicateUsersTable(ss) {
  var userSheet = ss.getSheetByName('Users');
  if (!userSheet || userSheet.getLastRow() <= 1) return { removed: 0, total: 0 };

  var data = userSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  var emailIdx = headers.indexOf('email') !== -1 ? headers.indexOf('email') : 2;
  var phoneIdx = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : 3;

  var seenEmails = {};
  var seenPhones = {};
  var uniqueRows = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var email = normalizeEmailValue(row[emailIdx]);
    var phone = normalizePhoneValue(row[phoneIdx]);

    if (!email && !phone) continue;
    if ((email && seenEmails[email]) || (phone && phone.length === 10 && seenPhones[phone])) {
      continue;
    }

    if (email) seenEmails[email] = true;
    if (phone && phone.length === 10) seenPhones[phone] = true;
    uniqueRows.unshift(row);
  }

  var removedCount = rows.length - uniqueRows.length;
  if (removedCount > 0) {
    var cols = headers.length;
    userSheet.getRange(2, 1, userSheet.getLastRow() - 1, cols).clearContent();
    if (uniqueRows.length > 0) {
      userSheet.getRange(2, 1, uniqueRows.length, cols).setValues(uniqueRows);
    }
  }

  return { removed: removedCount, total: uniqueRows.length };
}

function lockDatabaseSheets(ss, sheetNames) {
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      if (protections.length === 0) {
        try {
          var protection = sheet.protect().setDescription('Kaatha Wholesale Managed - Locked by Default');
          protection.setWarningOnly(false);
          var me = Session.getEffectiveUser();
          if (me) {
            protection.removeEditors(protection.getEditors());
            protection.addEditor(me);
          }
        } catch (err) {
          try {
            var p2 = sheet.protect().setDescription('Kaatha Wholesale Managed - Protected');
            p2.setWarningOnly(true);
          } catch (innerErr) {}
        }
      }
    }
  }
}

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
    ensureSheetHeaders(sheet, DB_SCHEMA.Role_Permissions.columns);
    var roles = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
    var now = new Date().toISOString();
    roles.forEach(function(r) {
      sheet.appendRow([r, JSON.stringify(DEFAULT_BACKEND_ROLE_PERMISSIONS[r]), 'SYSTEM', 1, now, now, false]);
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

function getJwtSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

function base64UrlEncode(input) {
  var bytes = typeof input === 'string'
    ? Utilities.newBlob(input).getBytes()
    : input;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function base64UrlDecodeString(str) {
  var pad = str.length % 4;
  var padded = str + (pad === 2 ? '==' : pad === 3 ? '=' : '');
  var bytes = Utilities.base64DecodeWebSafe(padded);
  return Utilities.newBlob(bytes).getDataAsString('UTF-8');
}

function signJwt(payloadObj) {
  var header = { alg: 'HS256', typ: 'JWT' };
  var iat = Math.floor(Date.now() / 1000);
  var exp = iat + 3600;
  var fullPayload = Object.assign({}, payloadObj, { iat: iat, exp: exp });

  var headerB64 = base64UrlEncode(JSON.stringify(header));
  var payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  var signingInput = headerB64 + '.' + payloadB64;

  var sigBytes = Utilities.computeHmacSha256Signature(signingInput, getJwtSecret());
  var sigB64 = base64UrlEncode(sigBytes);
  return signingInput + '.' + sigB64;
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', error: 'Missing authentication token' };
  }
  var parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, code: 'UNAUTHORIZED', error: 'Malformed authentication token' };
  }
  try {
    var signingInput = parts[0] + '.' + parts[1];
    var expectedSigBytes = Utilities.computeHmacSha256Signature(signingInput, getJwtSecret());
    var expectedSigB64 = base64UrlEncode(expectedSigBytes);

    if (parts[2].length !== expectedSigB64.length) {
      return { valid: false, code: 'UNAUTHORIZED', error: 'Invalid token signature' };
    }
    var mismatch = 0;
    for (var i = 0; i < parts[2].length; i++) {
      mismatch |= parts[2].charCodeAt(i) ^ expectedSigB64.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return { valid: false, code: 'UNAUTHORIZED', error: 'Invalid token signature' };
    }

    var payload = JSON.parse(base64UrlDecodeString(parts[1]));
    var nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || nowSec >= Number(payload.exp)) {
      return { valid: false, code: 'TOKEN_EXPIRED', error: 'Your session has expired. Please sign in again.' };
    }

    return { valid: true, payload: payload };
  } catch (e) {
    return { valid: false, code: 'UNAUTHORIZED', error: 'Invalid authentication token' };
  }
}

function findUserRowByEmailOrId(ss, email, id) {
  var repo = createSheetsRepository(ss);
  var user = null;
  if (id) {
    user = repo.findById('Users', id);
  }
  if (!user && email) {
    var normEmail = normalizeEmailValue(email);
    user = repo.findByUniqueIndex('Users', ['email'], normEmail);
  }
  if (!user) return null;

  return {
    rowIndex: user._rowIndex,
    user: {
      id: String(user.id || ''),
      name: String(user.name || ''),
      email: String(user.email || ''),
      phone: String(user.phone || ''),
      role: String(user.role || 'STAFF'),
      status: String(user.status || 'PENDING_APPROVAL'),
      createdAt: String(user.createdAt || new Date().toISOString()),
      passwordHash: String(user.passwordHash || ''),
      requestedRole: user.requestedRole ? String(user.requestedRole) : undefined,
      requestedName: user.requestedName ? String(user.requestedName) : undefined,
      mustResetPassword: user.mustResetPassword === true || user.mustResetPassword === 'true',
      version: Number(user.version || 1)
    }
  };
}

function checkBackendPermission(ss, userRole, pageKey, funcKey) {
  if (!userRole) return false;
  if (userRole === 'OWNER') return true;
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

function getAllActiveData(ss, repo) {
  var result = {};
  var sheetNames = getManagedTableNames();
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    result[name] = repo.query(name, {}).rows.map(function(r) {
      var clean = Object.assign({}, r);
      delete clean._rowIndex;
      return clean;
    });
  }
  result['rolePermissions'] = getOrInitRolePermissions(ss);
  return result;
}

function doGet(e) {
  try {
    setupDatabase();
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var repo = createSheetsRepository(ss);

    if (action === 'ping') {
      return createResponse({
        status: 'ok',
        sheetName: ss.getName(),
        message: 'Kaatha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getData') {
      return createResponse({ status: 'success', data: getAllActiveData(ss, repo) });
    }

    if (action === 'lockSheets') {
      lockDatabaseSheets(ss, getManagedTableNames());
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
    }

    return createResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ status: 'error', code: err.code || undefined, error: err.toString(), message: err.message || err.toString() });
  }
}

function doPost(e) {
  try {
    setupDatabase();
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload received' });
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var repo = createSheetsRepository(ss);

    if (action === 'ping') {
      return createResponse({
        status: 'ok',
        sheetName: ss.getName(),
        message: 'Kaatha Backend is online and connected',
        timestamp: new Date().toISOString()
      });
    }

    // --- Authentication: Login (issues HS256 1-hour JWT) ---
    if (action === 'login') {
      var email = normalizeEmailValue(body.email);
      var passwordHash = (body.passwordHash || '').toString().trim();
      if (!email || !passwordHash) {
        return createResponse({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Email and password are required.' });
      }

      var found = findUserRowByEmailOrId(ss, email, null);
      if (!found) {
        return createResponse({ status: 'error', code: ERROR_CODES.UNAUTHORIZED, message: 'No registered account found with this email address.' });
      }

      var u = found.user;
      if (u.status === 'PENDING_APPROVAL') {
        return createResponse({
          status: 'error',
          code: 'PENDING_APPROVAL',
          message: 'Your account is pending approval by an administrator. Please check back shortly.'
        });
      }
      if (u.status === 'DENIED') {
        return createResponse({
          status: 'error',
          code: 'DENIED',
          message: 'Access has been denied for this account. Contact your administrator.'
        });
      }

      if (!u.passwordHash) {
        return createResponse({ status: 'error', code: ERROR_CODES.UNAUTHORIZED, message: 'Account password is not initialized in database. Please reset your password.' });
      }
      if (u.passwordHash !== passwordHash) {
        return createResponse({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Invalid password. Please verify and try again.' });
      }

      var safeUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        requestedRole: u.requestedRole,
        requestedName: u.requestedName,
        mustResetPassword: u.mustResetPassword,
        version: u.version
      };

      if (u.mustResetPassword) {
        return createResponse({
          status: 'success',
          mustResetPassword: true,
          user: safeUser,
          message: 'Please choose a permanent password to continue.'
        });
      }

      var token = signJwt({
        sub: u.id,
        email: u.email,
        role: u.role,
        status: u.status
      });

      return createResponse({
        status: 'success',
        token: token,
        user: safeUser,
        message: 'Authenticated successfully'
      });
    }

    // --- Authentication: Explicit Token Refresh ---
    if (action === 'refreshToken') {
      var verification = verifyJwt(body.authToken);
      if (!verification.valid) {
        return createResponse({ status: 'error', code: verification.code, message: verification.error });
      }

      var foundUser = findUserRowByEmailOrId(ss, verification.payload.email, verification.payload.sub);
      if (!foundUser || foundUser.user.status !== 'APPROVED') {
        return createResponse({
          status: 'error',
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User account is no longer active or approved.'
        });
      }

      var ru = foundUser.user;
      var freshToken = signJwt({
        sub: ru.id,
        email: ru.email,
        role: ru.role,
        status: ru.status
      });

      return createResponse({
        status: 'success',
        token: freshToken,
        user: {
          id: ru.id,
          name: ru.name,
          email: ru.email,
          phone: ru.phone,
          role: ru.role,
          status: ru.status,
          createdAt: ru.createdAt,
          requestedRole: ru.requestedRole,
          requestedName: ru.requestedName,
          mustResetPassword: ru.mustResetPassword,
          version: ru.version
        },
        message: 'Session token refreshed'
      });
    }

    if (action === 'getData') {
      if (body.authToken) {
        var getAuth = verifyJwt(body.authToken);
        if (!getAuth.valid) {
          return createResponse({ status: 'error', code: getAuth.code, message: getAuth.error });
        }
      }
      return createResponse({ status: 'success', data: getAllActiveData(ss, repo) });
    }

    // Public/pre-auth actions do not require a session JWT; all other mutations require a valid HS256 JWT
    var publicActions = ['registerUser', 'forgotPassword', 'resetPassword'];
    var userRole = 'STAFF';
    if (publicActions.indexOf(action) === -1) {
      var authCheck = verifyJwt(body.authToken);
      if (!authCheck.valid) {
        return createResponse({
          status: 'error',
          code: authCheck.code,
          message: authCheck.error
        });
      }
      userRole = authCheck.payload.role || 'STAFF';
    }

    // --- Generic Indexed Query Endpoint ---
    if (action === 'query') {
      var tableName = body.table;
      if (!DB_SCHEMA[tableName]) {
        return createResponse({ status: 'error', code: ERROR_CODES.CHECK_CONSTRAINT_FAILED, message: 'Unknown table: ' + tableName });
      }
      var queryResult = repo.query(tableName, {
        where: body.where || {},
        sortBy: body.sortBy,
        sortDir: body.sortDir,
        limit: body.limit,
        offset: body.offset,
        includeDeleted: Boolean(body.includeDeleted)
      });
      return createResponse({
        status: 'success',
        rows: queryResult.rows.map(function(r) {
          var c = Object.assign({}, r);
          delete c._rowIndex;
          return c;
        }),
        total: queryResult.total,
        limit: queryResult.limit,
        offset: queryResult.offset
      });
    }

    if (action === 'lockSheets') {
      lockDatabaseSheets(ss, getManagedTableNames());
      return createResponse({ status: 'success', message: 'Sheets locked and protected by default' });
    }

    // --- Role Permissions Operations ---
    if (action === 'saveRolePermissions') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'manage_role_permissions')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: manage_role_permissions is disabled for role ' + userRole });
      }

      var targetRole = body.role;
      var config = body.config;
      var allPermissions = body.allPermissions;

      repo.transaction(function() {
        if (allPermissions && typeof allPermissions === 'object') {
          ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'].forEach(function(r) {
            if (allPermissions[r]) {
              var existingPerm = repo.findById('Role_Permissions', r);
              if (existingPerm) {
                repo.update('Role_Permissions', r, { config_json: JSON.stringify(allPermissions[r]), updated_by: userRole });
              } else {
                repo.insert('Role_Permissions', { role: r, config_json: JSON.stringify(allPermissions[r]), updated_by: userRole });
              }
            }
          });
        } else if (targetRole && config) {
          var existingSingle = repo.findById('Role_Permissions', targetRole);
          if (existingSingle) {
            repo.update('Role_Permissions', targetRole, { config_json: JSON.stringify(config), updated_by: userRole });
          } else {
            repo.insert('Role_Permissions', { role: targetRole, config_json: JSON.stringify(config), updated_by: userRole });
          }
        }
      });

      return createResponse({ status: 'success', message: 'Role permissions saved to database' });
    }

    // --- Order Operations ---
    if (action === 'saveOrder') {
      var order = body.order;
      var targetSheetName = order.status === 'APPROVED' ? 'Master_Orders_Sales' : 'Pending_Orders';
      var existingOrder = order.id ? repo.findById(targetSheetName, order.id) : null;

      if (existingOrder && !checkBackendPermission(ss, userRole, 'orders_page', 'edit_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: edit_order is disabled for role ' + userRole });
      }
      if (!existingOrder && !checkBackendPermission(ss, userRole, 'orders_page', 'create_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: create_order is disabled for role ' + userRole });
      }

      var orderRecord = targetSheetName === 'Master_Orders_Sales'
        ? {
            order_no: order.orderNumber || '',
            customer_id: order.customerId,
            customer_name: order.customerName,
            customer_phone: order.customerPhone || '',
            date: order.orderDate || new Date().toISOString(),
            total_bags: order.totalOuterBags || 0,
            total_weight_kg: order.totalWeightKg || 0,
            subtotal: order.subtotal || 0,
            discount: order.discount || 0,
            grand_total: order.grandTotal || 0,
            payment_mode: order.paymentMode || 'CREDIT',
            status: order.status || 'APPROVED',
            approved_by: order.submittedByRole || userRole
          }
        : {
            order_no: order.orderNumber || '',
            customer_id: order.customerId,
            customer_name: order.customerName,
            date: order.orderDate || new Date().toISOString(),
            total_bags: order.totalOuterBags || 0,
            discount: order.discount || 0,
            grand_total: order.grandTotal || 0,
            status: order.status || 'PENDING_REVIEW',
            submitted_by: order.submittedByRole || userRole
          };

      var savedOrder = existingOrder
        ? repo.update(targetSheetName, order.id, orderRecord, order.version)
        : repo.insert(targetSheetName, orderRecord);

      return createResponse({
        status: 'success',
        message: 'Order recorded in ' + targetSheetName,
        id: savedOrder.id,
        orderId: savedOrder.id,
        orderNumber: savedOrder.order_no,
        version: savedOrder.version
      });
    }

    if (action === 'updateOrderStatus') {
      var orderId = body.orderId;
      var newStatus = body.newStatus;
      var approvedByRole = body.approvedByRole;

      if (newStatus === 'APPROVED' && !checkBackendPermission(ss, userRole, 'orders_page', 'approve_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: approve_order is disabled for role ' + userRole });
      }
      if (newStatus === 'DISPATCHED' && !checkBackendPermission(ss, userRole, 'orders_page', 'dispatch_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: dispatch_order is disabled for role ' + userRole });
      }
      if (newStatus === 'DELIVERED' && !checkBackendPermission(ss, userRole, 'orders_page', 'deliver_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: deliver_order is disabled for role ' + userRole });
      }

      var pendingOrder = repo.findById('Pending_Orders', orderId);
      if (pendingOrder) {
        if (newStatus === 'APPROVED' || newStatus === 'DELIVERED') {
          var moved = repo.transaction(function() {
            ConstraintEngine.validateChecks('Master_Orders_Sales', Object.assign({}, pendingOrder, { status: newStatus }), pendingOrder);
            var insertedSale = repo.insert('Master_Orders_Sales', {
              id: pendingOrder.id,
              order_no: pendingOrder.order_no,
              customer_id: pendingOrder.customer_id,
              customer_name: pendingOrder.customer_name,
              customer_phone: '',
              date: pendingOrder.date,
              total_bags: pendingOrder.total_bags,
              total_weight_kg: 0,
              subtotal: pendingOrder.grand_total,
              discount: pendingOrder.discount,
              grand_total: pendingOrder.grand_total,
              payment_mode: 'CREDIT',
              status: newStatus,
              approved_by: approvedByRole || userRole
            }, { preserveId: true, preserveBusinessNo: true });
            repo.softDelete('Pending_Orders', pendingOrder.id);
            return insertedSale;
          });
          return createResponse({ status: 'success', message: 'Order approved & moved to Master Sales', id: moved.id, version: moved.version });
        } else {
          var updatedPending = repo.update('Pending_Orders', orderId, { status: newStatus }, body.version);
          return createResponse({ status: 'success', message: 'Pending order status updated', id: updatedPending.id, version: updatedPending.version });
        }
      }

      var salesOrder = repo.findById('Master_Orders_Sales', orderId);
      if (salesOrder) {
        var updatedSale = repo.update('Master_Orders_Sales', orderId, { status: newStatus }, body.version);
        return createResponse({ status: 'success', message: 'Order status updated', id: updatedSale.id, version: updatedSale.version });
      }

      return createResponse({ status: 'error', code: ERROR_CODES.NOT_FOUND, message: 'Order not found: ' + orderId });
    }

    if (action === 'deleteOrder') {
      if (!checkBackendPermission(ss, userRole, 'orders_page', 'delete_order')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: delete_order is disabled for role ' + userRole });
      }
      var delOrderId = body.orderId;
      if (repo.findById('Pending_Orders', delOrderId)) {
        repo.softDelete('Pending_Orders', delOrderId, body.version);
        return createResponse({ status: 'success', message: 'Order deleted from pending orders' });
      }
      if (repo.findById('Master_Orders_Sales', delOrderId)) {
        repo.softDelete('Master_Orders_Sales', delOrderId, body.version);
        return createResponse({ status: 'success', message: 'Order deleted from sales orders' });
      }
      return createResponse({ status: 'error', code: ERROR_CODES.NOT_FOUND, message: 'Order not found' });
    }

    // --- Order Items Operations ---
    if (action === 'saveOrderItem') {
      var item = body.item;
      var existingItem = item.id ? repo.findById('Order_Items', item.id) : null;
      var itemPayload = {
        order_id: item.orderId,
        product_id: item.productId,
        unit_type: item.unitType || 'OUTER_BAG',
        quantity: item.quantity,
        rate_per_unit: item.ratePerUnit || 0,
        line_total: item.lineTotal || 0
      };
      var savedItem = existingItem
        ? repo.update('Order_Items', item.id, itemPayload, item.version)
        : repo.insert('Order_Items', itemPayload);
      return createResponse({ status: 'success', id: savedItem.id, version: savedItem.version, message: 'Order item saved' });
    }

    // --- Customer Operations ---
    if (action === 'saveCustomer') {
      var c = body.customer;
      var existingCust = c.id ? repo.findById('Master_Customers', c.id) : null;

      if (existingCust && !checkBackendPermission(ss, userRole, 'customers_page', 'edit_customer')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: edit_customer is disabled for role ' + userRole });
      }
      if (!existingCust && !checkBackendPermission(ss, userRole, 'customers_page', 'add_customer')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: add_customer is disabled for role ' + userRole });
      }

      var custPayload = {
        name_en: c.name,
        name_te: c.nameTe || '',
        phone: normalizePhoneValue(c.phone),
        business_en: c.businessName || '',
        business_te: c.businessNameTe || '',
        address_en: c.address || '',
        address_te: c.addressTe || '',
        current_due: c.currentDue || 0
      };

      var savedCust = existingCust
        ? repo.update('Master_Customers', c.id, custPayload, c.version)
        : repo.insert('Master_Customers', custPayload);

      return createResponse({ status: 'success', id: savedCust.id, customerId: savedCust.id, version: savedCust.version, message: 'Customer saved to sheet' });
    }

    // --- Supplier Operations ---
    if (action === 'saveSupplier') {
      var s = body.supplier;
      var existingSupp = s.id ? repo.findById('Master_Suppliers', s.id) : null;

      if (existingSupp && !checkBackendPermission(ss, userRole, 'suppliers_page', 'edit_supplier')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: edit_supplier is disabled for role ' + userRole });
      }
      if (!existingSupp && !checkBackendPermission(ss, userRole, 'suppliers_page', 'add_supplier')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: add_supplier is disabled for role ' + userRole });
      }

      var suppPayload = {
        business_en: s.businessName,
        business_te: s.businessNameTe || '',
        owner_en: s.ownerName || '',
        owner_te: s.ownerNameTe || '',
        bank_name: s.bankName,
        account_no: s.accountNumber,
        ifsc_code: s.ifscCode,
        nickname_en: s.nickname,
        nickname_te: s.nicknameTe || ''
      };

      var savedSupp = existingSupp
        ? repo.update('Master_Suppliers', s.id, suppPayload, s.version)
        : repo.insert('Master_Suppliers', suppPayload);

      return createResponse({ status: 'success', id: savedSupp.id, supplierId: savedSupp.id, version: savedSupp.version, message: 'Supplier saved to sheet' });
    }

    // --- Purchase Operations ---
    if (action === 'savePurchase') {
      var pur = body.purchase;
      var existingPur = pur.id ? repo.findById('Master_Purchases', pur.id) : null;
      var purPayload = {
        purchase_no: pur.purchaseNumber || '',
        supplier_id: pur.supplierId,
        date: pur.date || new Date().toISOString(),
        total_bags: pur.totalBags || 0,
        grand_total: pur.grandTotal || 0,
        reference_bill: pur.referenceBill || ''
      };
      var savedPur = existingPur
        ? repo.update('Master_Purchases', pur.id, purPayload, pur.version)
        : repo.insert('Master_Purchases', purPayload);
      return createResponse({
        status: 'success',
        id: savedPur.id,
        purchaseId: savedPur.id,
        purchaseNumber: savedPur.purchase_no,
        version: savedPur.version,
        message: 'Purchase saved to sheet'
      });
    }

    // --- Product Operations ---
    if (action === 'saveProduct') {
      var p = body.product;
      var existingProd = p.id ? repo.findById('Master_Products', p.id) : null;

      if (existingProd && !checkBackendPermission(ss, userRole, 'stock_page', 'edit_product')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: edit_product is disabled for role ' + userRole });
      }
      if (!existingProd && !checkBackendPermission(ss, userRole, 'stock_page', 'add_product')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: add_product is disabled for role ' + userRole });
      }

      var prodPayload = {
        name_en: p.name,
        name_te: p.nameTe || '',
        category: p.category,
        brand_en: p.brandOrMill || '',
        brand_te: p.brandOrMillTe || '',
        inner_wt_kg: p.innerBagWeightKg,
        inner_count: p.innerBagsPerOuter,
        outer_wt_kg: p.outerBagTotalKg,
        stock_physical: p.stockPhysicalOuter,
        stock_reserved: p.stockReservedOuter,
        price_bag: p.wholesalePriceBag,
        cost_bag: p.costPricePerBag,
        retail_price_bag: p.retailPriceBag || 0
      };

      var savedProd = existingProd
        ? repo.update('Master_Products', p.id, prodPayload, p.version)
        : repo.insert('Master_Products', prodPayload);

      return createResponse({ status: 'success', id: savedProd.id, productId: savedProd.id, version: savedProd.version, message: 'Product inventory saved to sheet' });
    }

    // --- User Operations ---
    if (action === 'createUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'create_user')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: create_user is disabled for role ' + userRole });
      }
      var user = body.user;
      var tempPass = body.tempPassword || '';
      var resetLink = body.resetLink || '';

      var normEmail = normalizeEmailValue(user.email);
      var normPhone = normalizePhoneValue(user.phone);
      var existingByPk = user.id ? repo.findById('Users', user.id) : null;
      var userPayload = {
        name: user.name,
        email: normEmail,
        phone: normPhone,
        role: user.role,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        passwordHash: user.passwordHash || '',
        requestedRole: '',
        requestedName: '',
        mustResetPassword: true
      };

      var savedUser = existingByPk
        ? repo.update('Users', user.id, userPayload, user.version)
        : repo.insert('Users', userPayload);

      if (ENABLE_EMAIL_DELIVERY && user.email) {
        try {
          var emailBody = 'Hello ' + user.name + ',\n\n' +
            'Your account for Kaatha Wholesale has been created by the administrator.\n\n' +
            'Role: ' + user.role + '\n' +
            'Email: ' + user.email + '\n';
          if (tempPass) emailBody += 'Temporary Password: ' + tempPass + '\n\n';
          if (resetLink) emailBody += 'Direct Password Setup Link:\n' + resetLink + '\n\n';
          emailBody += 'Security Notice: Please sign in with your temporary password and set your permanent password on initial login.\n\nRegards,\nKaatha Wholesale Enterprise';

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
        id: savedUser.id,
        userId: savedUser.id,
        version: savedUser.version
      });
    }

    if (action === 'registerUser') {
      var regUser = body.user;
      var regTempPass = body.tempPassword || '';
      var regResetLink = body.resetLink || '';
      var isRoleChangeRequest = Boolean(body.isRoleChangeRequest);
      var isReRequest = Boolean(body.isReRequest);
      var regEmail = normalizeEmailValue(regUser.email);
      var regPhone = normalizePhoneValue(regUser.phone);

      var savedRegUser = repo.transaction(function() {
        var existingUser = (regUser.id && repo.findById('Users', regUser.id))
          || repo.findByUniqueIndex('Users', ['email'], regEmail)
          || (regPhone.length === 10 ? repo.findByUniqueIndex('Users', ['phone'], regPhone) : null);

        var targetUserId = existingUser ? existingUser.id : null;

        if (isRoleChangeRequest && existingUser) {
          var updatedRoleReq = repo.update('Users', existingUser.id, {
            requestedRole: regUser.requestedRole || '',
            requestedName: regUser.requestedName || regUser.name || ''
          });
          targetUserId = updatedRoleReq.id;
        } else if (isReRequest && existingUser) {
          var updatedReReq = repo.update('Users', existingUser.id, {
            name: regUser.name,
            role: regUser.role,
            status: 'PENDING_APPROVAL',
            requestedRole: '',
            requestedName: ''
          });
          targetUserId = updatedReReq.id;
        } else if (existingUser) {
          throw createConstraintError(ERROR_CODES.DUPLICATE_KEY, 'Users duplicate email or phone');
        } else {
          var insertedUser = repo.insert('Users', {
            name: regUser.name,
            email: regEmail,
            phone: regPhone,
            role: regUser.role,
            status: regUser.status || 'PENDING_APPROVAL',
            createdAt: new Date().toISOString(),
            passwordHash: regUser.passwordHash || '',
            requestedRole: regUser.requestedRole || '',
            requestedName: regUser.requestedName || '',
            mustResetPassword: Boolean(regUser.mustResetPassword)
          });
          targetUserId = insertedUser.id;
        }

        repo.insert('User_Registrations', {
          name: isRoleChangeRequest ? (regUser.requestedName || regUser.name) : regUser.name,
          email: regEmail,
          phone: regPhone,
          requested_role: isRoleChangeRequest ? (regUser.requestedRole || regUser.role) : regUser.role,
          status: 'PENDING_APPROVAL',
          registered_at: new Date().toISOString(),
          temp_password_sent: isRoleChangeRequest ? 'NO (ROLE_CHANGE)' : isReRequest ? 'NO (RE_REQUEST)' : (regTempPass ? 'SENT' : 'NO')
        });

        return targetUserId;
      });

      if (ENABLE_EMAIL_DELIVERY && !isRoleChangeRequest && !isReRequest && (regTempPass || regResetLink) && regUser.email) {
        try {
          MailApp.sendEmail({
            to: regUser.email,
            subject: 'Kaatha Wholesale - Access Request & Password Setup',
            body: 'Hello ' + regUser.name + ',\n\n' +
                  'Your registration request for Kaatha Wholesale has been received and is pending administrator approval.\n\n' +
                  (regTempPass ? ('Temporary Password: ' + regTempPass + '\n') : '') +
                  (regResetLink ? ('Password Setup Link: ' + regResetLink + '\n\n') : '\n') +
                  'Security Notice: Please set your permanent password using the link above. You will be able to sign in once an administrator approves your request.\n\n' +
                  'Regards,\nKaatha Wholesale Enterprise'
          });
        } catch (mailErr) {
          console.warn('MailApp delivery error:', mailErr);
        }
      }

      return createResponse({
        status: 'success',
        message: isRoleChangeRequest
          ? 'Role change request recorded; existing privileges preserved until admin approval'
          : isReRequest
          ? 'Access request updated with new role without password change'
          : 'Registration recorded in User_Registrations sheet and confirmation email dispatched',
        id: savedRegUser,
        userId: savedRegUser
      });
    }

    if (action === 'forgotPassword') {
      var fpEmail = normalizeEmailValue(body.email);
      var fpUser = fpEmail ? repo.findByUniqueIndex('Users', ['email'], fpEmail) : null;
      if (fpUser && body.passwordHash) {
        repo.update('Users', fpUser.id, { passwordHash: body.passwordHash });
      }

      if (ENABLE_EMAIL_DELIVERY && body.email) {
        try {
          if (body.resetLink) {
            MailApp.sendEmail({
              to: body.email,
              subject: 'Kaatha Wholesale - Password Reset Link',
              body: 'Hello ' + (body.name || '') + ',\n\nPlease click the unique link below to reset your password:\n' + body.resetLink
            });
          } else if (body.tempPassword) {
            MailApp.sendEmail({
              to: body.email,
              subject: 'Kaatha Wholesale - Temporary Password Reset Code',
              body: 'Hello,\n\nYour Temporary Password: ' + body.tempPassword
            });
          }
        } catch (mailErr) {
          console.warn('Password reset email error:', mailErr);
        }
      }
      return createResponse({ status: 'success', message: 'Password reset link dispatched to email' });
    }

    if (action === 'resetPassword') {
      var rpEmail = normalizeEmailValue(body.email);
      var newPasswordHash = body.newPasswordHash;
      if (rpEmail && newPasswordHash) {
        var rpUser = repo.findByUniqueIndex('Users', ['email'], rpEmail);
        if (rpUser) {
          repo.update('Users', rpUser.id, { passwordHash: newPasswordHash, mustResetPassword: false });
          return createResponse({ status: 'success', message: 'Password hash successfully updated' });
        }
      }
      return createResponse({ status: 'success', message: 'Password reset recorded' });
    }

    if (action === 'approveUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'approve_user')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: approve_user is disabled for role ' + userRole });
      }
      var appUserId = body.userId;
      var newStatus = body.newStatus;
      var appRole = body.role;
      var appName = body.name;
      var clearRequestedRole = body.clearRequestedRole;

      var targetUser = repo.findById('Users', appUserId);
      if (!targetUser) {
        return createResponse({ status: 'error', code: ERROR_CODES.NOT_FOUND, message: 'User not found' });
      }

      var patch = {};
      if (appName) patch.name = appName;
      if (newStatus) patch.status = newStatus;
      if (appRole) patch.role = appRole;
      if (newStatus === 'APPROVED' || newStatus === 'DENIED' || clearRequestedRole) {
        patch.requestedRole = '';
        patch.requestedName = '';
      }

      var updatedUser = repo.update('Users', appUserId, patch, body.version);
      return createResponse({ status: 'success', message: 'User status updated', id: updatedUser.id, version: updatedUser.version });
    }

    if (action === 'updateUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'edit_user')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: edit_user is disabled for role ' + userRole });
      }
      var updPatch = {};
      if (body.name) updPatch.name = body.name;
      if (body.role) updPatch.role = body.role;
      if (body.status) updPatch.status = body.status;

      var updatedUsr = repo.update('Users', body.userId, updPatch, body.version);
      return createResponse({ status: 'success', message: 'User updated successfully', id: updatedUsr.id, version: updatedUsr.version });
    }

    if (action === 'deleteUser') {
      if (!checkBackendPermission(ss, userRole, 'user_management_page', 'delete_user')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: delete_user is disabled for role ' + userRole });
      }
      repo.softDelete('Users', body.userId, body.version);
      return createResponse({ status: 'success', message: 'User deleted successfully' });
    }

    if (action === 'cleanDuplicateUsers') {
      var stats = deduplicateUsersTable(ss);
      return createResponse({ status: 'success', message: 'Deduplicated users table', stats: stats });
    }

    if (action === 'deleteProduct') {
      if (!checkBackendPermission(ss, userRole, 'stock_page', 'delete_product')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: delete_product is disabled for role ' + userRole });
      }
      repo.softDelete('Master_Products', body.productId, body.version);
      return createResponse({ status: 'success', message: 'Product deleted' });
    }

    if (action === 'deleteCustomer') {
      if (!checkBackendPermission(ss, userRole, 'customers_page', 'delete_customer')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: delete_customer is disabled for role ' + userRole });
      }
      repo.softDelete('Master_Customers', body.customerId, body.version);
      return createResponse({ status: 'success', message: 'Customer deleted' });
    }

    if (action === 'deleteSupplier') {
      if (!checkBackendPermission(ss, userRole, 'suppliers_page', 'delete_supplier')) {
        return createResponse({ status: 'error', code: ERROR_CODES.FORBIDDEN, message: 'Permission denied: delete_supplier is disabled for role ' + userRole });
      }
      repo.softDelete('Master_Suppliers', body.supplierId, body.version);
      return createResponse({ status: 'success', message: 'Supplier deleted' });
    }

    if (action === 'deletePurchase') {
      repo.softDelete('Master_Purchases', body.purchaseId, body.version);
      return createResponse({ status: 'success', message: 'Purchase deleted' });
    }

    // --- Batch Full Sync ---
    if (action === 'syncAll') {
      var products = body.products || [];
      var customers = body.customers || [];
      var suppliers = body.suppliers || [];
      var orders = body.orders || [];
      var users = body.users || [];

      repo.transaction(function() {
        var now = new Date().toISOString();
        var prodSheet = ss.getSheetByName('Master_Products');
        if (prodSheet && products.length > 0) {
          if (prodSheet.getLastRow() > 1) {
            prodSheet.getRange(2, 1, prodSheet.getLastRow() - 1, DB_SCHEMA.Master_Products.columns.length).clearContent();
          }
          var pRows = products.map(function(p) {
            return [
              p.id, p.name, p.nameTe || '', p.category, p.brandOrMill || '', p.brandOrMillTe || '',
              p.innerBagWeightKg, p.innerBagsPerOuter, p.outerBagTotalKg, p.stockPhysicalOuter, p.stockReservedOuter,
              p.wholesalePriceBag, p.costPricePerBag, p.retailPriceBag || 0, p.version || 1, p.createdAt || now, now, false
            ];
          });
          prodSheet.getRange(2, 1, pRows.length, DB_SCHEMA.Master_Products.columns.length).setValues(pRows);
        }

        var custSheet = ss.getSheetByName('Master_Customers');
        if (custSheet && customers.length > 0) {
          if (custSheet.getLastRow() > 1) {
            custSheet.getRange(2, 1, custSheet.getLastRow() - 1, DB_SCHEMA.Master_Customers.columns.length).clearContent();
          }
          var cRows = customers.map(function(c) {
            return [
              c.id, c.name, c.nameTe || '', normalizePhoneValue(c.phone), c.businessName || '', c.businessNameTe || '',
              c.address || '', c.addressTe || '', c.currentDue || 0, c.version || 1, c.createdAt || now, now, false
            ];
          });
          custSheet.getRange(2, 1, cRows.length, DB_SCHEMA.Master_Customers.columns.length).setValues(cRows);
        }

        var suppSheet = ss.getSheetByName('Master_Suppliers');
        if (suppSheet && suppliers.length > 0) {
          if (suppSheet.getLastRow() > 1) {
            suppSheet.getRange(2, 1, suppSheet.getLastRow() - 1, DB_SCHEMA.Master_Suppliers.columns.length).clearContent();
          }
          var sRows = suppliers.map(function(s) {
            return [
              s.id, s.businessName, s.businessNameTe || '', s.ownerName || '', s.ownerNameTe || '',
              s.bankName, s.accountNumber, s.ifscCode, s.nickname, s.nicknameTe || '',
              s.version || 1, s.createdAt || now, now, false
            ];
          });
          suppSheet.getRange(2, 1, sRows.length, DB_SCHEMA.Master_Suppliers.columns.length).setValues(sRows);
        }

        var userSheet = ss.getSheetByName('Users');
        if (userSheet && users.length > 0) {
          if (userSheet.getLastRow() > 1) {
            userSheet.getRange(2, 1, userSheet.getLastRow() - 1, DB_SCHEMA.Users.columns.length).clearContent();
          }
          var uRows = users.map(function(u) {
            return [
              u.id, u.name, normalizeEmailValue(u.email), normalizePhoneValue(u.phone), u.role, u.status || 'APPROVED',
              u.createdAt || now, u.passwordHash || '', u.requestedRole || '', u.requestedName || '',
              Boolean(u.mustResetPassword), u.version || 1, u.createdAt || now, now, false
            ];
          });
          userSheet.getRange(2, 1, uRows.length, DB_SCHEMA.Users.columns.length).setValues(uRows);
          deduplicateUsersTable(ss);
        }
      });

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
    return createResponse({
      status: 'error',
      code: err && err.code ? err.code : undefined,
      message: err && err.message ? err.message : String(err),
      error: err ? err.toString() : 'Unknown error'
    });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
