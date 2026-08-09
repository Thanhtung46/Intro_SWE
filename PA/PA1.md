**Introduction to Software Engineering**

<img src="media/PA1/media/image9.png" style="width:7.42188in;height:1.82292in" />

*Prepared by:  *
Nguyễn Thái Cường (24127336)  
Nguyễn Thanh Tùng (24127583)  
Đỗ Trương Khoa (24127423)  
K’Vớn (24127593)  
Đào Hoàng Phúc (24127496)

> *Instructor*:  
> Dr. Trần Duy Hoàng  
> MSc. Trương Phước Lộc  
> MSc. Phạm Hoàng Hải

**Table of Contents**

[**Objectives 1**](#objectives)

[**1 Member Contribution Assessment 2**](#member-contribution-assessment)

[**2 Problem Statement 3**](#problem-statement)

[**3 Requirements Overview 5**](#requirements-overview)

> [3.1 Stakeholders 5](#)
>
> [3.2 Requirements 8](#)
>
> [3.2.1. Functional Requirements Specification 8](#functional-requirements-specification)
>
> [3.2.2. Non-Functional Requirements Specification 11](#non-functional-requirements-specification)

[**4 Requirements Analysis 13**](#requirements-analysis)

> [4.1 Use Case model 13](#)
>
> [4.2 Use Case Specification 14](#)
>
> [4.2.1. Authentication & Account Management 14](#authentication-account-management)
>
> [4.2.2. Venue Search, Booking & Venue Operations 22](#venue-search-booking-venue-operations)
>
> [4.2.3. Matchmaking 35](#matchmaking)
>
> [4.2.4. Payment & Deposit 39](#payment-deposit)
>
> [4.2.5. Notification & No-Show Prevention 43](#notification-no-show-prevention)
>
> [4.2.6. Reviews & Ratings 46](#reviews-ratings)
>
> [4.2.7. Referee Operations 47](#referee-operations)
>
> [4.2.8. System Administration 49](#system-administration)

[**5 Prototype/Mockup 51**](#prototypemockup)

**Software Requirements Specification**

# **Objectives**

This document focus on the following topics:

- Complete the Software Requirements Specification (SRS) document with the following contents:

  - Elaborate on the Problem Statement

  - Overview of Requirements (Functional and Non-Functional), Stakeholders

  - Use Case Model

  - Use Case Specifications

  - Create Prototype and Mockup Diagrams of the System Interface

- Đọc hiểu tài liệu phân tích yêu cầu.

# **Member Contribution Assessment**

| **ID** | **Name** | **Assign ticket** | **Contribution (%)** |
|----|----|----|----|
| 24127336 | Nguyễn Thái Cường | \[[\#10](https://spot09.atlassian.net/browse/SPOT-10)\]\[[\#11](https://spot09.atlassian.net/browse/SPOT-11)\]\[[\#12](https://spot09.atlassian.net/browse/SPOT-12)\]\[[\#13](https://spot09.atlassian.net/browse/SPOT-13)\]\[[\#14](https://spot09.atlassian.net/browse/SPOT-14)\]  | 100 % |
| 24127583 | Nguyễn Thanh Tùng | \[[\#10](https://spot09.atlassian.net/browse/SPOT-10)\]\[[\#11](https://spot09.atlassian.net/browse/SPOT-11)\]\[[\#12](https://spot09.atlassian.net/browse/SPOT-12)\] | 100 % |
| 24127423 | Đỗ Trương Khoa | \[[\#11](https://spot09.atlassian.net/browse/SPOT-11)\] | 100 % |
| 24127593 | K’Vớn | \[[\#15](https://spot09.atlassian.net/browse/SPOT-15)\] | 100 % |
| 24127496 | Đào Hoàng Phúc | \[[\#12](https://spot09.atlassian.net/browse/SPOT-12)\] | 100 % |

# **Problem Statement**

> The demand for sports activities is consistently growing, yet the traditional process of finding, booking, and managing sports venues remains manual and inefficient. Currently, users often have to rely on direct phone calls to confirm bookings, which is time-consuming and lacks convenience. Furthermore, players struggle to find high-quality venues that fit their specific needs regarding location, budget, and sport type. Another significant challenge is the lack of a platform for solo players or teams to connect and arrange friendly matches.
>
> On the operational side, venue owners face difficulties in efficiently managing their schedules, verifying customer identities, and tracking business performance. The absence of automated notifications and detailed revenue analytics by sport type hinders their ability to optimize operations
>
> To address these fundamental issues, we propose the development of **SPOT  
> (Sport Pitch Online Ticketing)** - a comprehensive **Online Sports Venue Booking Management System**. The **SPOT** platform aims to digitize and streamline the entire booking ecosystem, allowing users to independently **book venues online**, view real-time **available time slots**, and utilize **advanced search filters**. To foster sportsmanship, **SPOT** will also introduce a dedicated **matchmaking feature** connecting different sports groups and solo players.
>
> For administrators and venue owners, **SPOT** will provide robust management tools, including **automated booking notifications**, detailed **customer verification**, and **monthly revenue statistics**. To mitigate operational risks and revenue loss from unfulfilled appointments, the platform will implement a **Smart No-Show Prevention System**. To ensure a high-quality user experience and safety, the platform will enforce strict security protocols (such as **OTP** for sensitive actions and **brute-force prevention**), maintain a fast response time of under 3 seconds, and implement **role-based access control**. Finally, **SPOT** will differentiate itself by leveraging advanced AI capabilities, including a **personalized recommendation engine** based on user activity and an **NLP-powered virtual assistant** for a quick, hands-free booking experience
>
> To successfully implement the proposed architecture and ensure system maintainability, SPOT will be built upon a modern and highly scalable technology stack. The client-side interfaces will be developed using **React and Next.js** for the Web application and Admin Console, alongside **React Native** to deliver a seamless, high-performance cross-platform Mobile App. On the server side, the API Gateway and Core Business Services will be powered by **Node.js and Express**, ensuring fast, non-blocking operations.
>
> Data persistence will rely on **PostgreSQL** for robust transactional integrity, complemented by **Redis** for high-speed caching to guarantee the sub-3-second response time requirement. Crucially, the AI-driven components—specifically the Smart No-Show Prevention System and the Recommendation Engine—will be developed using **Python** (incorporating libraries like scikit-learn and XGBoost) to effectively handle complex data classification, decision-making logic, and predictive modeling. The NLP virtual assistant will integrate with state-of-the-art LLM APIs such as **Gemini / GPT**. Finally, the entire ecosystem will be containerized using **Docker** and hosted on **Vercel** to streamline continuous deployment and cloud operations.

# **Requirements Overview**

#### ***Stakeholders***

| **STT** | **Stakeholder** | **Type** | **View Point** | **Description** |
|----|----|----|----|----|
| 1 | User | Abstract | Interactor | Generalized actor representing any individual account holder in the system, serves as the parent role from which Player and other specific user roles are derived through generalization. Handles common actions such as login and personal account management. |
| 2 | Player | Primary | Interactor | Players can register for an account and use the system immediately without requiring approval, as they represent a low-risk general user group. Their primary activities include searching for venues, online booking, registering for add-on services, participating in matchmaking, and processing payments. |
| 3 | Match Host | Primary | Interactor | A specialization of the Player actor that emerges when a user organizes a match rather than merely participating. In addition to all Player privileges, this actor manages member invitations and books the venue on behalf of the group. |

| 4 | Venue Owner | Primary | Interactor | This actor consolidates on-site operational roles (manager, receptionist, cashier, technician) into a single entity to simplify the model, reflecting the real-world scenario where these duties are often handled by the same person or a small team. As it represents a legitimate business entity, this actor's account requires Admin verification before it is permitted to operate publicly on the system. |
|----|----|----|----|----|
| 5 | Referee | Primary | Interactor | The Referee has a relatively narrow operational scope compared to other actors, primarily involving viewing assigned schedules and responding (accepting or declining shifts). Because this role involves publicly displayed professional credibility, their accounts also require Admin verification before going live on the platform, similar to the Venue Owner. |
| 6 | System Administrator | Primary | Interactor | Operating from a platform management perspective, this actor is responsible for reviewing and approving sensitive accounts such as Referees and Venue Owners, while also configuring global system parameters. |
| 7 | Map Service | Secondary | Indirect | It does not initiate interactions but is only invoked by the system when needed to determine locations or filter venues based on a travel radius. |
| 8 | Payment Gateway | Secondary | Indirect | Acting as an intermediary for processing financial transactions, it only responds when a payment request is sent from the system and does not initiate any actions independently. |
| 9 | Email Gateway | Secondary | Indirect | Serves as an external notification transmission channel, triggered whenever the system needs to send booking confirmations, OTP codes. |
| 10 | LLM Service | Secondary | Indirect | Provides natural language processing (NLP) capabilities for the virtual assistant, operating as a background service that powers the user's chat, voice experiences, and Smart No-Show prevention system. |

####  

#### ***Requirements***

##### ***Functional Requirements Specification***

<table>
<colgroup>
<col style="width: 13%" />
<col style="width: 86%" />
</colgroup>
<thead>
<tr>
<th style="text-align: center;"><em>No. FR</em></th>
<th style="text-align: center;"><em>Functional Requirements Specification</em></th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-1</em></th>
<th style="text-align: center;"><em><strong>Authentication &amp; Account Management</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-1.1</th>
<th style="text-align: left;">The system shall allow any User to log in using registered credentials<br />
(email/username + password)</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.2</th>
<th style="text-align: left;">The system shall allow a Player to self-register an account, which becomes active immediately without requiring approval.</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.3</th>
<th style="text-align: left;">The system shall allow a Venue Owner or Referee to submit a registration request, which remains in "pending" status until reviewed and approved by a System Administrator before the account can operate publicly.</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.4</th>
<th style="text-align: left;">The system shall require the user to re-confirm their password or enter an OTP before performing sensitive actions (e.g., changing email, phone number, payment information) via email.</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.5</th>
<th style="text-align: left;">The system must support a forgotten password feature with an OTP sent via email.</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.6</th>
<th style="text-align: left;">The system shall lock an account temporarily after a defined number of consecutive failed login attempts, to prevent brute-force attacks.</th>
</tr>
<tr>
<th style="text-align: center;">FR-1.7</th>
<th style="text-align: left;">The system shall allow every actor to view and update their own personal account information.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-2</em></th>
<th style="text-align: center;"><em><strong>Venue Search &amp; Booking</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-2.1</th>
<th>The system shall allow a Player to search for venues using filters including sport type, location/radius, rating, and price range.</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.2</th>
<th>The system shall display the real-time availability schedule of a venue by day/week upon accessing the venue details page.</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.3</th>
<th>The system shall allow a Player to view comprehensive venue details, including a list of available add-on services (e.g., referee hiring).</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.4</th>
<th>The system shall allow a Player to book a venue online independently, without requiring a phone call for confirmation.</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.5</th>
<th>The system shall allow a Player to modify or cancel their own booking within the policy defined by the Venue Owner.</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.6</th>
<th>The system shall generate a booking confirmation and allow it to be sent electronically.</th>
</tr>
<tr>
<th style="text-align: center;">FR-2.7</th>
<th>The system shall temporarily lock a selected time slot for a predefined duration (e.g., 5 minutes) while a Player is completing the payment or confirmation process to prevent double-booking.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-3</em></th>
<th style="text-align: center;"><em><strong>Matchmaking</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-3.1</th>
<th>The system shall allow a Match Host (a Player who organizes a session) to create a "kèo" (open session) by selecting a booked venue, time slot, maximum number of slots, price per slot, and required skill-level range.</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.2</th>
<th>The system shall allow a Player to search and filter open sessions by sport type, skill level, cost, location, and time.</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.3</th>
<th>The system shall allow the Match Host to edit or cancel a session they created, and to view the current list of registered participants.</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.4</th>
<th>The system shall allow the Match Host to remove a participant from a session when necessary (e.g., policy violation, no-show history).</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.5</th>
<th>The system shall record each Player's match history, including participation count and basic performance statistics, for future display and recommendation purposes</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.6</th>
<th>The system shall allow a Player to search for and join existing clubs/groups based on sport type, location, or skill level.</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.7</th>
<th>The system shall allow the Match Host to approve or reject registration requests when the session is configured as "approval required."</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.8</th>
<th>The system shall allow a Player or club to search for upcoming tournaments filtered by sport type, location, date range, and entry format (singles/doubles/team).</th>
</tr>
<tr>
<th style="text-align: center;">FR-3.9</th>
<th>The system shall allow a Player or club to register for a tournament directly through the platform. </th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-4</em></th>
<th style="text-align: center;"><em><strong>Payment &amp; Deposit</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-4.1</th>
<th>The system shall allow a Player to pay for a booking or a matchmaking slot online through an integrated Payment Gateway (e.g., VNPay/MoMo).</th>
</tr>
<tr>
<th style="text-align: center;">FR-4.2</th>
<th>The system shall allow a Venue Owner to set a deposit amount</th>
</tr>
<tr>
<th style="text-align: center;">FR-4.3</th>
<th>The system shall generate an electronic invoice/receipt for every completed payment. </th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-5</em></th>
<th style="text-align: center;"><em><strong>Notification</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-5.1</th>
<th>The system shall send a notification to the Venue Owner for every new booking received.</th>
</tr>
<tr>
<th style="text-align: center;">FR-5.2</th>
<th>The system shall send an OTP or confirmation message via the Email Gateway when a user performs a sensitive action or completes a booking.</th>
</tr>
<tr>
<th style="text-align: center;">FR-5.3</th>
<th>The system shall send a reminder notification to Players before the scheduled time of a booking or matchmaking session.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-6</em></th>
<th style="text-align: center;"><em><strong>Reviews &amp; Ratings</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-6.1</th>
<th>The system shall allow a Player to rate and leave a review of a venue after completing a booking.</th>
</tr>
<tr>
<th style="text-align: center;">FR-6.2</th>
<th>The system shall allow the Venue Owner to view and respond to reviews of their venue.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-7</em></th>
<th style="text-align: center;"><em><strong>Venue &amp; Operations Management</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-7.1</th>
<th>The system shall allow the Venue Owner to manage venue/facility profiles, court schedules.</th>
</tr>
<tr>
<th style="text-align: center;">FR-7.2</th>
<th>The system shall allow the Venue Owner to view, modify, or cancel any customer's booking to support schedule management.</th>
</tr>
<tr>
<th style="text-align: center;">FR-7.3</th>
<th>The system shall allow the Venue Owner to verify a customer's identity using the booking's associated name and phone number.</th>
</tr>
<tr>
<th style="text-align: center;">FR-7.4</th>
<th>The system shall allow the Venue Owner to view a monthly revenue chart broken down by sport type.</th>
</tr>
<tr>
<th style="text-align: center;">FR-7.5</th>
<th>The system shall allow the Venue Owner to confirm check-in status for a booked court.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-8</em></th>
<th style="text-align: center;"><em><strong>Referee Operations</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-8.1</th>
<th>The system shall allow a Referee to view their assigned match/shift schedule.</th>
</tr>
<tr>
<th style="text-align: center;">FR-8.2</th>
<th>The system shall allow a Referee to accept or submit a cancellation request for an assigned shift.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-9</em></th>
<th style="text-align: center;"><em><strong>System Administration</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-9.1</th>
<th>The system shall allow the System Administrator to review and approve or reject registration requests submitted by Venue Owners and Referees.</th>
</tr>
<tr>
<th style="text-align: center;">FR-9.2</th>
<th>The system shall allow the System Administrator to manage user accounts and assign role-based access permissions (RBAC).</th>
</tr>
<tr>
<th style="text-align: center;">FR-9.3</th>
<th>The system shall allow the System Administrator to configure global system parameters and operational policies.</th>
</tr>
<tr>
<th style="text-align: center;"><em>FR-10</em></th>
<th style="text-align: center;"><em><strong>AI-Powered Services</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">FR-10.1</th>
<th>The system shall analyze a Player's activity history to generate personalized venue and matchmaking session recommendations.</th>
</tr>
<tr>
<th style="text-align: center;">FR-10.2</th>
<th>The system shall provide an NLP-powered virtual assistant (chatbot/voice bot) that allows a Player to complete a booking through natural conversation.</th>
</tr>
<tr>
<th style="text-align: center;">FR-10.3</th>
<th>The system shall estimate the no-show probability of a booking and use this prediction to dynamically adjust the required deposit amount.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Non-Functional Requirements Specification***

<table>
<colgroup>
<col style="width: 13%" />
<col style="width: 86%" />
</colgroup>
<thead>
<tr>
<th style="text-align: center;"><em>No. NFR</em></th>
<th style="text-align: center;"><em>Functional Requirements Specification</em></th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-1</em></th>
<th style="text-align: center;"><em><strong>Performance</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-1.1</th>
<th>Response time &lt;= 3 seconds for 95% of requests (P95) and search/filter queries ≤ 1.5 seconds (P95).</th>
</tr>
<tr>
<th style="text-align: center;">NFR-1.2</th>
<th>Booking creation transaction completes end-to-end in &lt;= 2 seconds under normal load.</th>
</tr>
<tr>
<th style="text-align: center;">NFR-1.3</th>
<th>System supports up to 500 concurrent users with response time still ≤ 3 seconds (P95)<br />
AI services scale independently from core services without downtime.</th>
</tr>
<tr>
<th style="text-align: center;">NFR-1.4</th>
<th>The OTP code must be sent to the user within 10 seconds of pressing the submit<br />
request button</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-2</em></th>
<th style="text-align: center;"><em><strong>Security</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-2.1</th>
<th>100% of sensitive actions (change email/phone/payment info) require OTP or password<br />
re-confirmation</th>
</tr>
<tr>
<th style="text-align: center;">NFR-2.2</th>
<th>100% of API endpoints validate JWT and role permissions before granting access; unauthorized attempts return HTTP 403.</th>
</tr>
<tr>
<th style="text-align: center;">NFR-2.3</th>
<th>Account locked for 15 minutes after 5 consecutive failed login attempts</th>
</tr>
<tr>
<th style="text-align: center;">NFR-2.4</th>
<th>100% of client-server traffic uses HTTPS/TLS 1.2+; passwords stored using bcrypt/Argon2 hashing (never plaintext).</th>
</tr>
<tr>
<th style="text-align: center;">NFR-2.5</th>
<th>Passwords must be at least 8 characters long, including uppercase, lowercase, numbers and special characters</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-3</em></th>
<th style="text-align: center;"><em><strong>Usability</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-3.1</th>
<th style="text-align: left;">&gt;= 90% task-completion rate for first-time users completing an online booking within 5 minutes (tested with &gt;= 10 participants).</th>
</tr>
<tr>
<th style="text-align: center;">NFR-3.2</th>
<th style="text-align: left;">100% of form validation errors display a specific</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-4</em></th>
<th style="text-align: center;"><em><strong>Reliability</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-4.1</th>
<th>System uptime &gt;= 99% measured monthly</th>
</tr>
<tr>
<th style="text-align: center;">NFR-4.2</th>
<th>0% double-booking rate for the same venue/time-slot under concurrent booking load tests<br />
(&gt;= 50 simultaneous requests).</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-5</em></th>
<th style="text-align: center;"><em><strong>Maintainability</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-5.1</th>
<th>&gt;= 80% of backend modules covered by linting rules (ESLint/Prettier for Node.js, PEP8 for Python); code review required before merging to main branch.</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-6</em></th>
<th style="text-align: center;"><em><strong>Portability</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-6.1</th>
<th>Verified on the latest 2 versions of Chrome with no critical UI defects.</th>
</tr>
<tr>
<th style="text-align: center;">NFR-6.2</th>
<th>All services containerized with Docker; deployable to any Docker-compatible host (Vercel, DigitalOcean, Azure) with &lt;= 1 config file change.</th>
</tr>
<tr>
<th style="text-align: center;"><em>NFR-7</em></th>
<th style="text-align: center;"><em><strong>Compliance</strong></em></th>
</tr>
<tr>
<th style="text-align: center;">NFR-7.1</th>
<th>User data handling complies with Vietnam's Personal Data Protection Decree (Decree 13/2023/NĐ-CP); no third-party data sharing without explicit user consent.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

#  

# **Requirements Analysis**

#### ***Use Case model***

- Link Use case diagram: [<u>Use case SPOT.png</u>](https://drive.google.com/file/d/1ZpMb_xS6h5a1InzaTdpz0bALrryuGcVT/view?usp=sharing)

<img src="media/PA1/media/image2.png" style="width:7in;height:4.98611in" />

#### ***Use Case Specification***

##### ***Authentication & Account Management*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U001</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Login</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Allows a registered account holder to authenticate into SPOT using registered credentials (email/phone + password) in order to access role-specific features</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User (Player, Venue Owner, Referee, System Administrator)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The user already has a registered account</p></li>
<li><p>For Venue Owner and Referee accounts, the registration request has already been approved by the System Administrator<br />
(status = active)</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A valid session (JWT) is issued to the user</p></li>
<li><p>The user is redirected to the home screen corresponding to their role</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>User opens the Login screen and enters email/username and password.</p></li>
<li><p>System validates the input format.</p></li>
<li><p>System looks up the account and compares the password hash.</p></li>
<li><p>System checks the account status<br />
(active / pending / locked).</p></li>
<li><p>System issues a session token (JWT) and redirects the user to their role-based dashboard.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Invalid credentials</em></p></li>
</ol>
<p>System rejects the attempt, displays a generic error message, and increments the failed-attempt counter for the account</p>
<ol start="2" type="1">
<li><p><em>Account locked</em></p></li>
</ol>
<p>After 5 consecutive failed attempts, system locks the account for 15 minutes and informs the user (NFR-2.3)</p>
<ol start="3" type="1">
<li><p><em>Forgotten password</em></p></li>
</ol>
<p>User selects "Forgot Password"; flow continues at UC "Forgot Password"</p>
<ol start="4" type="1">
<li><p><em>Pending approval</em></p></li>
</ol>
<p>If a Venue Owner/Referee account is still "pending", system denies login and shows a pending-approval notice</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1 (login response ≤ 3s, P95)</p></li>
<li><p>NFR-2.2 (JWT + role validation on every subsequent request)</p></li>
<li><p>NFR-2.3 (lockout policy)</p></li>
<li><p>NFR-2.4 (HTTPS/TLS, password hashing with bcrypt/Argon2)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U002</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Forgot Password</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a user who cannot remember their password reset it after verifying ownership of the registered email/phone through an OTP</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The user owns a registered, previously verified email</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The account password is reset and the user can log in with the new password</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>User selects "Forgot Password" from the Login screen.</p></li>
<li><p>User enters the registered email/phone number.</p></li>
<li><p>System triggers UC "Send OTP" through the Email Gateway.</p></li>
<li><p>User enters the received OTP.</p></li>
<li><p>System verifies the OTP through UC "Authenticate via OTP"</p></li>
<li><p>User enters and confirms a new password.</p></li>
<li><p>System hashes and stores the new password, then confirms success.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Wrong OTP</em></p></li>
</ol>
<p>System allows up to 3 retries before temporarily blocking the request.</p>
<ol start="2" type="1">
<li><p><em>Expired OTP</em></p></li>
</ol>
<p>User requests the OTP to be resent; a new OTP invalidates the previous one.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.1 (OTP re-confirmation for sensitive actions)</p></li>
<li><p>NFR-2.4 (HTTPS/TLS, hashed password storage)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th><strong>U003</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Authenticate via OTP</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Verifies a one-time password sent to the user's registered contact in order to confirm login recovery or another sensitive action</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User, Email Gateway (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>An OTP has already been generated and dispatched to the user<br />
(UC "Send OTP")</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The pending sensitive action is allowed to proceed only if the submitted OTP is correct and unexpired</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System generates a 6-digit OTP with a limited validity window (e.g., 5 minutes) and stores it against the request.</p></li>
<li><p>User submits the OTP received via email/SMS.</p></li>
<li><p>System compares the submitted value with the stored OTP and checks the expiry timestamp.</p></li>
<li><p>If the OTP matches and is still valid, system marks the verification as successful and resumes the calling use case.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Expired OTP</em></p></li>
</ol>
<p>System rejects the value and offers to resend a new OTP.</p>
<ol start="2" type="1">
<li><p><em>Repeated wrong OTP</em></p></li>
</ol>
<p>After 3 failed attempts, system temporarily blocks further attempts for that request.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.1</p></li>
<li><p>NFR-2.4</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U004</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Manage Personal Account</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Use case allowing any authenticated user to view and edit their own personal account information.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>User is logged in.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The user's profile information is displayed and, if edited, persisted</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>User opens "My Account".</p></li>
<li><p>System executes UC "View Personal Information"</p></li>
<li><p>User selects "Edit"; flow continues at UC "Update Information"</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Sensitive field changed</em></p></li>
</ol>
<p>If email, phone, or payment information is changed, system requires OTP/password re-confirmation before saving (FR-1.4).</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.1</p></li>
<li><p>NFR-3.2 (specific inline validation messages)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U005</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>View Personal Information</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Displays the profile data currently on record for the logged-in user</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>User is logged in</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The user's name, contact details, and role-specific data are displayed</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System retrieves the account record from the database.</p></li>
<li><p>System renders the profile fields on screen.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>User requests changes</em></p></li>
</ol>
<p>Flow continues at UC "Update Information"</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U006</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Update Information</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Allows the user to edit and save changes to their own profile fields</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>User</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>User is viewing their personal information.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>Updated profile data is persisted and reflected immediately.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>User edits one or more fields (name, avatar, address, etc.).</p></li>
<li><p>System validates the format of each field.</p></li>
<li><p>If a sensitive field (email/phone/payment info) is changed, system triggers UC "Authenticate via OTP"</p></li>
<li><p>System saves the changes and displays a success confirmation.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Validation error</em></p></li>
</ol>
<p>System highlights the invalid field with a specific error message and blocks saving (NFR-3.2).</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.1</p></li>
<li><p>NFR-3.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U007</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Register Player's Account</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Allows a new visitor to self-register a Player account that becomes active immediately, without requiring administrator approval</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The visitor does not already hold an account with the same email/username</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A new, active Player account is created.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Guest opens the registration form and enters name, email/username, and password.</p></li>
<li><p>System validates the format of all fields and checks uniqueness of email/phone.</p></li>
<li><p>System creates the account with status = active.</p></li>
<li><p>System sends a welcome/confirmation notification and logs the user in.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Duplicate account</em></p></li>
</ol>
<p>System rejects the registration and suggests<br />
"Forgot Password" instead.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
<li><p>NFR-2.4</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U008</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Register for Venue Owner</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Allows a business to submit a request to operate as a Venue Owner on the platform, which stays pending until reviewed by an Administrator</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Applicant does not already hold a Venue Owner account</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A registration request with status = pending is created and queued for admin review</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Applicant fills in business information (name, address, contact person).</p></li>
</ol>
<ol start="2" type="1">
<li><p>System executes UC "Submit Business License"</p></li>
<li><p>System stores the request with status = pending and notifies the System Administrator.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Missing license document</em></p></li>
</ol>
<p>System blocks submission until a valid license file is attached.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U009</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Submit Business License</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Uploads the legal business license document required to verify a Venue Owner registration request</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Applicant is filling in the Venue Owner registration form.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The license file is stored and linked to the pending registration request.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Applicant selects a file (PDF/image) of the business license.</p></li>
<li><p>System validates file type and size.</p></li>
<li><p>System uploads and attaches the file to the registration request.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Unsupported file</em></p></li>
</ol>
<p>System rejects the file and asks the applicant to try a supported format.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th>None</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th><strong>U010</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Register Referee's Account</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Allows an individual to apply to become a Referee, with the account remaining pending until an Administrator approves it</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Referee</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Applicant does not already hold a Referee account.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A registration request with status = pending is created.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Applicant fills in personal and professional information.</p></li>
<li><p>System executes UC "Submit Credentials" (&lt;&lt;include&gt;&gt;).</p></li>
<li><p>System stores the request as pending and notifies the System Administrator.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Missing credentials</em></p></li>
</ol>
<p>System blocks submission until certification documents are attached.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th><strong>U011</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Submit Credentials</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Uploads certification/qualification documents required to verify a Referee registration request.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Referee</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Applicant is filling in the Referee registration form.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The credential file(s) are stored and linked to the pending registration request.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Applicant selects certification file(s).</p></li>
<li><p>System validates file type and size.</p></li>
<li><p>System uploads and attaches the file(s) to the request.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Unsupported file</em></p></li>
</ol>
<p>System rejects the file and asks for a supported format.</p></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>File type/size validation</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Venue Search, Booking & Venue Operations*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U012</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Book Field Online</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>End-to-end use case that lets a Player independently search for, select, and pay for a field/court booking without needing a phone call</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is logged in.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A confirmed booking ticket exists, with payment either completed online or scheduled for counter payment.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System executes UC "Search Available Fields"</p></li>
<li><p>System executes UC "Choose Type Sports"</p></li>
<li><p>System executes UC "Select Field"</p></li>
<li><p>System executes UC "Book Field"</p></li>
<li><p>Player chooses a payment path; flow continues at UC "Pay Online" or UC "Pay at Counter"</p></li>
<li><p>System confirms the booking and triggers UC "Send Payment Message"</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Slot no longer available</em></p></li>
</ol>
<blockquote>
<p>System returns the Player to the search results to pick another slot.</p>
</blockquote>
<ol start="2" type="1">
<li><p><em>Conversational booking</em></p></li>
</ol>
<blockquote>
<p>Player uses UC "Chatbot" instead of manual search/selection.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
<li><p>NFR-1.2 (booking transaction ≤ 2s)</p></li>
<li><p>NFR-4.2 (0% double-booking)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U013</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Search Available Fields</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player search for venues/fields using filters such as sport type, location/radius, rating, and price range (FR-2.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>None (available to any Player, logged in or browsing).</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A list of matching venues/fields with their availability is displayed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player enters filter criteria (sport, location/radius, rating, price).</p></li>
<li><p>System queries the Map service to resolve location/radius filters.</p></li>
<li><p>System retrieves matching venues and their real-time availability.</p></li>
<li><p>System displays results sorted by relevance/distance.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>No results</em></p></li>
</ol>
<blockquote>
<p>System suggests broadening the filters or shows recommended venues (UC "Recommendation Engine").</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1 (search/filter ≤ 1.5s, P95)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U014</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Choose Type Sports</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player narrow down search or booking results by selecting a specific sport type.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is on the search or booking screen.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>Results are filtered to the selected sport type.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player selects a sport from the available list.</p></li>
</ol>
<ol start="2" type="1">
<li><p>System applies the filter and refreshes the result set.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U015</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Select Field</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player choose a specific field/court and time slot from the search results and temporarily reserve it.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player has viewed a venue's detail page and its real-time schedule.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The chosen time slot is held for the Player for a limited duration.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player opens the venue detail page and reviews the day/week availability grid.</p></li>
<li><p>Player selects an available date/time slot.</p></li>
<li><p>System places a temporary lock on the slot for a predefined duration (5 minutes, FR-2.7).</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Slot taken during hold expiry</em></p></li>
</ol>
<blockquote>
<p>System releases the hold and notifies the Player to choose another slot.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-4.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U016</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Book Field</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Core use case combining field selection with optional add-ons to produce a booking ticket.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is logged in and has an available time slot in mind.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A booking ticket in "pending payment" state is created.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System executes UC "Select Field"</p></li>
<li><p>System executes UC "Create Booking Ticket"</p></li>
<li><p>Player optionally adds extras; flow continues at UC "Hiring Additional Services" and/or UC "Hiring Referee"</p></li>
<li><p>Player may instead use UC "Chatbot" for a conversational flow</p></li>
<li><p>System may present suggestions from UC "Recommendation Engine"</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Player abandons booking</em></p></li>
</ol>
<blockquote>
<p>System releases the temporary slot hold after the timeout.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.2</p></li>
<li><p>NFR-4.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U017</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Create Booking Ticket</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Generates the booking record capturing venue, time slot, add-ons, price, and deposit for a reservation.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A field/slot has been selected.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A persisted booking ticket with a calculated total price and deposit exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System compiles the selections (field, time slot, add-ons).</p></li>
<li><p>System calculates price and required deposit, adjusted dynamically by UC "No-Show Prevention System" (FR-10.3).</p></li>
<li><p>System persists the booking ticket in "pending payment" status.</p></li>
<li><p>After the booking is later marked completed, system prompts UC "Review" and UC "Rating"</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Pricing conflict</em></p></li>
</ol>
<blockquote>
<p>System recalculates and flags the discrepancy to the Player before confirming.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.2</p></li>
<li><p>NFR-4.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U018</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Recommendation Engine</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Analyzes a Player's activity history to generate personalized venue and matchmaking session recommendations (FR-10.1)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>LLM Service (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The Player has sufficient activity history (past bookings/sessions).</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A ranked list of recommended venues/sessions is returned to the calling use case.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System gathers the Player's booking and matchmaking history.</p></li>
<li><p>System sends the feature set to the AI model (LLM Service).</p></li>
<li><p>AI model returns ranked venue/session suggestions.</p></li>
<li><p>System displays the suggestions inline within the search or booking flow.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Insufficient history</em></p></li>
</ol>
<blockquote>
<p>System falls back to generic popularity-based recommendations.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.3 (AI services scale independently without downtime)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U019</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Chatbot</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Provides an NLP-powered virtual assistant (chat/voice) that lets a Player complete a booking through natural conversation (FR-10.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, LLM Service (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player has opened the chatbot/voice assistant.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A booking is created equivalent to one made via the manual flow.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player types or speaks a booking request in natural language.</p></li>
<li><p>LLM Service parses intent and extracts entities (sport, location, time).</p></li>
<li><p>System maps the extracted entities to booking parameters.</p></li>
<li><p>System confirms the interpreted request with the Player.</p></li>
<li><p>System proceeds to UC "Create Booking Ticket".</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Ambiguous request</em></p></li>
</ol>
<blockquote>
<p>Chatbot asks a clarifying question before proceeding.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.3</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U020</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Hiring Additional Services</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player add optional add-on services (e.g., equipment rental, drinks) to a booking</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is creating or editing a booking ticket.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>Selected services and their cost are added to the booking total.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player browses the venue's list of available add-on services.</p></li>
<li><p>Player selects a service and quantity.</p></li>
<li><p>System adds the cost to the running booking total.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U021</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Hiring Referee</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player add a referee to the booking as an add-on service.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Referee (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A time slot has been selected and referees are available for that slot.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A referee is tentatively assigned to the booking, pending the referee's acceptance.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player views the list of referees available for the selected slot.</p></li>
<li><p>Player selects a referee.</p></li>
<li><p>System adds the referee fee to the booking total and updates the referee's schedule (UC "View/Manage Schedule").</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Referee declines</em></p></li>
</ol>
<blockquote>
<p>Flow continues at UC "Decline Match Invitation"; system prompts the Match Host to choose another referee.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U022</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Update Booking Ticket</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the booking owner (Player/Match Host) or the Venue Owner modify an existing booking, subject to the venue's cancellation/change policy (FR-2.5).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Match Host, Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>An active booking ticket exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking is updated and the new total/schedule is confirmed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Actor opens the booking ticket.</p></li>
<li><p>Actor selects to change the time slot; flow continues at UC "Reschedule" , and/or removes an add-on via UC "Cancel Additional Services"</p></li>
<li><p>System recalculates the total price/deposit.</p></li>
<li><p>System confirms the change and notifies the other party (venue/customer).</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Outside change window</em></p></li>
</ol>
<blockquote>
<p>System blocks the change per the venue's policy and informs the actor.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U023</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Reschedule</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Changes the date/time of an existing booking to another available slot.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The booking is within the venue's allowed reschedule window.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking now references the new time slot; the old slot is released.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Actor picks a new date/time.</p></li>
<li><p>System checks availability of the new slot.</p></li>
<li><p>System confirms the change and notifies the Venue Owner.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>No slot available</em></p></li>
</ol>
<blockquote>
<p>System informs the actor and offers to cancel instead (UC "Cancel Booking").</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-4.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U024</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Cancel Additional Services</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Removes a previously added add-on service from an existing booking.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The booking has at least one add-on service attached.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The service is removed and the booking total is recalculated.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Actor selects the add-on service to remove.</p></li>
<li><p>System recalculates the booking total.</p></li>
<li><p>System applies the venue's refund policy if the service was already paid.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U025</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Cancel Booking</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Cancels an entire booking ticket.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player, Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>An active booking ticket exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking status is set to cancelled and the time slot is released.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Actor selects "Cancel Booking" and confirms.</p></li>
<li><p>System checks the cancellation window against the venue's policy.</p></li>
<li><p>System applies refund or deposit-forfeiture rules accordingly.</p></li>
<li><p>System releases the time slot and notifies the Venue Owner.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Outside cancellation window</em></p></li>
</ol>
<blockquote>
<p>System denies a refund but still cancels the booking, or blocks cancellation per policy.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-4.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U026</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Manage Fields</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner create, edit, or remove individual court/field records (FR-7.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Venue Owner is logged in and the venue account is approved.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The field list for the venue reflects the changes made.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner opens the field management screen.</p></li>
<li><p>Venue Owner adds or edits a field's name, sport type, price, and capacity.</p></li>
<li><p>System validates and saves the changes.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U027</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Manage Facilities</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner manage venue-level information such as address, amenities, and opening hours (FR-7.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Venue Owner is logged in and approved.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The venue profile is updated.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner opens the facility profile screen.</p></li>
<li><p>Venue Owner edits venue-level details.</p></li>
<li><p>System executes UC "Manage Fields" if court-level details also need updating.</p></li>
<li><p>System saves the changes.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U028</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Update Field Status</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner mark a field as active, under maintenance, or inactive to control its booking availability.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The field already exists in the system.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>Bookings can no longer be made against a field marked inactive/under maintenance.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner selects a field.</p></li>
<li><p>Venue Owner changes its status.</p></li>
<li><p>System immediately blocks or unblocks new bookings for that field.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U029</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Process Booking</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner review and accept an incoming booking request (online or walk-in) (FR-7.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking request exists<br />
(from a Player or entered manually).</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking is accepted/confirmed on the venue side.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner opens the incoming booking request.</p></li>
<li><p>System executes UC "Confirm Information Customer"</p></li>
<li><p>Venue Owner accepts (or rejects) the booking.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Suspicious/duplicate booking</em></p></li>
</ol>
<blockquote>
<p>Venue Owner rejects the request and provides a reason.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U030</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Confirm Information Customer</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner verify a customer's identity using the name and phone number associated with the booking (FR-7.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking request with customer contact details exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The customer's identity is marked as verified or flagged as suspicious.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner looks up the booking by name/phone.</p></li>
<li><p>Venue Owner cross-checks the details (and ID if necessary).</p></li>
<li><p>System marks the booking as verified.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U031</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Confirm Field Status</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner confirm the check-in/completion status of a booked court, e.g., checked-in, no-show, completed (FR-7.5).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The booking's scheduled time has arrived or passed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking's status is updated and feeds into the No-Show Prevention System.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner opens the booking on the day's schedule.</p></li>
<li><p>Venue Owner marks it as checked-in, no-show, or completed.</p></li>
</ol>
<blockquote>
<p>3. System stores the outcome for reporting and no-show prediction.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U032</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Report Revenue</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner view a monthly revenue chart broken down by sport type (FR-7.4).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The venue has at least one completed, paid booking.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A revenue chart/table for the selected period is displayed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner selects the reporting period and optional sport-type filter.</p></li>
<li><p>System aggregates payment records for the venue.</p></li>
</ol>
<ol start="3" type="1">
<li><p>System renders the chart/table.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Matchmaking*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U033</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Join Session</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player search for and join an open matchmaking session (FR-3.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is logged in.</p></li>
<li><p>At least one open session exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Player is added as a participant, or placed on a pending list if approval is required.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player searches open sessions by sport type, skill level, cost, location, and time.</p></li>
<li><p>Player selects a session and requests to join.</p></li>
<li><p>If the session requires approval, system marks the Player as pending; otherwise the Player is added immediately.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Session full</em></p></li>
</ol>
<blockquote>
<p>System offers to place the Player on a waitlist.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.1</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U034</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Create Session</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Match Host create an open session on a venue/slot they have already booked (FR-3.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The Match Host has an existing, confirmed booking.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A new open session is published and visible to other Players.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Match Host selects a booked venue and time slot.</p></li>
</ol>
<ol start="2" type="1">
<li><p>System executes UC "Set Session Information" to configure max slots, price/slot, and skill-level range.</p></li>
<li><p>System publishes the session.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U035</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Manage Session</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Umbrella use case for a Match Host to administer a session's lifecycle after creation (FR-3.3, FR-3.4).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A session created by this Match Host exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The session's configuration and participant list reflect the Match Host's actions.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Match Host opens the session dashboard.</p></li>
<li><p>System executes UC "Edit Session" and/or UC "Set Session Information" as needed.</p></li>
<li><p>Match Host views the current participant list.</p></li>
<li><p>Match Host may remove a participant (e.g., policy violation, no-show history).</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U036</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Set Session Information</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Configures a session's parameters: maximum number of slots, price per slot, and required skill-level range.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A session is being created or edited.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The session's configuration is saved.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Match Host fills in/edits the session parameters.</p></li>
<li><p>System validates the values (e.g., max slots &gt; current participants).</p></li>
<li><p>System saves the configuration.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p>Invalid range</p></li>
</ol>
<blockquote>
<p><em>System rejects the value and prompts for a valid range.</em></p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p><em>None</em></p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U037</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Edit Session</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Match Host modify an existing session's details or cancel it (FR-3.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Match Host</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The session was created by this Match Host and has not yet started.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The session is updated or cancelled, and participants are notified.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Match Host opens the session and edits its details, or selects cancel.</p></li>
<li><p>System saves the change or marks the session cancelled.</p></li>
<li><p>System notifies all joined participants.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U038</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Join Club</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player search for and join existing clubs/groups based on sport type, location, or skill level (FR-3.6).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is logged in.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Player becomes a member of the selected club, or a join request is pending.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player searches clubs by filters.</p></li>
<li><p>Player opens a club's profile.</p></li>
<li><p>Player requests to join; system adds the Player or marks the request pending, per the club's settings.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U039</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Participate Tournament</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player or club search for and register for upcoming tournaments (FR-3.8, FR-3.9).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Player is logged in.</p></li>
<li><p>At least one open tournament exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Player/club is registered as a tournament entrant.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player searches tournaments by sport type, location, date range, and entry format.</p></li>
<li><p>Player opens a tournament's details.</p></li>
<li><p>Player registers individually or on behalf of a club.</p></li>
<li><p>System confirms the entry and, if required, proceeds to payment of the entry fee.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Registration closed/full</em></p></li>
</ol>
<blockquote>
<p>System informs the Player and suggests other tournaments.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Payment & Deposit*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U040</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Pay at Counter</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player defer payment to be made in person at the venue counter rather than paying online.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking ticket in "pending payment" state exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking is confirmed as reserved with payment marked as due at the venue.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player selects "Pay at Counter" during checkout.</p></li>
<li><p>System marks the ticket as reserved/unpaid.</p></li>
<li><p>Venue Owner later collects the payment on arrival via UC "Process Direct Payment".</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U041</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Pay Online</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Player pay for a booking or matchmaking slot online through an integrated Payment Gateway (FR-4.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player; Payment Gateway (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking ticket in "pending payment" state exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking is marked as paid and an electronic invoice is generated.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Player selects an online payment method.</p></li>
<li><p>System redirects the Player to the Payment Gateway.</p></li>
<li><p>Payment Gateway processes the transaction and returns a result.</p></li>
<li><p>System updates the ticket to "paid" upon a successful callback.</p></li>
<li><p>System executes UC "Export Electronic Invoice"</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Payment failed</em></p></li>
</ol>
<blockquote>
<p>System keeps the ticket unpaid and offers to retry or release the slot hold.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.2</p></li>
<li><p>NFR-2.4 (secure transmission)</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U042</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Process Direct Payment</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the Venue Owner record a cash/in-person payment collected at the venue counter.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking ticket exists with payment due at the venue.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The payment is recorded and the booking is marked as paid.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner receives cash/card payment from the customer.</p></li>
<li><p>Venue Owner enters the received amount in the system.</p></li>
<li><p>System executes UC "Export Electronic Invoice"</p></li>
<li><p>System marks the ticket as paid.</p></li>
<li><p>System executes UC "Send Payment Message" to notify the customer.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Printed receipt requested</em></p></li>
</ol>
<blockquote>
<p>Flow continues at UC "Export Bill"</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U043</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Process Online Payment</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Venue-side confirmation and record-keeping of a payment already completed online through the Payment Gateway.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A Player has completed UC "Pay Online" for a booking at this venue.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Venue Owner can see the transaction as settled.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System automatically confirms the ticket as paid upon the gateway's success callback.</p></li>
<li><p>System executes UC "Export Electronic Invoice"</p></li>
<li><p>System executes UC "Send Payment Message"</p></li>
<li><p>Venue Owner can view the transaction record in their dashboard.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U044</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Export Bill</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Generates a printable receipt for a completed direct/counter payment.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A direct payment has just been recorded.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A printable bill (PDF) is available for the transaction.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Venue Owner selects the completed transaction.</p></li>
<li><p>System generates a PDF bill.</p></li>
<li><p>Venue Owner prints or downloads it.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U045</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Export Electronic Invoice</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Generates an electronic invoice/receipt for any completed payment, online or direct (FR-4.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Venue Owner, Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A payment has just been completed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>An electronic invoice is generated and made available/sent to the customer.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System compiles the invoice data (items, amounts, taxes, parties).</p></li>
<li><p>System delivers the invoice via UC "Send Payment Message" / Email Gateway.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Notification & No-Show Prevention*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U046</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Send OTP</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Dispatches a one-time password to the user's registered email for verification purposes.</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Email Gateway (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>An OTP has been generated by the system.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The OTP message is delivered to the user's inbox.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System calls the Email Gateway API with the OTP payload and recipient address.</p></li>
<li><p>Email Gateway sends the message and returns a delivery status.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Delivery failure</em></p></li>
</ol>
<blockquote>
<p>System logs the failure and allows the user to request a resend.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.4</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U047</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Send Payment Message</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Sends a booking/payment confirmation message to the customer (FR-5.1, FR-5.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Email Gateway (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>A booking has been created or a payment has been completed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The customer receives a confirmation message with the booking/payment details.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System compiles the confirmation content, including the invoice if applicable.</p></li>
<li><p>System calls the Email Gateway to deliver the message.</p></li>
<li><p>Email Gateway sends the message and confirms delivery.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.4</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U048</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Send Remind Schedule</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Sends a reminder notification to Players before the scheduled time of a booking or matchmaking session (FR-5.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Email Gateway (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>An upcoming booking/session exists within the reminder window.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Player receives a reminder ahead of the scheduled time.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>A scheduler job identifies bookings/sessions starting within the reminder window.</p></li>
<li><p>System compiles the reminder content.</p></li>
<li><p>System calls the Email Gateway to deliver the reminder.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.4</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U049</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>No-Show Prevention System</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Estimates a booking's no-show probability and uses it to dynamically adjust the required deposit amount (FR-10.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>LLM Service (secondary)</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Sufficient historical booking/no-show data exists for the model.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The booking's required deposit is set according to its predicted no-show risk, and a reminder is scheduled.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System gathers relevant features (customer history, time slot, sport type) for the booking.</p></li>
<li><p>Model computes a no-show probability score.</p></li>
<li><p>System adjusts the required deposit amount based on the score.</p></li>
<li><p>System executes UC "Send Remind Schedule" to further reduce no-show risk.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Insufficient data</em></p></li>
</ol>
<blockquote>
<p>System applies the venue's default deposit policy instead.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-1.3</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Reviews & Ratings*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U050</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Review</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player write a text review of a venue after completing a booking (FR-6.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The Player's booking at the venue has been marked as completed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>A review is stored and linked to the venue.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System prompts the Player to review the venue after completion.</p></li>
<li><p>Player writes the review text.</p></li>
<li><p>System submits and stores the review, linked to the venue.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Player skips</em></p></li>
</ol>
<blockquote>
<p>System dismisses the prompt without creating a review.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U051</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Rating</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Player give a star rating (1-5) for the venue after completing a booking, which the Venue Owner can later view and respond to (FR-6.1, FR-6.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Player</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The Player's booking at the venue has been marked as completed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The rating is stored and the venue's aggregate rating is updated.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>System prompts the Player to rate the venue.</p></li>
<li><p>Player selects a star rating.</p></li>
<li><p>System stores the rating and recalculates the venue's average rating.</p></li>
<li><p>Venue Owner can view and respond to the rating/review.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***Referee Operations*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U052</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>View/Manage Schedule</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Referee view their assigned match/shift schedule (FR-8.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Referee</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Referee's account is approved and active.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The Referee's list of assigned shifts, with details, is displayed.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Referee opens their schedule screen.</p></li>
<li><p>System retrieves and displays the list of assigned shifts with venue, time, and match details.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Referee wants to decline a shift</em></p></li>
</ol>
<blockquote>
<p>Flow continues at UC "Decline Match Invitation"</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U053</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Decline Match Invitation</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets a Referee accept or submit a cancellation request for an assigned shift (FR-8.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>Referee</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>The Referee has a pending or confirmed shift assignment.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The shift is marked declined/cancelled and the Match Host/Venue Owner is notified to find a replacement.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Referee selects the shift in question.</p></li>
<li><p>Referee chooses to decline and optionally provides a reason.</p></li>
<li><p>System submits the cancellation request.</p></li>
<li><p>System notifies the Match Host/Venue Owner so a replacement referee can be arranged (UC "Hiring Referee").</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><em>None.</em></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

##### ***System Administration*** 

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U054</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Approve Registration Request</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the System Administrator review and approve or reject registration requests submitted by Venue Owners and Referees (FR-9.1).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>System Administrator</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>At least one registration request with status = pending exists.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The request is marked approved (account becomes active) or rejected (with reason).</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Administrator opens the list of pending requests.</p></li>
<li><p>Administrator opens a request's detail, including the submitted business license or credentials.</p></li>
<li><p>Administrator approves or rejects the request, optionally with a reason.</p></li>
<li><p>System updates the account status and notifies the applicant.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Missing/invalid documents</em></p></li>
</ol>
<blockquote>
<p>Administrator rejects the request and specifies the missing/invalid item.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U055</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Manage Users</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the System Administrator manage user accounts and assign role-based access permissions (FR-9.2).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>System Administrator</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Administrator is logged in.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The affected account's status/role/permissions are updated.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Administrator searches/filters the list of users.</p></li>
<li><p>Administrator opens a user's account and edits their role, permissions, or status.</p></li>
<li><p>System saves the changes and, if relevant, notifies the affected user.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Suspend account</em></p></li>
</ol>
<blockquote>
<p>Administrator suspends an account; the user is immediately unable to log in.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>NFR-2.2</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 32%" />
<col style="width: 67%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><em><strong>Use case ID</strong></em></th>
<th style="text-align: left;"><strong>U056</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Use Case</em></th>
<th><strong>Set Up System Parameters</strong></th>
</tr>
<tr>
<th style="text-align: left;"><em>Brief Description</em></th>
<th>Lets the System Administrator configure global system parameters and operational policies (FR-9.3).</th>
</tr>
<tr>
<th style="text-align: left;"><em>Actor</em></th>
<th>System Administrator</th>
</tr>
<tr>
<th style="text-align: left;"><em>Pre-Condition</em></th>
<th><ul>
<li><p>Administrator is logged in.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Result</em></th>
<th><ul>
<li><p>The updated parameters take effect across the system.</p></li>
</ul></th>
</tr>
<tr>
<th style="text-align: left;"><em>Main Scenario</em></th>
<th><ol type="1">
<li><p>Administrator opens the system settings panel.</p></li>
<li><p>Administrator edits a parameter (e.g., default cancellation window, OTP expiry time).</p></li>
<li><p>System validates and saves the new value, applying it system-wide.</p></li>
</ol></th>
</tr>
<tr>
<th style="text-align: left;"><em>Alternative Scenarios</em></th>
<th><ol type="1">
<li><p><em>Invalid value</em></p></li>
</ol>
<blockquote>
<p>System rejects the value and keeps the previous setting in effect.</p>
</blockquote></th>
</tr>
<tr>
<th style="text-align: left;"><em>Non-Functional Constraints</em></th>
<th><ul>
<li><p>None</p></li>
</ul></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

#  

# **Prototype/Mockup**

- Link Mockup: [<u>UI/UX screen</u>](https://drive.google.com/drive/folders/11NJSQEtH2KRz_-P7mLJCw-jz5UU_f3BR?usp=sharing)<img src="media/PA1/media/image6.png" style="width:2.51875in;height:6.59121in" /><img src="media/PA1/media/image3.png" style="width:3.081in;height:6.87529in" />

<img src="media/PA1/media/image1.png" style="width:2.06164in;height:8.32679in" /><img src="media/PA1/media/image7.png" style="width:3.14792in;height:7.13009in" />

<img src="media/PA1/media/image5.png" style="width:1.83444in;height:8.42262in" />

<img src="media/PA1/media/image8.png" style="width:3.29167in;height:7.4399in" />

<img src="media/PA1/media/image4.png" style="width:1.56321in;height:7.01439in" />
