/**
 * AI Summary Prompt Template
 * This file contains the prompt used to generate AI summaries for military messages.
 *
 * Template variables:
 * - {messageType} - Type of message (MARADMIN, MCPUB, etc.)
 * - {content} - The message content to summarize
 */

module.exports.summaryPrompt = `CRITICAL INSTRUCTION: You MUST output ONLY in the exact format below. DO NOT create your own section headers. DO NOT use headers like "PURPOSE:", "OVERVIEW:", "ACTIVE RESERVE:", etc. You MUST use ONLY the 5W format specified.

Fill in this template with information from the message:

💰 [EXTRACT TITLE FROM MESSAGE - USE ALL CAPS] 💰
---
**5W OVERVIEW:**
* **WHO:** [Write one line: who is affected - specific ranks, units, or "All Marines"]
* **WHAT:** [Write one line: what is the main action, change, or requirement]
* **WHEN:** [Write one line: key dates in format "DD MMM YYYY" or "N/A"]
* **WHERE:** [Write one line: location/command or "All Marines" or "Worldwide" or "N/A"]
* **WHY:** [Write one line: the reason or purpose - keep to ONE sentence]

---
🎯 **KEY POINTS/ACTIONS:**

**[PICK A SECTION NAME IN ALL CAPS]:**
• [First key point]
• [Second key point]
• [Third key point if needed]

**[PICK ANOTHER SECTION NAME IN ALL CAPS]:**
• [First key point]
• [Second key point]

**[ADD MORE SECTIONS AS NEEDED - KEEP SECTIONS BRIEF]:**
• [Key points here]

REQUIREMENTS - READ CAREFULLY:
1. START with the 5W OVERVIEW section - this is MANDATORY and comes FIRST
2. Each W (WHO, WHAT, WHEN, WHERE, WHY) gets EXACTLY ONE line - no exceptions
3. DO NOT create custom section headers - use only "5W OVERVIEW" and "KEY POINTS/ACTIONS"
4. Under KEY POINTS, you MAY create subsections in ALL CAPS (e.g., "REQUIRED TRAINING:", "DEADLINES:", "ELIGIBILITY:")
5. Use bullet points (•) for all lists
6. Keep total under 400 words
7. Focus on actionable items and critical dates

WRONG FORMAT EXAMPLES (DO NOT DO THIS):
❌ **PURPOSE:** ...
❌ **OVERVIEW:** ...
❌ **ACTIVE RESERVE:** ...
❌ **INELIGIBILITY CRITERIA:** ... (don't use as main section)
❌ Creating sections outside of KEY POINTS/ACTIONS

CORRECT FORMAT EXAMPLE:
✅
💰 FISCAL YEAR 2026 TOTAL FORCE INTEGRATOR BOARD 💰
---
**5W OVERVIEW:**
* **WHO:** Active Reserve (AR) Marines interested in force integration roles
* **WHAT:** FY26/FY27 Total Force Integrator Free MOS Selection Board convening
* **WHEN:** Board convenes 2 DEC 2025, applications due 24 NOV 2025
* **WHERE:** Billets at DC PP&O, I MEF, II MEF, III MEF
* **WHY:** Enable Total Force preparedness for large-scale mobilization planning

---
🎯 **KEY POINTS/ACTIONS:**

**ELIGIBILITY:**
• Must be currently serving in Active Reserve Program
• Must apply via online portal and be board-selected
• Alternates can fill primary vacancies

**APPLICATION DEADLINE:**
• Submit by 24 NOV 2025 via https://www2.manpower.usmc.mil/application_cac/
• Email backup: joinar@usmc.mil for portal issues

**TRAINING TIMELINE:**
• FY26 selectees: Enroll 1 FEB 2026, complete by 1 JUN 2026
• FY26 Marines: Report for duty 15 AUG 2026
• FY27 selectees: Enroll 15 JUN 2026, complete by 15 DEC 2026

**AVAILABLE BILLETS:**
• LtCol/Maj/MSgt positions at DC PP&O
• LtCol/Maj/MSgt/GySgt positions at I/II/III MEF

Now extract information from this {messageType} message and fill in the template above:

{content}`;
