# Android Application Architecture & Feature Plan

## Overview
This document outlines the architecture, UI flow, and technical implementation plan for porting the Quantitative Trading Dashboard to an Android application. It introduces a free-tier "Local/Drive Persistence" layer so users can sync their custom Portfolio and Trade data using their Google account, removing the need for a central paid backend for this specific feature.

## 1. Core Endpoints Used (For Backtest/Strategy Data)
The application currently consumes read-only data from your custom Wix Studio API endpoints. These will be identical in the Android app:

*   **Primary Live Dashboard Data (KPIs, Active Trades, Closed Trades, Signals):**
    *   **Endpoint:** `GET https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData`
    *   **Headers:** `Accept: application/json`
    *   **Purpose:** Provides the core data feed for `inTradeTrades`, `toBuySignals`, `closedTrades`, and overall strategy performance `kpis`.
*   **Upcoming / Bounce Setups:**
    *   **Endpoint:** `GET https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/upcomingStock`
    *   **Headers:** `Accept: application/json`
    *   **Purpose:** Fetches stocks that are in the "upcoming" or "setup" phase.

*(Note: In the React app, these are wrapped in `/api/terminal-data` proxies to avoid CORS. In Android natively, you can call them directly using Retrofit or Ktor without CORS issues).*

## 2. Local Storage & Google Drive Sync (The "Free Tier" Architecture)
Instead of storing manual user actions (like adding a stock to Portfolio or logging a Sell action) on a centralized database, the Android app will use **Local SQLite (Room Database)** synced to **Google Drive App Data Folder**.

### Architecture:
1.  **Authentication:** Google Sign-In (OAuth 2.0).
2.  **Local Database (Room/SQLite):** 
    *   `PortfolioTable`: Tracks active manual holdings (`symbol`, `buyPrice`, `quantity`, `buyDate`).
    *   `MyTradesTable`: Tracks closed/sold trades (`symbol`, `buyPrice`, `sellPrice`, `quantity`, `buyDate`, `sellDate`, `pnl`).
3.  **Cloud Sync (Google Drive REST API):**
    *   Use the `https://www.googleapis.com/auth/drive.appdata` scope. This creates a hidden folder in the user's Google Drive that only this app can access.
    *   **Sync Logic:** Every time the user adds a portfolio item or sells an item, the app saves it to Room locally, serializes the Room database to JSON (e.g., `user_trades.json`), and silently uploads it to the Drive AppData folder.
    *   When the user installs the app on a new phone and logs in, it downloads `user_trades.json` and populates the local Room database.

## 3. UI/UX Flow & Tabs (Android Material 3)

### Bottom Navigation Bar:
1.  **Dashboard (Active & Upcoming):**
    *   Top section: Strategy KPIs and Win Rates (Horizontal scrolling cards).
    *   List view of `inTradeTrades` (Entry Price, MFE, LTP) and `toBuySignals`.
    *   *Interaction:* Swiping left on a card reveals a "Add to Portfolio" quick action.
2.  **Portfolio (Holdings):**
    *   Displays current active holdings fetched from the local Room database.
    *   *Interaction:* Tapping a holding opens a Bottom Sheet to enter "Sell Details" (Sell Price, Quantity).
    *   Once sold, the item is moved to the "My Trades" tab.
3.  **My Trades (Profit & Loss):**
    *   Displays historic closed trades from the user's manual portfolio.
    *   Header shows Total Realized P&L (Total Profit / Total Loss).
    *   List items show `Symbol`, `Buy Price`, `Sell Price`, `Return %`, and total `₹ Profit`.
4.  **Market / Closed:**
    *   Displays the algorithm's global closed trades (`closedTrades` from the Wix API) for reference.

## 4. Implementation Steps for the LLM Prompting
*Pass these exact instructions to the LLM generating your Android code:*

1.  **Tech Stack:** Use Kotlin, Jetpack Compose for UI, Room for local database, Retrofit for Wix API calls, and Google Sign-In SDK with Drive API.
2.  **Database Entities:** 
    *   `PortfolioEntity(id, symbol, buyPrice, quantity, timestamp)`
    *   `ClosedTradeEntity(id, symbol, buyPrice, sellPrice, quantity, pnl, timestamp)`
3.  **Drive Sync Manager:** Create a Coroutine Worker that runs in the background. On changes to Room, convert `List<PortfolioEntity>` and `List<ClosedTradeEntity>` to a Gson string and use `Drive.Files.create` to upload to the `appDataFolder`.
4.  **Portfolio to MyTrades Flow:** When the user clicks "Sell" on a Portfolio item in Compose, trigger an intent to insert a new `ClosedTradeEntity`, delete the `PortfolioEntity`, and recalculate the P&L state.
