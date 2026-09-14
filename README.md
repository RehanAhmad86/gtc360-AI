---
title: GTC360 AI Grant Matching Engine
emoji: 🏛️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# GTC 360° AI — Intelligent Grant Matching Engine

> **Project Status: Active Development**  
> *This repository contains the backend intelligence service and AI matching engine for GTC 360°.*

---

## 📌 Executive Summary

Finding and tracking relevant government grants is traditionally a slow, manual, and overwhelming process. Organizations must navigate multiple government portals, sift through lengthy policy announcements, and struggle to identify which funding programs genuinely match their mission and eligibility.

**GTC 360° AI** is an intelligent funding intelligence engine designed to solve this problem. It continuously tracks federal and California state funding opportunities, analyzes their objectives and requirements, and automatically pairs them with an organization's specific funding priorities using artificial intelligence.

---

## 💡 How This System Benefits Organizations

* **Save Hundreds of Hours:** Eliminates the need for grant writers, nonprofit leaders, and business managers to manually search through government websites every day.
* **Never Miss an Opportunity:** Tracks live announcements as well as forecasted future programs from federal agencies and state departments in real time.
* **AI Match Scoring:** Instead of simple keyword lookups, the engine reads and interprets the full context of each grant, giving each opportunity a personalized relevance score (e.g., *88% Match*).
* **Strategic Decision-Making:** Helps organizations quickly evaluate funding ranges, application deadlines, and eligibility criteria so they only spend time applying for high-probability grants.

---

## ⚙️ Core Capabilities & Features

### 1. Dual-Source Public Funding Ingestion
* **Federal Grants:** Automatically gathers open and forecasted grant opportunities from federal agencies via **Grants.gov**.
* **State of California Grants:** Aggregates funding announcements from California state departments via the **California State Grants Portal**.
* **Unified Data Standards:** Normalizes diverse data sources into a single, structured format with clear deadlines, award floors and ceilings, eligible applicant types, and funding descriptions.

### 2. Semantic AI Matching Engine
* **Context-Aware Evaluation:** Traditional search engines rely only on exact keyword matches. This engine uses semantic vector models to understand the *meaning* and *intent* behind grant descriptions.
* **Dynamic Alignment:** Evaluates an organization's focus areas (e.g., *Clean Energy*, *STEM Education*, *Public Health*, *Agriculture*) against the grant’s core objectives.
* **Weighted Relevance Scoring:** Combines semantic similarity, agency affinity, and focus categories to calculate a clear, transparent percentage match.

### 3. Organization Preferences & Focus Criteria
* **Custom Priority Categories:** Organizations can select from specialized categories to target funding that directly fits their mission.
* **Agency Preferences:** Allows prioritizing or focusing on specific funding bodies (e.g., Department of Energy, Health Resources and Services Administration, California Department of Fish and Wildlife).
* **Budget & Award Thresholds:** Filter out opportunities that fall outside an organization's target budget capacity (minimum and maximum award sizes).

### 4. Continuous Data Synchronization
* Background sync routines verify that grant listings, application deadlines, and statuses (*Posted*, *Forecasted*, *Closed*) remain fresh and up to date.

---

## 🏗️ Architecture & Modules (Backend Overview)

The engine is built as a lightweight, high-performance Python microservice:

* **Matching Engine (`matcher.py`):** Calculates semantic similarity between organization preferences and opportunities in milliseconds using pre-computed vector embeddings.
* **Data Integration & Normalizer (`fetch_and_unify_grants.py`):** Ingests raw data from federal and state portals and unifies them into standard opportunity records.
* **Background Sync Service (`sync_service.py`):** Manages periodic data updates and ensures zero-downtime cache reloads.
* **Database & Storage (`db.py`):** Manages opportunity records, organization preference profiles, and user sessions with secure, encrypted credential storage.
* **API Service (`main.py`):** Exposes high-speed RESTful endpoints for searching, filtering, matching, and account management.

---

## 🚦 Current Development Status

This backend service is currently **under active development**. Ongoing priorities include:
- [x] Dual-source data aggregation (Federal & California state)
- [x] Vector embedding generation and semantic similarity pipeline
- [x] Preference-based ranking and scoring calculation
- [x] Secure organization profile and criteria storage
- [ ] Expanded agency lookup taxonomies and sub-agency mapping
- [ ] Automated scheduled sync triggers for daily grant refreshes
- [ ] Enhanced scoring models for complex eligibility criteria

---

## 🚀 Quick Setup (For Running the Service)

### Prerequisites
* Python 3.10+
* MongoDB database instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RehanAhmad86/gtc360-AI.git
   cd gtc360-AI
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Copy the example environment file and update with your database details:
   ```bash
   cp .env.example .env
   ```

5. **Start the API service:**
   ```bash
   uvicorn main:app --reload --port 7860
   ```

6. **Interactive Documentation:**
   Once the service is running, explore the interactive documentation at:
   ```
   http://localhost:7860/docs
   ```

---

## 📄 License & Confidentiality
*All rights reserved. Proprietary software developed for GTC 360° Advisors LLC.*
