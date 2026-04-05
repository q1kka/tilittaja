import { Settings } from '../types';
import { getDb } from './connection';

export function getSettings(): Settings {
  const row = getDb()
    .prepare('SELECT * FROM settings LIMIT 1')
    .get() as Settings;
  return row;
}

export function updateCompanyInfo(name: string, businessId: string): void {
  getDb()
    .prepare('UPDATE settings SET name = ?, business_id = ?')
    .run(name.trim(), businessId.trim());
}

function decodePropertyValue(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
}

function encodePropertyValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

export function parsePropertiesString(
  properties: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of properties.split('\n')) {
    if (!line.trim()) continue;
    const separator = line.indexOf('=');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const encodedValue = line.slice(separator + 1);
    if (!key) continue;
    result[key] = decodePropertyValue(encodedValue);
  }
  return result;
}

export function serializePropertiesString(
  properties: Record<string, string>,
): string {
  return Object.entries(properties)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodePropertyValue(value)}`)
    .join('\n');
}

export function getSettingProperties(): Record<string, string> {
  const settings = getSettings();
  return parsePropertiesString(settings.properties || '');
}

export function updateSettingProperties(values: Record<string, string>): void {
  const current = getSettingProperties();
  for (const [key, value] of Object.entries(values)) {
    current[key] = value ?? '';
  }
  const next = serializePropertiesString(current);
  getDb().prepare('UPDATE settings SET properties = ?').run(next);
}
