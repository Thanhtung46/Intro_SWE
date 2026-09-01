# Introduction to Software Engineering

**Prepared by:**
- Nguyễn Thái Cường (24127336)
- Nguyễn Thanh Tùng (24127583)
- Đỗ Trương Khoa (24127423)
- K’Vớn (24127593)
- Đào Hoàng Phúc (24127496)

**Instructor:**
- Dr. Trần Duy Hoàng
- MSc. Trương Phước Lộc
- MSc. Phạm Hoàng Hải

---

## Table of Contents
1. [Member Contribution Assessment](#1-member-contribution-assessment)
2. [Test plan](#2-test-plan)
3. [Test cases](#3-test-cases)

---

## Software Testing
### Objectives
This document focuses on the following topics:
- Completing the Software Testing document with the following sections:
  - Test Plan
  - Test Cases
- Understanding the Software Testing document.

## 1. Member Contribution Assessment
**Group ID: 09**

| ID | Name | Assign ticket | Contribution (%) |
| :--- | :--- | :--- | :--- |
| 24127336 | Nguyễn Thái Cường | [#320] | 100% |
| 24127583 | Nguyễn Thanh Tùng | [#322] | 100% |
| 24127423 | Đỗ Trương Khoa | [#321] | 100% |
| 24127593 | K’Vớn | [#320] | 100% |
| 24127496 | Đào Hoàng Phúc | [#322] | 100% |

---

## 2. Test plan

### 2.1. Testing Objectives
The primary goal of this testing phase is to ensure that the SPOT (Sport Pitch Online Ticketing) system functions accurately, securely, and seamlessly across all platforms (Web and Mobile) as defined in the Software Requirements Specification (SRS).

### 2.2. Testing Levels
- **System Testing**: Evaluating the fully integrated application (Frontend, API Gateway, Core Services, and Database) to verify that all components work together correctly.
- **Acceptance Testing**: Validating the end-to-end workflows against user expectations to ensure the software satisfies the business requirements (Booking, Matchmaking, Referee Operations, and Administration).

### 2.3. Testing Types & Techniques
- **Functional Testing (Black-box Testing)**: Testers will evaluate the system's external behavior and UI functionality without observing the internal code.
- **Requirements-based Testing**: Test scenarios are derived directly from the FRs and NFRs specified in the SRS.
- **Equivalence Partitioning**: Applying valid and invalid data sets (e.g., correct vs. incorrect OTPs, valid vs. invalid passwords) to verify error handling and system validations.

### 2.4. Objects of Testing
- **Mobile Application (Player & Referee)**: Authentication workflows, Venue search and filtering, Online booking and payments, Matchmaking features, Voice-booking (AI Assistant), and Referee job board.
- **Web Application (Venue Owner & Admin)**: Interactive dashboard, Manual booking timeline, Facility and revenue management, Account verification, and System settings.

### 2.5. Testing Environment
- Testing will be conducted manually by the team members.
- The tests will interact with the designed user interfaces (based on Figma mockups) to validate inputs, state changes, and expected outputs.

---

## 3. Test cases

### 3.1. List of test cases

| Seq | Test case | Target | Description |
| :--- | :--- | :--- | :--- |
| 1 | TC_AUTH_01_Login_Valid | Authentication | Verify successful system login using a valid Email and Password. |
| 2 | TC_AUTH_02_Login_Invalid | Authentication | Verify the system denies login and displays an error when the user enters an invalid Email or Password. |
| 3 | TC_AUTH_03_Login_Locked | Authentication | Verify the system locks the account for 15 minutes after 5 consecutive failed login attempts. |
| 4 | TC_AUTH_04_Register_Player | Account Management | Verify successful Player account registration after entering basic info, verifying OTP, and selecting the role. |
| 5 | TC_AUTH_05_Register_Owner | Account Management | Verify Venue Owner registration, uploading a valid business license, and creating a pending request for Admin approval. |
| 6 | TC_AUTH_06_Forgot_Pass_Valid | Authentication | Verify the forgot password flow: successful OTP dispatch, valid verification, and updating to a new password. |
| 7 | TC_AUTH_07_OTP_Expired | Authentication | Verify the system rejects an expired OTP (over 5 minutes). |
| 8 | TC_AUTH_08_OTP_Max_Fails | Authentication | Verify the system temporarily locks the verification request after entering an incorrect OTP 3 consecutive times. |
| 9 | TC_MATCH_01_View_Matches | Matchmaking | Verify the display of open matches on the Matches screen, including the sport filtering feature. |
| 10 | TC_MATCH_02_Filter_Matches | Matchmaking | Verify the match filtering feature by Date, Time Range, Location, Skill Level, and Price Range on the Matches Filter screen. |
| 11 | TC_MATCH_03_Match_Detail | Matchmaking | Verify the display of match details, Squad list, and the number of available slots on the Match Detail screen. |
| 12 | TC_MATCH_04_Join_Match | Matchmaking | Verify the feature to join a match (including adding a Guest) and sending a request to the Host. |
| 13 | TC_MATCH_05_Host_Match | Matchmaking | Verify the flow of creating a new match (Host a Match) with complete venue, time, and skill information. |
| 14 | TC_MATCH_06_Manage_Matches | Matchmaking | Verify the display of the match list under Active, Completed, and Join Requests tabs on the Manage Matches screen. |
| 15 | TC_GROUP_01_View_Groups | Matchmaking | Verify the display of the community groups list under the Groups tab. |
| 16 | TC_GROUP_02_Join_Group | Matchmaking | Verify the feature to request joining a group (Join Group Now) from the group detail screen. |
| 17 | TC_GROUP_03_Create_Group | Matchmaking | Verify the flow of creating a new group with settings for the logo, description, and home venue. |
| 18 | TC_GROUP_04_Manage_Groups | Matchmaking | Verify the management of groups (Managed by Me) and approval of join requests on the Manage Groups screen. |
| 19 | TC_TOURN_01_View_Tournaments | Tournaments | Verify the display of the tournaments list under the "Tournaments" tab, including entry fees and the number of registered teams. |
| 20 | TC_TOURN_02_Tournament_Overview | Tournaments | Verify the display of detailed tournament information, including prizes, format, team list, and venue location. |
| 21 | TC_TOURN_03_Register_Team | Tournaments | Verify the flow of clicking "Register Team" to register for a tournament and pay the entry fee (if any). |
| 22 | TC_TOURN_04_View_Standings | Tournaments | Verify the display of the Standings Board and the filtering feature by Tournament Category. |
| 23 | TC_TOURN_05_View_Matches | Tournaments | Verify the display of the Match Schedule, including scores of completed matches and the "Remind Me" feature for upcoming matches. |
| 24 | TC_TOURN_06_View_Players | Tournaments | Verify the Athletes List accurately displays the Rank and Win Rate for players. |
| 25 | TC_TOURN_07_Create_Tournament | Tournaments | Verify the "Create a Tournament" feature from the floating menu to organize a new tournament. |
| 26 | TC_BOOK_01_View_Venue_List | Venue Search | Verify the display of the default venue list and the feature to toggle Map View. |
| 27 | TC_BOOK_02_Filter_Venues | Venue Search | Verify the venue filtering feature combining multiple criteria: Date, Time Range, Location, Distance, and Price Range. |
| 28 | TC_BOOK_03_Select_Date | Venue Search | Verify the feature to select a specific date from the Calendar popup to find available pitches. |
| 29 | TC_BOOK_04_View_Venue_Detail | Venue Search | Verify the full display of venue details (Amenities, Location, Verified badge). |
| 30 | TC_BOOK_05_Extra_Services | Venue Search | Verify the feature to toggle extra services (e.g., Hire a Referee) and ensure the system accurately updates the total amount. |
| 31 | TC_BOOK_06_Select_Pitch_Time | Venue Search | Verify the Select Pitch & Time matrix, ensuring users cannot select slots marked as "BOOKED". |
| 32 | TC_BOOK_07_Temporary_Lock | Venue Search | Verify the system automatically applies a Temporary Lock for 5 minutes on the selected slot when the user clicks "Confirm Booking". |
| 33 | TC_HOME_01_View_Dashboard | Dashboard | Verify the display of the Dashboard screen, the feature to switch sport tabs (Football/Badminton), and the "Upcoming Match" card. |
| 34 | TC_PROF_01_View_Profile | Account Management | Verify the accurate display of personal information, Hosted Matches metrics, Reviews, and the Favorites tab on the Profile screen. |
| 35 | TC_PROF_02_Edit_Basic_Info | Account Management | Verify the feature to update basic information (Name, Gender, Profile Picture) on the Edit Profile screen. |
| 36 | TC_PROF_03_Edit_Sensitive_Info | Account Management | Verify the system mandates OTP verification when the user changes sensitive information (Email, Phone Number). |
| 37 | TC_PROF_04_Update_Skills | Account Management | Verify the feature to add/edit sports and Skill Levels. |
| 38 | TC_NOTI_01_View_Notifications | Notification | Verify the display of the Notifications popup including notification types: Booking Confirmed, Match Invite, and System Update. |
| 39 | TC_NOTI_02_Interact_Match_Invite | Notification | Verify the functionality to click "Accept" or "Decline" directly on a Match Invite notification. |
| 40 | TC_SET_01_Settings_Navigation | System Navigation | Verify navigation on the Settings screen and the feature to toggle Push Notifications and Location Services. |
| 41 | TC_SET_02_Sign_Out | Authentication | Verify the Sign Out feature from the dropdown menu or the Settings screen. |
| 42 | TC_AI_01_Text_Chatbot | AI-Powered Services | Verify Natural Language Processing (NLP) capabilities when typing text to search for a pitch. |
| 43 | TC_AI_02_Voice_Booking | AI-Powered Services | Verify the voice recognition feature (Speech-to-Text) and the automatic generation of a Booking Draft. |
| 44 | TC_SCHED_01_View_Calendar | Account Management | Verify the display of the personal calendar (My Schedule) by month with event markers on corresponding days. |
| 45 | TC_SCHED_02_Upcoming_Completed | Account Management | Verify the accurate categorization of matches into "Upcoming" and "Completed". |
| 46 | TC_SCHED_03_Leave_Review | Reviews & Ratings | Verify navigation from the "Leave Review" button of a completed match to the review form. |
| 47 | TC_PAY_01_Checkout_Summary | Payment & Deposit | Verify the Checkout screen accurately displays the total pitch fee and extra services (Referee Service). |
| 48 | TC_PAY_02_Select_Method | Payment & Deposit | Verify the operation of selecting an online payment method (MoMo E-Wallet or Visa/Mastercard). |
| 49 | TC_PAY_03_Payment_Success | Payment & Deposit | Verify the successful payment flow redirecting to the Payment Success screen along with a QR code. |
| 50 | TC_REF_01_Submit_Credentials | Account Management | Verify the feature to upload ID card photos (front/back) and referee credentials (VFF National License). |
| 51 | TC_REF_02_Application_Review | Account Management | Verify the display of the "Application Under Review" screen tracking the approval progress from the Admin. |
| 52 | TC_REF_03_Account_Activated | Account Management | Verify the display of the "Account Activated" screen and redirection to the Job Board after Admin approval. |
| 53 | TC_REF_04_View_Invitations | Referee Operations | Verify the display of match details, location, and the Payment Breakdown (Base Match Fee + Travel Allowance). |
| 54 | TC_REF_05_View_Match_Detail | Referee Operations | Verify the flow of clicking the "Approve Request" button to accept an officiating invitation for a match. |
| 55 | TC_REF_06_Approve_Request | Referee Operations | Verify the flow of clicking the "Approve Request" button to accept an officiating invitation for a match. |
| 56 | TC_REF_07_Decline_Request | Referee Operations | Verify the flow of clicking the "Decline" button to reject an officiating invitation. |
| 57 | TC_REF_08_Job_Board | Referee Operations | Verify the display of matches looking for referees under the "Board" tab and the distance filtering feature. |
| 58 | TC_REF_09_Apply_Match | Referee Operations | Verify the flow of clicking the "Apply" button to proactively apply as a referee for a specific match. |
| 59 | TC_REF_10_Referee_Schedule | Referee Operations | Verify the "Schedule" tab accurately displays the work schedule by day and categorizes statuses (CONFIRMED, PENDING). |
| 60 | TC_REF_11_Earnings_Dashboard | Referee Operations | Verify the "Earnings" tab correctly calculates the total monthly income (This Month's Earnings) based on officiated match history. |
| 61 | TC_REF_12_Referee_Profile | Account Management | Verify the display of the Profile screen, including certification badges (FIFA, VFF), total officiated matches, and Rating. |
| 62 | TC_REF_13_Referee_Settings | System Navigation | Verify the Settings screen with the bottom navigation bar specifically tailored for the Referee role. |
| 63 | TC_OWNER_01_Dashboard | Venue Operations | Verify the Dashboard screen correctly displays KPI metrics (Revenue, Occupancy Rate) and the Booking Trends chart. |
| 64 | TC_OWNER_02_Manage_Bookings | Venue Operations | Verify the Bookings screen accurately displays pitch statuses on the Timeline (Available, Booked, Maintenance) and the "+ Manual Booking" feature. |
| 65 | TC_OWNER_03_Facility_Management | Venue Operations | Verify facility management, setting Peak/Off-peak pricing, and maintenance alerts. |
| 66 | TC_OWNER_04_Revenue_Report | Venue Operations | Verify the calculation and display of the Revenue chart, including Yield by Sport and the Export Report feature. |
| 67 | TC_OWNER_05_Respond_Reviews | Reviews & Ratings | Verify the "Reply to customer" feature and the display of Owner Response on the Reviews screen. |
| 68 | TC_ADMIN_01_Master_Dashboard | System Admin | Verify the Admin Master Dashboard accurately tallies total system revenue and the User Registration chart. |
| 69 | TC_ADMIN_02_Approve_Requests | System Admin | Verify the Pending Approvals screen, the attachment viewer feature, and the "Approve / Reject" buttons for Venues and Referees. |
| 70 | TC_ADMIN_03_User_Management | System Admin | Verify the filtering, searching, and status updating (Active/Suspend) features for user accounts. |
| 71 | TC_ADMIN_04_System_Settings | System Admin | Verify the configuration of Commission Rates and the toggling of Payment Gateways on the Settings screen. |

### 3.2. Test case specifications

#### Test case 1
- **Test case**: TC_AUTH_01_Login_Valid
- **Related Use case**: U001 - Login
- **Context**: The user has a registered account on the system, and the account is in ACTIVE status.
- **Input Data**: A valid, registered Email and Password.
- **Expected Output**: The system authenticates successfully, issues a login session (JWT), and redirects the user to their role-specific Dashboard.
- **Test steps**: 1. Access the application at the Login screen. 2. Enter a valid email into the Email field. 3. Enter a valid password into the Password field. 4. Click the Login button.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 2
- **Test case**: TC_AUTH_06_Forgot_Pass_Valid
- **Related Use case**: U002 - Forgot Password, U003 - Authenticate via OTP
- **Context**: The user forgot their login password but still has access to the registered email inbox.
- **Input Data**: Valid email, valid 6-digit OTP code, a new password (minimum 6 characters), and a matching confirmation password.
- **Expected Output**: The system successfully sends the OTP. The password is successfully updated in the database (encrypted via bcrypt/Argon2). The system displays a success message and redirects to the Login screen.
- **Test steps**: 1. From the Login screen, click Forgot password?. 2. Enter the email and click Send OTP Code. 3. Retrieve the OTP from the email, enter the 6 digits into the verification screen, and click Verify. 4. Enter the new password, confirm it, and click Update Password.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 3
- **Test case**: TC_AUTH_04_Register_Player
- **Related Use case**: U007 - Register Player's Account, U003 - Authenticate via OTP
- **Context**: A guest who has never registered this email/phone number on the system wishes to create an account.
- **Input Data**: Valid Name, Email, Phone number, Password (minimum 6 characters), matching Confirm password, and valid OTP code.
- **Expected Output**: The account is successfully created with an ACTIVE status. The system automatically logs the user in and redirects to the Dashboard.
- **Test steps**: 1. Enter basic registration details (Name, Email, Phone, Gender, Password) and click Register. 2. Enter the 6-digit OTP received via email and click Verify. 3. On the role selection screen, select the Player tab and click Complete.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 4
- **Test case**: TC_BOOK_06_Select_Pitch_Time
- **Related Use case**: U015 - Select Field
- **Context**: The user (Player) is viewing venue details and wants to choose a playing time slot.
- **Input Data**: A valid date, a specific pitch (e.g., Pitch A), and an empty time slot (not marked as "BOOKED").
- **Expected Output**: The system prevents the selection of "BOOKED" slots. Upon clicking Confirm, the system applies a Temporary Lock for 5 minutes on the chosen slot to prevent double-booking.
- **Test steps**: 1. On the Venue Detail screen, click View Calendar. 2. In the Select Pitch & Time matrix, choose a date from the slider. 3. Click on an empty cell intersecting the desired pitch and time. 4. Click the Confirm Booking button.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 5
- **Test case**: TC_BOOK_05_Extra_Services
- **Related Use case**: U016 - Book Field, U021 - Hiring Referee
- **Context**: The user has selected a time slot and is finalizing the price before proceeding to payment.
- **Input Data**: Toggling an extra service on (e.g., Hire a Referee + 150,000 VND).
- **Expected Output**: The total amount at the bottom accurately updates to include the referee service fee. The system initializes a Booking Ticket with these services and redirects to Checkout.
- **Test steps**: 1. On the Venue Detail screen, scroll down to the Extra Services section. 2. Note the initial price displayed on the Book Now button. 3. Toggle the switch for Hire a Referee. 4. Click the Book Now button.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 6
- **Test case**: TC_PAY_03_Payment_Success
- **Related Use case**: U041 - Pay Online
- **Context**: The user has finalized the time slot and extra services, and proceeds to online payment at the Checkout screen.
- **Input Data**: Payment method (MoMo E-Wallet or Visa) and a successful transaction on the payment gateway.
- **Expected Output**: The system receives a successful callback and updates the Booking status to PAID. The UI redirects to the Payment Successful screen displaying the Booking ID, QR code, and total amount.
- **Test steps**: 1. On the Checkout screen, select the MoMo E-Wallet payment method. 2. Click Confirm Payment. 3. Complete the transaction successfully on the partner's payment gateway.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 7
- **Test case**: TC_MATCH_05_Host_Match
- **Related Use case**: U034 - Create Session
- **Context**: The user (Match Host) wants to create a new match to find participating players.
- **Input Data**: Valid Match Title, Description, Location, Host Name, Phone Number, Schedule, and Court Configuration.
- **Expected Output**: The system successfully saves the match information. The match appears in the creator's Active tab and on the community feed.
- **Test steps**: 1. On the Matches homepage, click the + button. 2. Fill in the title, description, and select a location. 3. Set the Host information and match time. 4. Configure the number of courts and required skill. 5. Click Publish Match.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 8
- **Test case**: TC_MATCH_04_Join_Match
- **Related Use case**: U033 - Join Session
- **Context**: The user has viewed match details on the feed and decides to join along with a Guest.
- **Input Data**: The user's personal info and the Guest's info (Name, Phone number, Gender, Skill).
- **Expected Output**: A join request (for the user and the Guest) is sent to the Match Host. The status shows as pending or successful depending on the match configuration.
- **Test steps**: 1. On the Match Detail screen, click Join Match. 2. Enter personal information and a message for the Host. 3. Click + Add Guest and fill in the Guest's details. 4. Click Send Request.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 9
- **Test case**: TC_GROUP_03_Create_Group
- **Related Use case**: U038 - Join Club (Extension)
- **Context**: The user wishes to create a private sports club/group to manage schedules and members.
- **Input Data**: Valid Group Name, Required Skill Level, Description, Home Venue, Logo, and Cover Photo.
- **Expected Output**: The group is successfully created. It appears in the Managed by Me list on the Manage Groups screen.
- **Test steps**: 1. On the Manage Groups screen, click + Create Group. 2. Enter the Group Name, Skill Level, and Description. 3. Upload a Logo and Cover Photo image. 4. Click + Add Venue to assign a home venue. 5. Click Create Group.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 10
- **Test case**: TC_TOURN_03_Register_Team
- **Related Use case**: U039 - Participate Tournament
- **Context**: The user (Player) represents a team and wants to register for an open tournament.
- **Input Data**: A valid tournament with open slots, team information, and successful fee payment.
- **Expected Output**: The payment transaction is recorded (PAID). The team is added to the tournament's Registered Teams list, and the number of available slots decreases.
- **Test steps**: 1. Select a specific tournament from the Tournaments tab. 2. Click Register Team. 3. Fill in the participating team's information. 4. Execute the fee payment via the payment gateway.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 11
- **Test case**: TC_AI_02_Voice_Booking
- **Related Use case**: U019 - Chatbot
- **Context**: The user wants to book a pitch quickly using voice commands via the AI Assistant.
- **Input Data**: A clear voice command: "Find me a 7v7 football pitch for tonight."
- **Expected Output**: The system accurately performs Speech-to-Text. The AI automatically extracts entities and generates a Booking Draft with the Pitch Type, Location, Time, and Estimated Price.
- **Test steps**: 1. Click the Microphone icon on the search bar. 2. Speak the command: "Find me a 7v7 football pitch for tonight". 3. Wait for the system to process the NLP.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 12
- **Test case**: TC_REF_01_Submit_Credentials
- **Related Use case**: U010 - Register Referee's Account, U011 - Submit Credentials
- **Context**: The user wishes to register as a referee and needs to submit documentation proving their qualifications.
- **Input Data**: Photos of ID card (front and back), and a valid VFF National License file (PDF/JPG).
- **Expected Output**: The system stores the valid documents and initializes a VerificationRequest record with a PENDING status. It then redirects the user to the "Application Under Review" screen.
- **Test steps**: 1. During Referee Role registration, navigate to the Document Submission screen. 2. Upload the front and back photos of the ID card. 3. Upload the referee license file. 4. Click Submit for Review.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 13
- **Test case**: TC_REF_06_Approve_Request
- **Related Use case**: U052 - View/Manage Schedule, U053 - Decline Match Invitation (Accept portion)
- **Context**: A referee receives an officiating assignment request for a match and decides to accept the job.
- **Input Data**: A match invitation displayed in the referee's Pending tab.
- **Expected Output**: The RefereeAssignment status updates to ACCEPTED. The match automatically moves to the Confirmed tab and a confirmation notification is sent to the Match Host.
- **Test steps**: 1. Access the Pending tab on the schedule management screen. 2. Click on a match invitation to view the fee details. 3. Click Approve Request.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 14
- **Test case**: TC_OWNER_02_Manage_Bookings
- **Related Use case**: U029 - Process Booking, U07.1 - Manage court schedules
- **Context**: A customer books directly in person. The Venue Owner updates the booking schedule manually (Manual Booking) in the system to prevent online overlaps.
- **Input Data**: An empty court, an empty time slot, and the customer's booking info.
- **Expected Output**: The system successfully creates the Booking. The Timeline interface updates with a block displaying the customer's info at the chosen pitch/time. The schedule displays "BOOKED" to other users.
- **Test steps**: 1. Log in with Venue Owner privileges and open the Bookings tab. 2. Select a date on the calendar. 3. Click + Manual Booking or double-click an empty slot on the Timeline. 4. Enter the guest team's info and save.
- **Actual Output**: 
- **Result**: Passed / Failed

#### Test case 15
- **Test case**: TC_ADMIN_02_Approve_Requests
- **Related Use case**: U054 - Approve Registration Request
- **Context**: The Admin checks the documents of newly registered Venue Owners/Referees to grant them operational access to the system.
- **Input Data**: A registration request in PENDING status with valid attached files.
- **Expected Output**: The VerificationRequest status changes to APPROVED, and the User status changes to ACTIVE. The request is removed from the Pending queue, and an approval notification email is sent.
- **Test steps**: 1. Log in with a System Administrator account. 2. Open the Approvals tab and select the Venue Registrations section. 3. View the attached files of a request. 4. Click Approve Request.
- **Actual Output**: 
- **Result**: Passed / Failed
