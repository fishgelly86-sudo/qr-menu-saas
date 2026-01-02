# Comprehensive Technical Audit Prompt — Restaurant QR Ordering SaaS

## Context

You are a **comprehensive technical auditor** reviewing a restaurant QR ordering SaaS that is partially built and about to be pitched to real restaurant owners.

**Current State:**
- The system has MVP functionality (customers can order, kitchen sees orders)
- But there are **critical logic issues**, **missing error handling**, **unsafe failure scenarios**, and **incomplete resilience** throughout the system
- The founder wants a **detailed technical audit** covering EVERY aspect before pitching to restaurants
- This is not just about finding bugs—it's about ensuring a **production-ready**, **robust**, **fail-safe** system that can handle real-world use

**Your Goal:** 
Provide a **comprehensive audit** analyzing the system across 10 critical areas:

---

## PART A: Business Logic & Data Model

### What to Audit:

1. **Order Lifecycle & State Machine**
   - Does the system enforce a strict order state flow? (DRAFT → PENDING → IN_PROGRESS → READY → COMPLETED)
   - Can orders go backwards? (e.g., COMPLETED → PENDING?)
   - Are state transitions validated on the server?
   - What data persists at each state?
   - Are items locked once status = PENDING?

2. **Order Grouping (Critical Issue)**
   - Does the dashboard show one card per order, or one card per item?
   - If showing one card per item: that's wrong and needs to change
   - How are orders currently queried? (by orderId or by itemId?)
   - What database schema changes are needed?
   - What React component changes are needed?

3. **Idempotency & Duplicate Prevention**
   - Is there an `idempotencyKey` field in the orders table?
   - What happens if a customer clicks "Confirm" twice on slow internet?
   - Is there a unique constraint on `(restaurantId, idempotencyKey)`?
   - Does the system return existing orderId if duplicate key is detected?
   - How long are idempotency keys remembered (1 hour? 24 hours?)?

4. **Table Session Management**
   - Is there a `tableSession` table?
   - When a customer clicks "Start new order", what happens?
   - Does it delete the previous order (WRONG) or just clear the cart UI (CORRECT)?
   - Can a table session have multiple orders?
   - How does the manager "close table" and finalize the bill?

**Deliverable for Part A:**
- Assessment of current schema vs production requirements
- Specific database changes needed
- Risk level: which issues will break during demo?

---

## PART B: Error Handling & Resilience

### What to Audit:

1. **Network Failure Recovery**
   - What happens if `placeOrder` times out during order submission?
   - Is there auto-retry logic (how many times? exponential backoff?)?
   - Does the system show persistent "Waiting for connection..." feedback to customer?
   - Is the draft cart stored in IndexedDB as backup?
   - What's the timeout threshold (5s? 30s? 60s?)?

2. **Printer Offline Scenarios**
   - What happens if the kitchen printer is offline when order is created?
   - Does the order still get created in DB, or does it fail entirely?
   - Is there a retry queue for failed print jobs?
   - How many retry attempts (1? 3? infinite?)?
   - What alerts the manager that a print job failed?
   - Can the manager manually re-print?

3. **Database Temporary Outages**
   - If Convex is temporarily down, what happens to orders in progress?
   - Does the app show "Offline mode" or just error out?
   - Are GET requests cached locally?
   - Are POST requests queued locally?
   - How does sync happen when DB comes back online?

4. **Data Validation (Client + Server)**
   - Client-side validation:
     - Can customer place empty order?
     - Can customer add negative quantities?
     - Does system validate restaurantId and tableId match?
   - Server-side validation:
     - Are ALL client inputs re-validated?
     - Can customer change prices in cart to be lower?
     - Are menu items checked (not archived/deleted)?
     - Are customizations sanitized (no injection)?
   - What error messages are shown (generic "Error 500" or meaningful)?

5. **Race Conditions**
   - What if kitchen marks order READY while customer adds more items?
   - What if manager closes table while customer is placing order?
   - What if two kitchens both try to mark same order as READY?
   - Are database-level constraints preventing conflicts?

**Deliverable for Part B:**
- Specific error scenarios tested vs untested
- Retry logic audit (how many times? backoff strategy?)
- Validation audit (client + server completeness)
- Risk assessment: likelihood of failure in production

---

## PART C: Customer Experience

### What to Audit:

1. **Order Confirmation Page (Critical UX Issue)**
   - Current: Is there a "Start new order" button that deletes previous orders? ❌
   - Correct: Should only have "Browse Menu" (clears cart, doesn't delete order) ✅
   - Does the confirmation page show: Order ID, Table, Items, Total, Estimated wait?
   - Is there a "View Order Status" button to track preparation?

2. **Real-Time Order Tracking**
   - After confirming order, can customer see live status updates?
   - Does status page show: PENDING → IN_PROGRESS → READY?
   - Is it using Convex real-time subscription (auto-updates without refresh)?
   - Does it show estimated prep time?
   - Does it show timeline: ordered at 2:10 → cooking started 2:12 → ready 2:25?

3. **Clear Status Updates**
   - Are order statuses clearly labeled and visible?
   - Does customer see meaningful messages?
     - ✅ Good: "🔄 Your order is being prepared... ~10 mins remaining"
     - ❌ Bad: "Status: 2" or missing feedback
   - Is there a notification when order is ready?
   - Can customer see if there's a delay (e.g., "Taking longer than expected")?

**Deliverable for Part C:**
- UX audit of confirmation page and tracking page
- Assessment of real-time capability
- Recommendations for clarity and feedback

---

## PART D: Kitchen Workflow

### What to Audit:

1. **Printer vs Digital Display Setup**
   - Is the system using thermal printer or digital KDS (Kitchen Display System)?
   - **If printer:**
     - What does the ticket look like? (Is it readable from 6 feet away?)
     - Does it include: Order ID, Table #, Items, Customizations, Notes, Timestamp?
     - Are NON-essentials excluded (payment info, customer name if not needed)?
     - Print width: standard is 80mm thermal printer
   - **If digital display:**
     - Do orders appear in queue automatically?
     - Are they color-coded by age? (Green < 5 min, Yellow 5-10 min, Red > 10 min)
     - Can kitchen staff click "Mark Ready" easily?

2. **Multi-Station Ordering (If Applicable)**
   - If restaurant has Grill + Fryer + Drinks stations, how are orders divided?
   - **Option 1:** Print one ticket per station? (Grill gets: "Biryani", Fryer gets: "Fries")
   - **Option 2:** Digital display where each station marks their items done?
   - Can kitchen see progress across stations (waiting on Grill, Fryer done, Drinks done)?

3. **Order Grouping for Kitchen**
   - Does kitchen see items clearly?
   - Are customizations visible? ("No salt", "Extra sauce")?
   - Are special notes/allergies highlighted in RED?
   - Is table number clear (so they know where to deliver)?

**Deliverable for Part D:**
- Assessment of current kitchen workflow setup
- Recommendations for order clarity and flow
- Testing with real kitchen staff feedback

---

## PART E: Manager Dashboard

### What to Audit:

1. **Real-Time Order View**
   - Does dashboard auto-update in real-time (Convex subscription)?
   - Does it show: Order ID, Table, Items, Status, Time Waiting, Estimated Ready?
   - Are orders sorted by oldest first (highest priority)?
   - Is it color-coded by wait time? (Green < 10 min, Yellow 10-20 min, Red > 20 min)
   - Can manager click order to expand and see full details?
   - Is it responsive (no lag with 50+ orders)?

2. **Kitchen Device Monitoring**
   - Does manager see device status? (🟢 Online / 🔴 Offline)
   - For each device (printer, tablet, KDS):
     - Last seen timestamp?
     - Alert if offline for > 2 minutes?
     - Can manager manually "Retry failed prints"?
   - Does offline alert appear prominently (banner? sound notification)?

3. **Order History & Search**
   - Can manager search past orders? (by date range? table? order ID?)
   - Is there an audit trail? (when created, confirmed, printed, ready, completed)
   - Can manager see failed orders (that weren't printed)?
   - Is there a "mark as refund" or "mark as cancelled" action?

**Deliverable for Part E:**
- Dashboard functionality audit
- Device monitoring completeness
- Search/history capabilities
- UI/UX assessment

---

## PART F: Analytics & Debugging

### What to Audit:

1. **What to Track (For Insights + Support)**
   - Per order: creation time, confirmation time, print time, ready time, completion time
   - Per restaurant (daily): total orders, total revenue, average prep time, peak hours, error rate
   - Per item: popularity, average prep time, most modified
   - Printer metrics: success rate, failure rate, retry count, uptime %
   - Network metrics: average response time, timeout rate

2. **How to Debug "Missing Orders"**
   - Can you search orders by date + table + status?
   - Can you see full order timeline (created → confirmed → printed → ready)?
   - Can you check printer logs (did it print? when?)?
   - Can you check kitchen device heartbeat (was it online?)?
   - Can you check customer app logs (did request reach server?)?
   - Do orders have `idempotencyKey` for duplicate detection?
   - Is there an immutable audit log (orders never deleted, only archived)?

3. **Logging & Monitoring**
   - What gets logged? (every placeOrder, updateStatus, print attempt)
   - Is there a centralized logging system (Sentry, LogRocket)?
   - Are there alerts if:
     - Error rate > 5% in last hour?
     - Printer offline for > 5 minutes?
     - Convex DB response time > 2 seconds?
   - Can you view real-time logs to debug issues?

**Deliverable for Part F:**
- Analytics implementation audit
- Debugging capability assessment
- Logging/monitoring gaps
- Recommendations for observability

---

## PART G: Offline PWA & Service Worker

### What to Audit:

1. **Offline Menu Caching**
   - Does the system cache the menu when user first loads?
   - Can customers browse cached menu if internet goes down?
   - What's cached? (menu items, prices, images, descriptions)
   - Service worker implementation: is it using Workbox or custom?
   - What's the cache strategy? (cache-first, stale-while-revalidate, network-first?)

2. **Offline Order Placement**
   - If internet drops while customer is placing order, what happens?
   - Is the draft saved to IndexedDB?
   - When internet returns, does it auto-retry with idempotency key?
   - Does customer see "Order queued... syncing when online" status?
   - Or does it fail with "No internet, please try again"?

3. **PWA Installation**
   - Can users "Install" the app to home screen?
   - Does it work offline (at least menu browsing)?
   - Is there a manifest.json with proper metadata?

**Deliverable for Part G:**
- PWA maturity assessment
- Offline capability audit
- Service worker implementation review

---

## PART H: Testing Checklist

### What to Audit:

1. **Happy Path (Should Always Work)**
   - [ ] Customer scans QR → browses menu → adds item → confirms order
   - [ ] Order appears in kitchen printer/display within 2 seconds
   - [ ] Manager dashboard updates in real-time (no page refresh)
   - [ ] Kitchen marks as "Ready" → customer sees status change immediately
   - [ ] Price calculation is correct (no math errors)
   - [ ] Multiple orders from same table accumulate (not replace each other)

2. **Error Scenarios (Critical to Test)**
   - [ ] Network fails during placeOrder → auto-retry kicks in
   - [ ] Customer refreshes page after confirming → no duplicate order created
   - [ ] Customer clicks "Confirm" twice fast → idempotency prevents duplicate
   - [ ] Printer is offline → order queues, prints when online
   - [ ] Kitchen device crashes → manager gets alert within 2 minutes
   - [ ] Invalid menu item in cart → server rejects with clear error message
   - [ ] "Start new order" button pressed → clears cart, doesn't delete previous order
   - [ ] "Close table" during active order → handled gracefully (not lost)
   - [ ] Negative price in cart → server rejects
   - [ ] Empty order submission → blocked with "add items first" message

3. **Load Testing (Performance)**
   - [ ] System handles 50 concurrent orders in 1 minute
   - [ ] All 50 orders print within 5 seconds
   - [ ] Dashboard loads and responds without lag (100+ open orders)
   - [ ] No timeout errors on server
   - [ ] Printer queue doesn't overflow/crash

4. **Staff Acceptance Testing**
   - [ ] Non-tech restaurant staff can use without training
   - [ ] Kitchen staff see orders clearly (readable, not confusing)
   - [ ] Manager dashboard is intuitive (understands all buttons/info)
   - [ ] Printer output is legible (font size, layout readable from 6 feet)
   - [ ] All text in correct language (Arabic + English for Algeria?)
   - [ ] Response time feels responsive (no perception of lag)

**Deliverable for Part H:**
- Test coverage audit
- Critical gaps in testing
- Recommended test automation
- Load test results (or recommendations for testing)

---

## PART I: Deployment & Operations

### What to Audit:

1. **Staging Environment**
   - Does staging mirror production exactly? (same schema, same Convex config)
   - Can you test changes safely in staging before prod?
   - Can you revert deployments quickly?
   - Are there separate API keys for staging vs prod?

2. **Monitoring & Alerting**
   - Uptime monitoring: do you know if your API is down?
   - Error rate monitoring: do you know if orders are failing?
   - Performance monitoring: do you know if it's slow?
   - Device monitoring: do you know if kitchen printer is offline?
   - Alerts: are you notified automatically (email/SMS/Slack) when something breaks?

3. **Backup & Recovery**
   - Are database backups daily? Weekly?
   - Can you restore to a point-in-time if data corruption?
   - Have you tested recovery process (don't assume backups work)?
   - What's your RTO (Recovery Time Objective)? RPO (Recovery Point Objective)?

4. **On-Call Support Plan**
   - What if system breaks at 2 AM and restaurant is open?
   - Do you have 24/7 support, or business hours only?
   - How do you notify the restaurant if there's an outage?
   - Do you have a documented runbook for common issues?

**Deliverable for Part I:**
- Deployment readiness assessment
- Monitoring coverage gaps
- Backup/recovery validation
- Support plan assessment

---

## PART J: Security & Data Privacy

### What to Audit:

1. **Data Privacy**
   - Are payment card details stored? (WRONG—use Stripe/Fawry tokens)
   - Are passwords hashed? (never plain text)
   - Are API keys encrypted? (not hardcoded in code)
   - GDPR compliance: can users request data deletion?
   - Audit logs: who accessed what, when?

2. **API Security**
   - Do all endpoints require authentication? (is unauthenticated access blocked?)
   - Rate limiting: can someone DDoS by sending 1000 requests/second?
   - Input validation: are all inputs sanitized (prevent SQL injection, XSS)?
   - HTTPS only: is HTTP disabled?
   - CORS: is cross-origin restricted to safe domains?

3. **Access Control**
   - Can restaurant staff see only their own orders (not other restaurants)?
   - Can kitchen staff see manager settings? (should be NO)
   - Can customers modify orders after PENDING? (should be NO)
   - Are permissions enforced on server (not just hidden in UI)?

**Deliverable for Part J:**
- Security audit findings
- Privacy compliance assessment
- Recommended security improvements
- Penetration testing recommendations

---

## SUMMARY: Questions to Answer for Each Section

For each section (A-J), provide:

1. **What's Currently Implemented?**
   - What's working well?
   - What's missing or incomplete?

2. **What's Broken or Unsafe?**
   - What could fail in production?
   - What happens in failure scenarios?

3. **Priority Ranking:**
   - 🚨 CRITICAL (will break during demo / customer loses data)
   - 🟡 IMPORTANT (causes frustration / poor UX)
   - 🟢 NICE-TO-HAVE (polish / future improvement)

4. **Specific Recommendations:**
   - What code/logic needs to change?
   - What testing is needed?
   - Timeline to fix?

5. **Risk Assessment:**
   - Likelihood of failure in production (0-100%)?
   - Impact if it fails?
   - Recommended safeguards?

---

## Expected Deliverable Format

Provide a comprehensive audit document with:

1. **Executive Summary** (1 page)
   - Overall readiness assessment
   - Top 3 critical issues blocking production
   - Confidence level in current system (%)

2. **Section A-J Analysis** (detailed breakdown)
   - Current state
   - Issues found
   - Priority ranking
   - Specific recommendations
   - Code examples (if applicable)
   - Timeline to fix

3. **Critical Path to Production** (prioritized roadmap)
   - Must fix before demo
   - Must fix before production
   - Can fix post-MVP

4. **Risk & Mitigation Plan**
   - Highest risks identified
   - Likelihood & impact
   - How to mitigate each risk
   - What to monitor in production

5. **Testing Strategy**
   - What tests exist
   - Critical gaps
   - Recommended test plan
   - Load testing results

---

## Success Criteria

You're done when the founder has:

✅ Clear understanding of all issues (critical vs nice-to-have)
✅ Specific, actionable recommendations for each issue
✅ Confidence in what will/won't fail during demo
✅ Confidence in what will/won't fail in production
✅ A prioritized roadmap for fixes
✅ Understanding of testing gaps
✅ A risk mitigation plan

---

**This is a comprehensive audit. Be thorough, specific, and honest about production readiness.** 🔍
