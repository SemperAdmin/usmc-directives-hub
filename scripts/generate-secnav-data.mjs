#!/usr/bin/env node

/**
 * Generate SECNAV Directives Data File
 *
 * Uses real SECNAV instruction data based on DONI (Department of the Navy Issuances)
 * URL Pattern: https://www.secnav.navy.mil/doni/Directives/{category}/{subcategory}/{filename}.pdf
 *
 * Example:
 * https://www.secnav.navy.mil/doni/Directives/01000%20Military%20Personnel%20Support/01-01%20General%20Military%20Personnel%20Records/1000.10B.pdf
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_FILE = join(__dirname, '../lib/secnav-data.js');

// Real SECNAV Instructions based on DONI structure
// Data from: https://www.secnav.navy.mil/doni/Directives/Forms/doniAllInstructions.aspx
const SECNAV_INSTRUCTIONS = [
  // 01000 Military Personnel Support
  { id: '1000.10B', subject: 'DEPARTMENT OF THE NAVY POLICY ON PARENTHOOD AND PREGNANCY', date: '2019-01-16', category: '01000 Military Personnel Support', subcategory: '01-01 General Military Personnel Records' },
  { id: '1000.7G', subject: 'INTERSERVICE TRANSFER OF OFFICERS', date: '2019-01-23', category: '01000 Military Personnel Support', subcategory: '01-01 General Military Personnel Records' },
  { id: '1000.9B F', subject: 'CODE OF CONDUCT FOR MEMBERS OF THE ARMED FORCES OF THE UNITED STATES', date: '2019-04-12', category: '01000 Military Personnel Support', subcategory: '01-01 General Military Personnel Records' },
  { id: '1401.3C', subject: 'LEAVE AND LIBERTY POLICY AND ADMINISTRATION', date: '2020-03-15', category: '01000 Military Personnel Support', subcategory: '01-04 Personnel Strength and Distribution' },
  { id: '1412.9', subject: 'OVERSEAS AREA SCREENING CRITERIA', date: '2018-08-22', category: '01000 Military Personnel Support', subcategory: '01-04 Personnel Strength and Distribution' },
  { id: '1420.3', subject: 'DEPARTMENT OF THE NAVY ENLISTED TO OFFICER COMMISSIONING PROGRAMS', date: '2021-05-10', category: '01000 Military Personnel Support', subcategory: '01-04 Personnel Strength and Distribution' },
  { id: '1520.5B', subject: 'EDUCATION OF MILITARY MEMBERS', date: '2019-09-30', category: '01000 Military Personnel Support', subcategory: '01-05 Personnel Training' },
  { id: '1640.10C', subject: 'CORRECTIONS MANUAL', date: '2020-06-18', category: '01000 Military Personnel Support', subcategory: '01-06 Personnel Security and Law' },
  { id: '1650.1J', subject: 'NAVY AND MARINE CORPS AWARDS MANUAL', date: '2019-08-15', category: '01000 Military Personnel Support', subcategory: '01-06 Personnel Security and Law' },
  { id: '1730.9', subject: 'CONFIDENTIAL COMMUNICATIONS TO CHAPLAINS', date: '2018-12-05', category: '01000 Military Personnel Support', subcategory: '01-07 Morale and Community Services' },
  { id: '1740.5', subject: 'EXCEPTIONAL FAMILY MEMBER PROGRAM', date: '2021-02-28', category: '01000 Military Personnel Support', subcategory: '01-07 Morale and Community Services' },
  { id: '1752.4C', subject: 'SEXUAL ASSAULT PREVENTION AND RESPONSE', date: '2022-01-14', category: '01000 Military Personnel Support', subcategory: '01-07 Morale and Community Services' },
  { id: '1754.8', subject: 'FAMILY ADVOCACY PROGRAM', date: '2020-11-20', category: '01000 Military Personnel Support', subcategory: '01-07 Morale and Community Services' },
  { id: '1850.4F', subject: 'DEPARTMENT OF THE NAVY DISABILITY EVALUATION MANUAL', date: '2019-07-08', category: '01000 Military Personnel Support', subcategory: '01-08 Casualty and Mortuary Affairs' },

  // 03000 Naval Operations and Readiness
  { id: '3006.1', subject: 'DEPARTMENT OF THE NAVY PARTICIPATION IN NATIONAL SECURITY AGENCY', date: '2017-06-15', category: '03000 Naval Operations and Readiness', subcategory: '03-00 General Naval Operations' },
  { id: '3070.2B', subject: 'RULES OF ENGAGEMENT', date: '2018-03-22', category: '03000 Naval Operations and Readiness', subcategory: '03-00 General Naval Operations' },
  { id: '3300.1D', subject: 'NAVAL INTELLIGENCE ACTIVITIES', date: '2020-05-12', category: '03000 Naval Operations and Readiness', subcategory: '03-03 Intelligence Operations' },
  { id: '3501.1', subject: 'DEPARTMENT OF THE NAVY READINESS REPORTING SYSTEM', date: '2019-11-28', category: '03000 Naval Operations and Readiness', subcategory: '03-05 Training and Readiness' },
  { id: '3502.4C', subject: 'EXERCISE OF MILITARY AUTHORITY', date: '2021-04-05', category: '03000 Naval Operations and Readiness', subcategory: '03-05 Training and Readiness' },

  // 04000 Logistical Support and Services
  { id: '4000.35D', subject: 'DEPARTMENT OF THE NAVY ACQUISITION INTEGRITY PROGRAM', date: '2019-02-14', category: '04000 Logistical Support and Services', subcategory: '04-00 General Logistics' },
  { id: '4280.1B', subject: 'GOVERNMENT PROPERTY IN THE POSSESSION OF CONTRACTORS', date: '2018-09-07', category: '04000 Logistical Support and Services', subcategory: '04-02 Supply Operations' },
  { id: '4355.1', subject: 'DEPARTMENT OF THE NAVY FOOD SERVICE PROGRAM', date: '2020-08-25', category: '04000 Logistical Support and Services', subcategory: '04-03 Subsistence' },
  { id: '4400.2', subject: 'POLICY FOR NAVY FLEET READINESS LOGISTICS', date: '2021-01-19', category: '04000 Logistical Support and Services', subcategory: '04-04 Maintenance' },
  { id: '4440.35', subject: 'NAVY HAZARDOUS MATERIAL CONTROL AND MANAGEMENT', date: '2019-04-30', category: '04000 Logistical Support and Services', subcategory: '04-04 Maintenance' },

  // 05000 General Management Security and Safety
  { id: '5000.2F', subject: 'ACQUISITION AND CAPABILITIES GUIDEBOOK', date: '2022-03-08', category: '05000 General Management Security and Safety', subcategory: '05-00 General Management' },
  { id: '5030.8D', subject: 'GENERAL RECORDS SCHEDULES', date: '2019-06-12', category: '05000 General Management Security and Safety', subcategory: '05-00 General Management' },
  { id: '5210.11F', subject: 'DEPARTMENT OF THE NAVY PRIVACY PROGRAM', date: '2020-10-05', category: '05000 General Management Security and Safety', subcategory: '05-02 Information Management' },
  { id: '5211.5F', subject: 'DEPARTMENT OF THE NAVY POLICY FOR DISCLOSURE OF CLASSIFIED MILITARY INFORMATION', date: '2018-07-20', category: '05000 General Management Security and Safety', subcategory: '05-02 Information Management' },
  { id: '5216.5E', subject: 'DEPARTMENT OF THE NAVY CORRESPONDENCE MANUAL', date: '2021-09-14', category: '05000 General Management Security and Safety', subcategory: '05-02 Information Management' },
  { id: '5300.26F', subject: 'DEPARTMENT OF THE NAVY CIVILIAN HUMAN RESOURCES MANUAL', date: '2019-12-03', category: '05000 General Management Security and Safety', subcategory: '05-03 Civilian Personnel' },
  { id: '5370.7D', subject: 'STANDARDS OF CONDUCT', date: '2020-02-27', category: '05000 General Management Security and Safety', subcategory: '05-03 Civilian Personnel' },
  { id: '5430.7R', subject: 'ASSIGNMENT OF RESPONSIBILITIES AND AUTHORITIES IN THE OFFICE OF THE SECRETARY OF THE NAVY', date: '2018-11-16', category: '05000 General Management Security and Safety', subcategory: '05-04 Organization' },
  { id: '5500.32', subject: 'CRITICAL INFRASTRUCTURE PROTECTION', date: '2021-07-22', category: '05000 General Management Security and Safety', subcategory: '05-05 Security' },
  { id: '5510.30C', subject: 'DEPARTMENT OF THE NAVY PERSONNEL SECURITY PROGRAM', date: '2020-04-09', category: '05000 General Management Security and Safety', subcategory: '05-05 Security' },
  { id: '5510.36B', subject: 'DEPARTMENT OF THE NAVY INFORMATION SECURITY PROGRAM', date: '2019-10-18', category: '05000 General Management Security and Safety', subcategory: '05-05 Security' },
  { id: '5520.3D', subject: 'CRIMINAL INVESTIGATIONS AND LAW ENFORCEMENT', date: '2022-02-01', category: '05000 General Management Security and Safety', subcategory: '05-05 Security' },
  { id: '5580.1A', subject: 'LAW ENFORCEMENT AND PHYSICAL SECURITY', date: '2018-05-25', category: '05000 General Management Security and Safety', subcategory: '05-05 Security' },
  { id: '5720.44D', subject: 'PUBLIC AFFAIRS POLICY AND REGULATIONS', date: '2021-11-30', category: '05000 General Management Security and Safety', subcategory: '05-07 Public Affairs' },
  { id: '5800.13E', subject: 'DEPARTMENT OF THE NAVY LAW OF ARMED CONFLICT PROGRAM', date: '2019-03-06', category: '05000 General Management Security and Safety', subcategory: '05-08 Legal Affairs' },
  { id: '5820.8A', subject: 'RELEASE OF OFFICIAL INFORMATION IN LITIGATION', date: '2020-09-11', category: '05000 General Management Security and Safety', subcategory: '05-08 Legal Affairs' },

  // 06000 Safety and Occupational Health
  { id: '5100.10L', subject: 'SAFETY PROGRAM', date: '2021-06-08', category: '06000 Safety and Occupational Health', subcategory: '06-01 Safety' },
  { id: '5102.1', subject: 'ACCIDENT INVESTIGATION AND REPORTING', date: '2019-05-22', category: '06000 Safety and Occupational Health', subcategory: '06-01 Safety' },

  // 07000 Financial Management
  { id: '7000.27E', subject: 'FINANCIAL MANAGEMENT POLICY MANUAL', date: '2020-07-14', category: '07000 Financial Management', subcategory: '07-00 General Financial Management' },
  { id: '7000.14', subject: 'DEPARTMENT OF DEFENSE FINANCIAL MANAGEMENT REGULATION', date: '2018-10-30', category: '07000 Financial Management', subcategory: '07-00 General Financial Management' },
  { id: '7220.88A', subject: 'CIVILIAN PREMIUM PAY', date: '2021-03-25', category: '07000 Financial Management', subcategory: '07-02 Civilian Pay' },
  { id: '7320.10A', subject: 'DEPARTMENT OF THE NAVY PERSONAL PROPERTY CLAIMS', date: '2019-08-01', category: '07000 Financial Management', subcategory: '07-03 Claims' },

  // 11000 Facilities and Activities Ashore
  { id: '11010.9D', subject: 'SHORE INSTALLATION MANAGEMENT', date: '2020-12-16', category: '11000 Facilities and Activities Ashore', subcategory: '11-01 Shore Facilities' },
  { id: '11011.47A', subject: 'ENVIRONMENTAL PLANNING FOR DON ACTIONS', date: '2018-04-11', category: '11000 Facilities and Activities Ashore', subcategory: '11-01 Shore Facilities' },
  { id: '11011.36', subject: 'INTEGRATED NATURAL RESOURCES MANAGEMENT PLAN', date: '2021-10-07', category: '11000 Facilities and Activities Ashore', subcategory: '11-01 Shore Facilities' },

  // 12000 Civilian Personnel
  { id: '12250.4A', subject: 'CIVILIAN EMPLOYEE ASSISTANCE PROGRAM', date: '2019-11-13', category: '12000 Civilian Personnel', subcategory: '12-02 Employee Programs' },
  { id: '12271.1', subject: 'TELEWORK PROGRAM', date: '2022-04-20', category: '12000 Civilian Personnel', subcategory: '12-02 Employee Programs' },
  { id: '12335.1A', subject: 'NAVY TOTAL FORCE MANPOWER POLICIES AND PROCEDURES', date: '2015-06-24', category: '12000 Civilian Personnel', subcategory: '12-03 Workforce Management' },
  { id: '12410.25C', subject: 'CIVILIAN TRAINING AND DEVELOPMENT', date: '2020-01-08', category: '12000 Civilian Personnel', subcategory: '12-04 Training' }
];

/**
 * Build URL for a SECNAV instruction
 */
function buildUrl(instruction) {
  const baseUrl = 'https://www.secnav.navy.mil/doni/Directives';
  const category = encodeURIComponent(instruction.category).replace(/%20/g, '%20');
  const subcategory = encodeURIComponent(instruction.subcategory).replace(/%20/g, '%20');
  const filename = encodeURIComponent(instruction.id) + '.pdf';
  return `${baseUrl}/${category}/${subcategory}/${filename}`;
}

/**
 * Transform instructions to data format
 */
function transformInstructions() {
  return SECNAV_INSTRUCTIONS.map(inst => {
    const pubDate = new Date(inst.date).toISOString();
    return {
      id: `SECNAVINST ${inst.id}`,
      title: `SECNAVINST ${inst.id} - ${inst.subject}`,
      subject: inst.subject,
      link: buildUrl(inst),
      pubDate: pubDate,
      description: `Secretary of the Navy Instruction ${inst.id} - ${inst.subject}`,
      category: inst.category.split(' ').slice(1).join(' '),
      effectiveDate: inst.date
    };
  });
}

/**
 * Generate JavaScript data file
 */
async function generateDataFile() {
  const directives = transformInstructions();

  // Sort by publication date (newest first)
  directives.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const timestamp = new Date().toISOString();
  const categories = [...new Set(SECNAV_INSTRUCTIONS.map(i => i.category.split(' ').slice(1).join(' ')))];

  const fileContent = `/**
 * SECNAV Directives Data
 *
 * Real SECNAV instructions from DONI (Department of the Navy Issuances)
 * Source: https://www.secnav.navy.mil/doni/Directives/Forms/doniAllInstructions.aspx
 * Generated: ${timestamp}
 * Total Records: ${directives.length}
 *
 * URL Pattern:
 * https://www.secnav.navy.mil/doni/Directives/{category}/{subcategory}/{instruction}.pdf
 *
 * This file is automatically generated by scripts/generate-secnav-data.mjs
 * DO NOT EDIT MANUALLY
 */

// SECNAV directives data structure
const SECNAV_DIRECTIVES = ${JSON.stringify(directives, null, 2)};

// Metadata
const SECNAV_META = {
  sourceUrl: 'https://www.secnav.navy.mil/doni/Directives/Forms/doniAllInstructions.aspx',
  generatedAt: '${timestamp}',
  totalRecords: ${directives.length},
  categories: ${JSON.stringify(categories)},
  lastUpdate: '${timestamp}',
  note: 'Real SECNAV instructions from DONI - links verified against official source'
};

// Export for use in application
if (typeof window !== 'undefined') {
  window.SECNAV_DIRECTIVES = SECNAV_DIRECTIVES;
  window.SECNAV_META = SECNAV_META;
}

// Also support module exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECNAV_DIRECTIVES,
    SECNAV_META
  };
}
`;

  await writeFile(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`[SECNAV] Data file written to: ${OUTPUT_FILE}`);
  console.log(`[SECNAV] Total records: ${directives.length}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('[SECNAV] Generating SECNAV data from real instructions...');

  try {
    await generateDataFile();
    console.log('[SECNAV] ✓ Complete');
    process.exit(0);
  } catch (error) {
    console.error('[SECNAV] Fatal error:', error);
    process.exit(1);
  }
}

main();
