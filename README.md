# Who Handles This?: AI for Navigating Government Services Across Languages

**Client:** City of San José, multilingual access to government services  
**Team:** David Chen, William, Naina, Jennie | Aug–Oct 2026  
**My part:** I designed and built the prototype using Replit AI, including the multilingual resident interface, agency-routing workflow, routing history, and staff review features.

**Live prototype:** https://who-handles-this.replit.app/

## The problem

San José residents, especially those facing language barriers, may struggle to identify which government agency handles their needs. Information spread across agency websites makes it difficult to find the appropriate contact and understand the next step.

## What we built

- An AI-assisted prototype that interprets residents’ descriptions of their needs and recommends relevant government agencies.
- A resident interface with seven language options, agency information, suggested next steps, and saved routing history.
- A separate staff review workflow for uncertain cases and contact corrections; authorized staff retain responsibility for reviewing and approving those corrections.

## What I would do next

The prototype has not yet been validated through usability testing with residents and City staff. I would conduct multilingual user testing, use the findings to improve routing and instructions, and learn how to measure task completion and routing accuracy.

## Source code

The source files are included in this repository. The application uses React, TypeScript, Express, and PostgreSQL with Drizzle ORM. Development and operation notes are in `replit.md`.

## Evaluation evidence

`reports/civic-readiness/evaluation-summary.md` records 22/22 synthetic cases passing in an October 5, 2026 prototype evaluation. This is a developer-authored test result, not independent City validation, production accuracy, or measured time savings.
