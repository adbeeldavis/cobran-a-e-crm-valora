import { DebtRecord } from '../types';
import { parseSemicolonCsv } from '../utils/semicolonCsvParser';
import { CONSOLIDATED_ALL_SHEETS_CSV } from './allConsolidatedClientsCsv';
import { CONSOLIDATED_ALL_SHEETS_CSV_PART2 } from './allConsolidatedClientsCsvPart2';
import { CONSOLIDATED_ALL_SHEETS_CSV_PART3 } from './allConsolidatedClientsCsvPart3';
import { CONSOLIDATED_ALL_SHEETS_CSV_PART4 } from './allConsolidatedClientsCsvPart4';
import { CONSOLIDATED_ALL_SHEETS_CSV_PART5 } from './allConsolidatedClientsCsvPart5';

export function getAllConsolidatedClients(): DebtRecord[] {
  const combinedCsv = [
    CONSOLIDATED_ALL_SHEETS_CSV,
    CONSOLIDATED_ALL_SHEETS_CSV_PART2,
    CONSOLIDATED_ALL_SHEETS_CSV_PART3,
    CONSOLIDATED_ALL_SHEETS_CSV_PART4,
    CONSOLIDATED_ALL_SHEETS_CSV_PART5
  ].join('\n');

  return parseSemicolonCsv(combinedCsv);
}
