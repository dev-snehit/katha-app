import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

export interface SentEmail {
  to: string;
  subject: string;
  body: string;
}

class MockRange {
  constructor(
    private sheet: MockSheet,
    private row: number,
    private col: number,
    private numRows: number,
    private numCols: number
  ) {}

  getValues() {
    const out: any[][] = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = this.sheet.rows[this.row - 1 + r] || [];
      const slice: any[] = [];
      for (let c = 0; c < this.numCols; c++) {
        slice.push(rowArr[this.col - 1 + c] !== undefined ? rowArr[this.col - 1 + c] : '');
      }
      out.push(slice);
    }
    return out;
  }

  setValues(values: any[][]) {
    for (let r = 0; r < values.length; r++) {
      const targetRowIdx = this.row - 1 + r;
      while (this.sheet.rows.length <= targetRowIdx) this.sheet.rows.push([]);
      for (let c = 0; c < values[r].length; c++) {
        this.sheet.rows[targetRowIdx][this.col - 1 + c] = values[r][c];
      }
    }
    return this;
  }

  setValue(val: any) {
    return this.setValues([[val]]);
  }

  setFontWeight() {
    return this;
  }

  setBackground() {
    return this;
  }
}

export class MockSheet {
  rows: any[][] = [];
  constructor(public name: string) {}

  getName() {
    return this.name;
  }
  getLastRow() {
    return this.rows.length;
  }
  getLastColumn() {
    return this.rows.reduce((max, r) => Math.max(max, r.length), 0);
  }
  appendRow(row: any[]) {
    this.rows.push([...row]);
    return this;
  }
  deleteRow(rowNum: number) {
    this.rows.splice(rowNum - 1, 1);
  }
  setFrozenRows() {}
  getRange(row: number, col: number, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }
  getDataRange() {
    return new MockRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }
  getProtections() {
    return [];
  }
  protect() {
    const p = {
      setDescription: () => p,
      setWarningOnly: () => p,
      getEditors: () => [],
      removeEditors: () => p,
      addEditor: () => p,
      canDomainEdit: () => false,
      setDomainEdit: () => p,
    };
    return p;
  }
}

export function createGasRuntime() {
  const sheets = new Map<string, MockSheet>();
  const scriptProps = new Map<string, string>();
  const sentEmails: SentEmail[] = [];

  const ss = {
    getName: () => 'Kaatha Mock DB',
    getSheetByName: (name: string) => sheets.get(name) || null,
    insertSheet: (name: string) => {
      const s = new MockSheet(name);
      sheets.set(name, s);
      return s;
    },
  };

  const context: Record<string, any> = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => scriptProps.get(k) ?? null,
        setProperty: (k: string, v: string) => {
          scriptProps.set(k, String(v));
        },
      }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      newBlob: (input: string | Buffer) => {
        const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
        return {
          getBytes: () => buf,
          getDataAsString: () => buf.toString('utf8'),
        };
      },
      base64EncodeWebSafe: (bytes: Buffer | number[]) => {
        const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
        return buf.toString('base64url');
      },
      base64DecodeWebSafe: (str: string) => Buffer.from(str, 'base64url'),
      computeHmacSha256Signature: (data: string, secret: string) =>
        crypto.createHmac('sha256', secret).update(data, 'utf8').digest(),
    },
    MailApp: {
      sendEmail: (opts: SentEmail) => {
        sentEmails.push(opts);
      },
    },
    Session: {
      getEffectiveUser: () => ({
        getEmail: () => 'dev.snehit@gmail.com',
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (txt: string) => ({
        setMimeType: () => txt,
        getContent: () => txt,
      }),
    },
  };

  const codePath = path.resolve(process.cwd(), 'backend/Code.gs');
  const code = fs.readFileSync(codePath, 'utf8');
  vm.createContext(context);
  vm.runInContext(code, context);

  return {
    context,
    sheets,
    scriptProps,
    sentEmails,
    callGet: (params: Record<string, string>) => {
      const raw = context.doGet({ parameter: params });
      return JSON.parse(raw);
    },
    callPost: (body: Record<string, any>) => {
      const raw = context.doPost({ postData: { contents: JSON.stringify(body) } });
      return JSON.parse(raw);
    },
  };
}
