import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('./connection', () => ({ getDb }));

import {
  getSettings,
  updateCompanyInfo,
  parsePropertiesString,
  serializePropertiesString,
  getSettingProperties,
  updateSettingProperties,
} from './settings';

describe('settings', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    getDb.mockReturnValue(db);

    db.exec(`
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        business_id TEXT NOT NULL DEFAULT '',
        properties TEXT NOT NULL DEFAULT '',
        version INTEGER NOT NULL DEFAULT 0,
        current_period_id INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO settings (id, name, business_id, properties, version, current_period_id)
      VALUES (1, 'Test Oy', '1234567-8', 'key1=value1\nkey2=hello\\nworld', 1, 1);
    `);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns settings row', () => {
      const settings = getSettings();
      expect(settings.name).toBe('Test Oy');
      expect(settings.business_id).toBe('1234567-8');
    });
  });

  describe('updateCompanyInfo', () => {
    it('updates name and business ID with trimmed values', () => {
      updateCompanyInfo('  New Name  ', '  9876543-2  ');
      const settings = getSettings();
      expect(settings.name).toBe('New Name');
      expect(settings.business_id).toBe('9876543-2');
    });
  });

  describe('parsePropertiesString', () => {
    it('parses key=value lines', () => {
      const result = parsePropertiesString('key1=value1\nkey2=value2');
      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('decodes escaped newlines and backslashes', () => {
      const result = parsePropertiesString(
        'text=line1\\nline2\npath=C:\\\\Users',
      );
      expect(result.text).toBe('line1\nline2');
      expect(result.path).toBe('C:\\Users');
    });

    it('skips empty lines and lines without separator', () => {
      const result = parsePropertiesString('\nnoseparator\n\nvalid=yes\n');
      expect(result).toEqual({ valid: 'yes' });
    });

    it('skips lines with empty keys', () => {
      const result = parsePropertiesString('=nokey\nreal=value');
      expect(result).toEqual({ real: 'value' });
    });

    it('handles value containing equals sign', () => {
      const result = parsePropertiesString('formula=a=b+c');
      expect(result).toEqual({ formula: 'a=b+c' });
    });
  });

  describe('serializePropertiesString', () => {
    it('serializes properties sorted by key', () => {
      const result = serializePropertiesString({ zebra: 'z', alpha: 'a' });
      expect(result).toBe('alpha=a\nzebra=z');
    });

    it('encodes newlines and backslashes', () => {
      const result = serializePropertiesString({
        text: 'line1\nline2',
        path: 'C:\\Users',
      });
      expect(result).toContain('text=line1\\nline2');
      expect(result).toContain('path=C:\\\\Users');
    });
  });

  describe('getSettingProperties', () => {
    it('returns parsed properties from DB', () => {
      const props = getSettingProperties();
      expect(props.key1).toBe('value1');
      expect(props.key2).toBe('hello\nworld');
    });
  });

  describe('updateSettingProperties', () => {
    it('merges new values with existing properties', () => {
      updateSettingProperties({ key1: 'updated', newKey: 'added' });
      const props = getSettingProperties();
      expect(props.key1).toBe('updated');
      expect(props.key2).toBe('hello\nworld');
      expect(props.newKey).toBe('added');
    });
  });
});
