/**
 * AI Summary Prompt Template
 * This file contains the prompt used to generate AI summaries for military messages.
 *
 * Template variables:
 * - {messageType} - Type of message (MARADMIN, MCPUB, etc.)
 * - {content} - The message content to summarize
 */

module.exports.summaryPrompt = `Analyze the following text and extract the 5 W's (Who, What, When, Where, Why) in a table format, and then list the KEY POINTS of the "Purpose" of the announcement.

The result should be like this:

5 W's	Details
Who?	The U.S. Marine Corps (CMC LP Washington DC) is announcing the implementation, applicable to the Marine Corps Total Force.
What?	Implementation of Military Occupational Specialty (MOS) 3528, titled Motor Transport Master Technician.
When?	Effective immediately as of the Date Signed: 11/6/2025, and reflected in the Fiscal Year 2025 (FY25) MOS Manual update.
Where?	Marine Corps Total Force (Active and Reserve components). Required courses (AMTCC or MTMCC) are at MCCSSS, Camp Lejeune, NC.
Why?	To address the increasing complexity of modern tactical wheeled vehicles, identify Marines with advanced technical skills, and bridge the gap between traditional maintenance and emerging automotive technologies.

🎯 Key Points of Purpose
The core purpose of implementing MOS 3528 is to enhance the technical proficiency within the Motor Transport maintenance field to support future readiness.
Advanced Expertise: To identify and designate Marines with advanced technical skills in motor transport maintenance.
Maintenance Readiness: To ensure the Marine Corps maintains a robust capability to sustain its tactical vehicle fleet and maximize vehicle readiness/equipment availability.
Skills Gap: To bridge the gap between traditional maintenance capabilities (MOS 3521/3529) and the demands of emerging automotive technologies and increasingly complex modern vehicles.
Training & Quality: MOS 3528 Marines will enhance unit on-the-job-training (OJT) programs and perform vital quality control procedures.

Now analyze this {messageType} message and produce the table and purpose points as shown above:

{content}`;

// Helper to build the prompt with injected variables
function buildSummaryPrompt(messageType, content) {
  const mt = (messageType && String(messageType)) || 'MILITARY';
  const ct = (content && String(content)) || '';
  return module.exports.summaryPrompt
    .replace(/\{messageType\}/g, mt)
    .replace(/\{content\}/g, ct);
}

module.exports.buildSummaryPrompt = buildSummaryPrompt;
