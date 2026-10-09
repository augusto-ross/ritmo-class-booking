# Ritmo demo script

A walkthrough for the client meeting, about 15 minutes plus questions. Each step says what to click and the one idea to land. The sample data is generated around today's date, so the situations below exist on any day.

## Before the meeting

- [ ] Open the deployed link on a laptop (wide screen, for *Side by side*) and on a phone if you want to hand it over.
- [ ] Click **Reset demo** in the top bar. It restores the sample data, so earlier clicks don't change the story.
- [ ] Close other tabs of the prototype: each tab keeps its own state in the browser.
- [ ] Have the PRD open in another tab, at *Open questions*.

## 1. The problem, in one sentence (1 min)

> "Today every booking, cancellation and waitlist goes through the front desk. Ritmo moves that to the members' phones and fills freed spots on its own, under rules the studio controls."

Open the first screen: four profiles, two sides of the same product.

## 2. A member's week: Maya (3 min)

1. Pick **Maya**. Point at **Up next** (a class starting in about an hour) and **This week**.
2. **Your usual classes:** her favourites that are not booked yet, one tap to book. *"Most members take the same classes every week; this is where they land."*
3. Open **Schedule**, a day ahead, then **Filters**: class type and instructor with photos.
4. Open a class with spots left and **Book this class**. The detail now shows the rule in plain words (free cancellation until a given time) and **Add to calendar**. Use **Undo** on the toast if you don't want to keep it.
5. Tap the **bell**: confirmations, reminders, changes. Clear one, then **Undo**. In **Profile**, the reminder time and the email switch.

## 3. The waitlist fills itself: Maya and Leo (4 min)

Turn on **Side by side** (top bar) and choose **Leo** as the member. Keep **Carla** (admin) on the right.

1. **Freed spot, more than 2 hours ahead.** Switch the phone to **Maya**, open tomorrow's full class (**This week**), and **Cancel booking**. Switch to **Leo**: he is booked automatically, with a notification. The roster on the right updated too. *"No front desk, no empty spot."*
2. **Freed spot, inside 2 hours.** Click **Reset demo**. As **Maya**, cancel the class in **Up next**. She is warned it is a late cancellation and confirms. Switch to **Leo**: **Bookings** shows *A spot opened*, and he books it himself. *"Close to class we don't book anyone without asking, or they'd become a no-show. Everyone waiting is alerted; the first to book gets it."*

## 4. The front desk: Carla (4 min)

Leave side by side and pick **Carla**.

1. **Today:** four numbers; three of them open the list behind them (try **On waitlists**). **Suggestions**: a full class with people waiting suggests adding a second one; dismiss it with **X**.
2. **Classes need check-in:** open one, tap **Here** for a few people, then **Mark N left as here** for the rest. *"Nobody is ever counted as a no-show because the desk forgot to check them in."*
3. **New class:** the start time is already the first free slot. Change the room or time to show the free-slots chips and a clash warning. Close without saving, or add it.
4. **Schedule:** switch between **7 days**, **Month** and **Rooms**. In Rooms, click a room name to see its whole week.
5. **Members:** **Needs attention** (no-shows and late cancels, recorded, not penalised) and **Inactive** (a list for a "we miss you" message). Open a member and book them into a class from their panel.

## 5. The studio decides the rules (2 min)

1. Open **Rules**: the cutoff, what happens to a spot inside it, when check-in opens.
2. To show the third waitlist option, open the prototype with `?scenario=spot-held` at the end of the URL, as Carla. The rule is *Hold it for the front desk*, and Maya just cancelled: **Today** shows **1 spot to give**. Open it and **Give spot** to someone on the waitlist. Click **Reset demo** afterwards to go back to the default rule.

*"Three common ways the market handles this. We start with 'alert everyone', and you can change it any time without a new release."*

## 6. A new member: Sam (1 min)

Pick **Sam**. Nothing booked, no favourites: the home screen explains how to build a routine and suggests classes with room. In admin **Members**, Sam has a **New** badge instead of showing up as inactive.

## 7. Close (2 min)

- What is **out** on purpose: payments, penalties, recurring bookings, native apps, login (members will sign in with a link sent by email).
- The **open questions** in the PRD, starting with the cutoff, penalties and the check-in source (turnstile).
- **Next steps:** two weeks to validate with you and a few members, then build, pilot with some classes, and launch within three months.

## If something goes wrong

- **State looks odd:** **Reset demo**.
- **A class from the script isn't there:** the data is built around the moment of the last reset, so click **Reset demo** right before you start. Maya's *Up next* class is always about an hour away; after 10 PM it falls after midnight and shows as tomorrow.
- **Phone view on a laptop:** the member app is centred at phone width; this is expected.
