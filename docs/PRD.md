# Ritmo: class booking for a local gym

**Product Requirements Document**

| | |
|---|---|
| **Author** | Augusto Ross |
| **Client** | Owner of a single-location gym (name to be confirmed) |
| **Status** | Draft 2, for review with the client |
| **Last updated** | October 2026 |
| **Target release** | Within 3 months of sign-off |
| **Prototype** | [ritmo-app-bay.vercel.app](https://ritmo-app-bay.vercel.app) · source: [github.com/augusto-ross/ritmo-class-booking](https://github.com/augusto-ross/ritmo-class-booking) |

**Contents:** 1. Summary · 2. Problem · 3. Goals and non-goals · 4. Success metrics · 5. Users · 6. Solution overview · 7. Requirements · 8. Business rules · 9. Notifications · 10. Non-functional requirements · 11. Assumptions and dependencies · 12. Risks · 13. Open questions · 14. Release plan · 15. Future work · Appendix

---

## 1. Summary

The gym runs several kinds of group classes (pilates, spinning, muay thai and others) and manages who attends them by hand. Bookings, cancellations and waitlists all pass through the admin team, and that is where the owner feels the most pain.

**Ritmo** is the gym's own booking app. Members book, cancel and join waitlists from their phone, and freed spots are filled automatically under rules the studio controls. The admin team gets one place to see how full every class is, run check-in, and act on what needs attention.

This document describes the first release. A clickable prototype with realistic sample data comes with it, so every requirement marked "Yes" in section 7 can be tried, not only read.

## 2. Problem

### What happens today

| | |
|---|---|
| **Business** | A small, single-location gym with a local membership and a varied weekly class schedule across a few rooms. |
| **Today** | Class attendance is coordinated manually by the admin team, which takes bookings and keeps the lists by hand. How members reach the team today is to be confirmed (Q9). |
| **Main pain** | Administration: taking bookings, handling cancellations, keeping waitlists in order, and knowing which time slots still have room. |

### Why it matters

- **Empty places in wanted classes.** A cancelled spot that nobody hears about stays empty while other members wanted it.
- **Staff time.** Every booking, cancellation and "is there room?" question is handled by a person.
- **No visibility for members.** They cannot tell if a class has room without asking the team.
- **No data.** Without records of late cancellations and no-shows, the owner cannot decide on a fair policy.

### Evidence

From the discovery meeting: the class types, the manual process, and administration as the main pain. Everything else in this document that describes how members and staff behave today is a working assumption, marked as such, to validate with the owner. Numbers (classes per week, members, cancellations) are not available yet and are the first open question to close (Q9).

## 3. Goals and non-goals

### Goals

1. **Self-service.** Members book, cancel and join waitlists without contacting the gym.
2. **No empty spots by accident.** A freed spot reaches an interested member with no staff action, under rules the studio sets.
3. **One view for the front desk.** The admin team sees occupancy, waitlists and pending check-ins for any class in seconds, and acts from the same screen.
4. **Data for decisions.** Late cancellations and no-shows are recorded, so the owner can choose a policy with real numbers.

### Non-goals (first release)

| Item | Why not now | Never or later |
|---|---|---|
| Payments, plans and class credits | Not part of the stated problem. Every active member can book any class (A1). | Later, if the gym wants it |
| Penalties for late cancellations or no-shows | Recording comes first; a policy decided without data is a guess. | Later (Q2) |
| Automatic recurring bookings | A standing spot that is not used blocks others. Favourites give most of the convenience without that risk. | Later (Q3) |
| Native iOS and Android apps | A responsive web app covers every flow with nothing to install and fits the timeline. | Later (Q6) |
| Member sign-up and membership management | Members already exist in the gym's records (A2). | Never in Ritmo: stays in the gym's system |
| Instructor accounts | Instructors appear on each class but do not sign in. | Later (Q5) |
| Multiple locations | One gym, one location. | Later |

## 4. Success metrics

| Metric | Target | Notes |
|---|---|---|
| **Primary:** share of bookings made by members themselves | Above 80% two months after launch | Bookings made by the front desk on a member's behalf are tracked separately. |
| Share of freed spots that get refilled before class | Above 60% | Shows whether the waitlist rules work. |
| Average class occupancy | Up from today's baseline | Needs a baseline (Q9). |
| Late cancellations and no-shows per week | Measured, no target in release 1 | Input for the penalty decision (Q2). |
| Classes ended with members not checked in | Close to zero after the first month | Shows whether check-in fits the front desk's routine. |

## 5. Users

The profiles below are working assumptions, to validate with the owner and a few members in the first two weeks (section 14).

### Member (primary user)

*Assumed:* takes a few classes a week, often the same ones, and books mostly on a phone. This is why the member app is designed for phones first.

**Jobs to be done**

- *When I plan my week,* I want to see my usual classes ready to book, *so I can* secure them in one tap.
- *When a class is full,* I want to get in line and know where I stand, *so I can* decide whether to wait or pick another time.
- *When my plans change,* I want to cancel myself, *so that* my spot goes to someone else without contacting the front desk.
- *When something changes* (a spot opens, the class is cancelled, a new instructor), I want to hear about it straight away.

### Admin team: owner and front desk

Runs the schedule and the day-to-day. *Assumed:* works mostly at a computer at the front desk, sometimes from a phone. This is why the admin is designed for desktop first and also works on a phone.

**Jobs to be done**

- *When the day starts,* I want to see today's classes, how full they are and what needs action, *so I can* plan the desk.
- *When a class ends,* I want to confirm who came in a few taps, *so that* records are right without paperwork.
- *When I add a class,* I want to see when the room and instructor are free, *so I* don't have to guess.
- *When I change or cancel a class,* I want the affected members told automatically.

### Instructor (not a user in release 1)

Shown with name and photo on each class. Whether instructors need their own access is Q5.

### Personas in the prototype

| Persona | Role | What they show |
|---|---|---|
| **Maya** | Regular member | Full routine: bookings this week, favourites, a booked class that is full with a waitlist behind her. |
| **Leo** | Member on waitlists | First in line for Maya's class; sees automatic promotion and "a spot opened" alerts. |
| **Sam** | New member | First day: nothing booked, no favourites. Shows empty states and suggestions. |
| **Carla** | Front desk (admin) | Today's overview, schedule, members, check-in and studio rules. |

## 6. Solution overview

Ritmo is one responsive web app with two sides, sharing the same data and rules.

### Member app (phone first)

| Area | What it does |
|---|---|
| **Home** | *Up next* (the next booked class, with photo), *This week* (bookings and waitlists in the next 7 days), *Your usual classes* (favourites not yet booked, with one-tap Book or Waitlist). A new member sees *Build your routine* and *Coming up at Ritmo* instead. |
| **Schedule** | Two weeks ahead, day by day, grouped into morning, afternoon and evening. Filters by class type and instructor (with photos). Each class shows time, instructor, room, spots left and the member's own status. |
| **Class detail** | Photo, instructor, room, duration, occupancy and waitlist size. Once the member is booked or waiting, the rule that applies to them in plain words (free cancellation until a given time; what happens inside the cutoff). Book, join or leave the waitlist, cancel, favourite, and add to calendar. |
| **Bookings** | *A spot opened* (waitlists where the member can claim a free spot) first, then booked classes, waitlists, and recent history. |
| **Notifications** | Bell with unread count. Each notice links to its class; can be cleared one by one or all at once, with undo. Email preview when email is on. |
| **Profile** | Class reminder (none, 30 min, 1 h, 2 h), email on or off, list of favourite classes. |

### Admin (desktop first, works on a phone)

| Area | What it does |
|---|---|
| **Today** | Four indicators (classes today, spots filled, on waitlists, late cancels); three of them open the filtered list behind them. *Suggestions* (two at a time, dismissible) flag classes with high demand or low bookings. *Spots to give* (when the hold rule is on). Classes needing check-in first, then what is coming up, then tomorrow. |
| **Schedule** | Three views: 7 days, month, and rooms (all rooms for a day, or one room for the week). Filters by class type, instructor, room and "has a waitlist". The admin chooses what each class block shows (instructor, room, bookings). |
| **Class panel** | Roster with check-in (Here, No-show, mark all as here), waitlist in order with *Give spot*, change instructor, edit, cancel with a reason. |
| **New class form** | Type, instructor, room, date, start time, duration, capacity, weekly repeat. A room-day panel shows booked and free time; free slots are offered as one-tap chips; the start time defaults to the first free slot. Clashes with the room or the instructor are flagged before saving. |
| **Members** | All, Needs attention, Inactive. Attendance rate, usual class, bookings in the next 7 days, last visit, no-shows and late cancels; search, period (7 or 30 days), sorting. Member panel with history and *book into a class*. |
| **Rules** | Free-cancellation cutoff, what happens to a spot that opens inside it, when check-in opens. |

### Key flows to try in the prototype

1. A member books a class, gets a reminder, and adds it to the calendar.
2. A booked member cancels more than 2 hours ahead: the first person waiting is booked automatically and notified.
3. A booked member cancels inside 2 hours: everyone waiting is alerted and the first to book gets the spot (or the front desk gives it, depending on the rule).
4. The front desk creates a class at a free time, changes an instructor, cancels a class: members are notified.
5. After a class, the front desk checks members in; unmarked members are flagged, never counted as no-shows.

The README has a step-by-step demo script.

## 7. Requirements

Priority: **Must** for launch, **Should** if time allows, **Later** after launch. The last column shows what the prototype demonstrates.

### Member

| # | Requirement | Priority | Prototype |
|---|---|---|---|
| M1 | Browse the schedule up to two weeks ahead, by day, filtered by class type and instructor | Must | Yes |
| M2 | For each class, see time, duration, instructor, room, spots left and my own status | Must | Yes |
| M3 | Book a class with free spots in one tap, with undo | Must | Yes |
| M4 | Be warned when a booking overlaps another class I have booked | Should | Yes |
| M5 | Cancel a booking myself | Must | Yes |
| M6 | Be warned before a late cancellation and asked to confirm | Must | Yes |
| M7 | Join the waitlist of a full class, see my position, leave at any time | Must | Yes |
| M8 | When a spot opens in a class I am waiting for, see it clearly and book it myself | Must | Yes |
| M9 | Mark classes I take every week as favourites and see them on the home screen, ready to book | Should | Yes |
| M10 | See my bookings, waitlists and recent attendance | Must | Yes |
| M11 | Receive notifications for the events in section 9, in the app and by email | Must | In-app, with email preview |
| M12 | Choose a class reminder time, or none, and turn email on or off | Should | Yes |
| M13 | Clear notifications from my inbox, with undo | Should | Yes |
| M14 | Add a booked class to my phone or computer calendar | Should | Yes (.ics file) |
| M15 | Sign in securely (see section 10, Access) | Must | No (profile switcher) |

### Admin

| # | Requirement | Priority | Prototype |
|---|---|---|---|
| A1 | See today's and tomorrow's classes with occupancy and waitlist size | Must | Yes |
| A2 | See the schedule by week, month and room, filtered by class type, instructor, room and waitlist | Must | Yes |
| A3 | Create a class: type, instructor, room, date, time, duration, capacity, weekly repeat | Must | Yes |
| A4 | While creating a class, see when the room is free, and be warned when the room or the instructor is already taken | Should | Yes |
| A5 | Edit one occurrence (time, room, capacity, instructor); affected members are notified | Must | Yes |
| A6 | Cancel one occurrence with a reason; everyone booked or waiting is notified | Must | Yes |
| A7 | Open a class roster and its waitlist in order | Must | Yes |
| A8 | Book or remove a member on their behalf | Must | Yes |
| A9 | Check members in and mark no-shows, with one action to mark everyone still unmarked as present | Must | Yes |
| A10 | Flag classes that ended with members not checked in, on the class and on the daily overview | Must | Yes |
| A11 | Give a free spot to anyone on the waitlist, in any order | Must | Yes |
| A12 | Edit the studio rules: cutoff, what happens to a spot inside it, when check-in opens | Should | Yes |
| A13 | See attendance, late cancellations and no-shows per member; list members who need attention or are inactive | Should | Yes |
| A14 | Get suggestions for classes with high demand or low bookings, and dismiss them | Should | Yes |
| A15 | Edit a whole recurring series at once | Should | No |
| A16 | Manage class types, instructors (with photo) and rooms | Should | No (sample data) |
| A17 | Different permissions for the owner and front desk staff | Later | No |

### Acceptance criteria for the critical flows

**Automatic promotion (M7, R3)**
- *Given* a full class with a waitlist, *when* a booked member cancels more than the cutoff before class, *then* the first member waiting is booked, is notified, and the class stays full.

**Spot inside the cutoff (M8, R4)**
- *Given* the rule "alert everyone waiting", *when* a spot opens inside the cutoff, *then* everyone on the waitlist is notified, each sees "Book the free spot", and the first to book gets it; the others stay on the waitlist.
- *Given* the rule "hold it for the front desk", *when* a spot opens inside the cutoff, *then* no member can book it, and the admin sees it under *Spots to give*.

**Last spot (section 10, Consistency)**
- *Given* one spot left, *when* two members book at the same moment, *then* exactly one booking succeeds and the other member is offered the waitlist.

**Check-in (A9, A10, R6)**
- *Given* a class that has ended, *when* booked members were not marked, *then* they show as "not checked in", the class appears under *needs check-in*, and they are not counted as no-shows.

**New class (A3, A4)**
- *Given* a room with classes booked that day, *when* the admin opens *New class*, *then* the start time defaults to the first free slot that fits the duration, and choosing a time that clashes shows which class it clashes with before saving.

## 8. Business rules

Values are proposals to confirm with the gym. Those marked *setting* can be changed by the studio in **Rules**.

| # | Rule |
|---|---|
| R1 | A class has a fixed capacity. Booking is open until the class starts, up to two weeks ahead. |
| R2 | A waitlist is ordered by time of joining. |
| R3 | **Automatic promotion.** When a spot frees up more than **2 hours** (*setting*: 1, 2, 3, 6 or 12 h) before class, the first member waiting is booked automatically and notified. They can cancel if they no longer want it. |
| R4 | **Inside the cutoff**, nobody is booked without being asked. By default everyone waiting is alerted and the first to book gets the spot (*setting*: or give it to the next in line, or hold it for the front desk to give from the roster). |
| R5 | Members cancel for free up to the cutoff. Later cancellations are allowed, release the spot, and are recorded as late cancellations. |
| R6 | Check-in opens **90 minutes** before class (*setting*: 30, 60, 90 or 120 min). Each booked member is marked *present* or *no-show*. A member left unmarked after the class is *not checked in*, never an automatic no-show, so a forgotten check-in never counts against a member. |
| R7 | Raising a class's capacity offers the new spots to the waitlist first, following R3 and R4. |
| R8 | A member removed by the admin team is not counted as a late cancellation. |
| R9 | A member **needs attention** when their no-shows plus late cancellations reach 2 in the last 7 days or 4 in the last 30 days, depending on the period the admin is looking at. A member is **inactive** after 21 days without attending; new members are not counted as inactive. Recorded, not penalised. |
| R10 | **Suggestions** flag a full class with 2 or more people waiting (*high demand*), and a class starting within a day with less than 40% of its spots booked (*low bookings*). |

**Why this waitlist model.** It follows established studio software. Mindbody promotes automatically with a lock window before class. Mariana Tek fills automatically until a cutoff, then alerts the whole waitlist and the first to claim gets the spot. TeamUp promotes automatically only when the spot opens more than a set time ahead. The cutoff exists so nobody is booked into a class they don't know about and then recorded as a no-show. The 12-hour window common in boutique studios (ClassPass, for example) looked strict for a neighbourhood gym, so the proposal is 2 hours, kept as a setting.

## 9. Notifications

Sent only for events that change a member's plans.

| Event | Who is notified |
|---|---|
| Booking confirmed | The member |
| Promoted from the waitlist | The member |
| A spot opened inside the cutoff | Everyone on that waitlist (under the default rule) |
| Class cancelled by the gym | Everyone booked or waiting |
| Class changed (time, room or instructor) | Everyone booked or waiting |
| Reminder before class | Everyone booked, at the time each member chose |
| Removed from a class by the studio | The member |
| Welcome | New members |

**Channels.** Email is the guaranteed channel for release 1, with the same messages listed in the app. A messaging channel such as WhatsApp or SMS would be read faster but has a per-message cost and a provider approval process (Q4).

**Inbox.** Members can clear notifications; clearing never changes what was already emailed, and a reminder is never sent twice for the same class. In the product, notifications older than 30 days leave the inbox automatically (not simulated in the prototype).

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| **Responsive** | Member app works from 360px wide. Admin works on desktop and on a phone. |
| **Speed** | The schedule is usable within 2 seconds on a mid-range phone on a mobile connection. |
| **Accessibility** | WCAG 2.1 AA: text contrast, keyboard access, visible focus, and class status never shown by colour alone. |
| **Consistency** | Two members can never take the same last spot. Waitlist order is strict. Rules run on the server, not the phone. |
| **Access** | Members sign in with a one-time link sent by email, no password. Access is granted only to active members from the gym's list. Staff sign in with email; one admin role in release 1. Social login and open sign-up are out of scope. |
| **Privacy** | Members never see other members' names. Personal data is limited to name, email and attendance, under the data protection law that applies to the gym (for example LGPD or GDPR). Instructor photos are used with consent. |
| **Availability** | Booking works around the clock. Class changes reach members within a minute. |
| **Language and time** | English in the prototype; launch language to be confirmed. Times shown in the gym's time zone. |

## 11. Assumptions and dependencies

### Assumptions

| # | Assumption |
|---|---|
| A1 | Every active member can book any class. There are no credits or per-class charges. |
| A2 | The gym already has its member list, which can be imported. |
| A3 | A single location with a few rooms (the prototype uses four). |
| A4 | Members have a smartphone and an email address. |
| A5 | The owner and the front desk do the same tasks in the system for now. |
| A6 | Name and visual identity are open. "Ritmo" and the look of the prototype are a proposal. |
| A7 | The gym supplies class and instructor photos. The prototype uses placeholder images. |

### Dependencies

- **Member list** from the gym's current system or spreadsheet (format to confirm).
- **Email provider** for transactional email (for example Postmark, Resend or Amazon SES).
- **Hosting and database** with transactions, for the last-spot rule.
- **Turnstile integration** only if automatic check-in is chosen (section 15).

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Members keep messaging the desk instead of using the app | Self-service goal missed | Pilot with a subset of classes; desk books on the member's behalf at first, with the share tracked; QR code at reception. |
| Automatic promotion books someone who forgot they were waiting | No-show, unhappy member | Cutoff (R3), notification on promotion, free cancellation. |
| Check-in is skipped on busy days | Wrong attendance data | One-tap *mark all as here*, *needs check-in* flag; turnstile later. |
| Email lands in spam or is ignored | Members miss changes | In-app inbox as the source of truth; messaging channel later (Q4). |
| Rules feel unfair to members | Complaints at the desk | Rules shown in the class detail at the moment they apply; settings changeable without a release. |

## 13. Open questions for the client

1. **Cutoff.** Is 2 hours right for free cancellation and automatic promotion? Should it differ by class type? Inside it, should a freed spot go to everyone waiting, to the next in line, or to the front desk? (All three are settings in the prototype.)
2. **Penalties.** Should late cancellations or no-shows have a consequence (a warning, a temporary booking block, a fee)? The proposal is to collect a month of data first.
3. **Recurring bookings.** Should a member be able to hold a standing weekly spot? If so, what happens when they repeatedly miss it?
4. **Messaging channel.** Is email enough at launch, or is WhatsApp or SMS worth the per-message cost?
5. **Instructors.** Do they need to see their rosters or check members in themselves?
6. **Native app.** Is presence in the app stores a requirement, or is a web app on the home screen enough?
7. **Booking limits.** Is two weeks ahead right? Is there a limit on bookings per day or per week?
8. **Roles.** Should front desk staff be restricted from anything the owner can do, such as cancelling classes or changing rules?
9. **Today's process and baseline.** How do members book and cancel today: in person, by phone, by message? How many classes a week, members and cancellations does the gym handle, and where is that data? Do members take the same classes every week, and do they mostly use a phone?
10. **Brand.** Does the gym have a name and identity to apply?
11. **Check-in source.** Who marks attendance today: front desk, instructor, or nobody? Which turnstile model is used, and can it export entries? Are there activities besides classes, so that entering the building does not mean attending a class?
12. **Member list.** Where does the list of active members live today, and how does someone stop being active?

## 14. Release plan

| Phase | Weeks | Outcome |
|---|---|---|
| **Validate** | 1 to 2 | Walk the prototype through with the owner and two or three members; settle the open questions; agree the rules in section 8. |
| **Build the core** | 3 to 8 | Sign-in, schedule, booking, waitlist, admin, check-in, email notifications. |
| **Pilot** | 9 to 10 | Run a subset of classes with real members next to the current process; fix what comes up. |
| **Launch** | 11 to 12 | Import all members, move every class over, support the front desk through the first weeks. |

## 15. Future work

In rough order of expected value, to be confirmed by the pilot data:

1. **Penalty policy or recurring bookings**, depending on what the no-show data shows.
2. **Messaging channel** (WhatsApp or SMS) for spot alerts and changes.
3. **Automatic check-in.** A turnstile entry proves the member is in the building, not in the class. Proposed rule: a booked member whose entry falls between 30 minutes before and 10 minutes after the start is marked present; booked members with no entry become *likely no-show* for the desk to confirm. Alternatives with no hardware: the instructor marks attendance on a phone, or members scan a QR code at the studio door.
4. **Instructor access** to their rosters.
5. **Admin tools:** edit a recurring series, drag a class to reschedule, a notification centre for the desk, demand signals from history (not only today's waitlists).
6. **Owner and front desk roles.**

---

## Appendix

### A. Market reference

| Product | Waitlist behaviour |
|---|---|
| Mindbody | Automatic promotion, with a lock window before class. Option for "first to claim". |
| Mariana Tek | Automatic fill until a cutoff, then alert the whole waitlist; first to book gets it. |
| TeamUp | Automatic promotion only when the spot opens more than a set time ahead. |
| ClassPass | 12-hour cancellation window at many studios; late cancel and no-show fees. |

### B. Prototype notes

- Frontend only: React, TypeScript and Tailwind, deployed on Vercel. Data lives in the browser and resets with **Reset demo**.
- The business rules run as plain functions with automated tests (35), so the rules can move to a server unchanged.
- Sample data is generated around today's date: about 90 members, five class types, six instructors, four rooms, 30 days of history and 45 days ahead.
- Class photos are public domain; instructor photos are AI-generated placeholders.

### C. Glossary

| Term | Meaning |
|---|---|
| **Cutoff** | Time before class after which cancellations are late and spots are no longer given automatically. |
| **Late cancellation** | A cancellation inside the cutoff. Allowed and recorded. |
| **No-show** | A booked member marked as not attending. |
| **Not checked in** | A booked member nobody marked after the class. Not a no-show. |
| **Promotion** | Moving the first member on the waitlist into a freed spot. |

### D. Change log

| Version | Change |
|---|---|
| Draft 1 | Structure, requirements and rules after the discovery meeting. |
| Draft 2 | Reorganised to the usual PRD layout (goals and non-goals, metrics, acceptance criteria, risks). Added studio rules as settings, rooms view and availability in the class form, members screen, suggestions, reminders and notification preferences, add to calendar, access model, and the new-member persona. |
