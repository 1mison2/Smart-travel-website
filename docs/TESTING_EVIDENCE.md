# Smart Travel Nepal Testing Evidence

Date tested: 2026-05-22

## Automated Test Results

| Area | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend logic tests | `cd backend && npm.cmd test` | Passed | `4/4 tests passed` |
| Frontend lint check | `cd frontend/frontend && npm.cmd run lint` | Passed with warnings | `0 errors, 21 warnings` |
| Frontend production build | `cd frontend/frontend && npm.cmd run build` | Passed | Vite build completed successfully |

## Backend Tests Covered

The backend automated tests currently verify:

| Feature | What Was Tested | Result |
| --- | --- | --- |
| Budget rules | Minimum budget calculation for destinations such as Pokhara and Mustang | Passed |
| Itinerary planner | Generates recommended, saver, and explorer alternatives | Passed |
| Moderation defaults | New posts and reviews default to pending status | Passed |
| Booking pricing | Booking type, night calculation, service fee, tax, and total amount | Passed |

## Notes From Lint And Build

- The frontend lint command passes without errors.
- There are 21 React hook dependency warnings. These are warnings, not failing errors.
- The frontend production build completes successfully.
- Vite reports a large JavaScript chunk warning. The app still builds, but future optimization can use route-based code splitting.
- Browserslist data is outdated. This is maintenance-only and does not block the submission.

## Manual Testing Evidence To Capture

Take screenshots for these pages and actions:

| Feature | Test Action | Expected Result | Screenshot Name |
| --- | --- | --- | --- |
| Authentication | Register or log in with a user account | User reaches the main app successfully | `01-login-success.png` |
| Destination browsing | Search/open a destination | Destination details load correctly | `02-destination-details.png` |
| Itinerary planner | Generate a trip plan | Multiple itinerary options are shown | `03-itinerary-generated.png` |
| Booking | Create or quote a booking | Correct price/booking details appear | `04-booking-checkout.png` |
| My bookings | Open booking history | User bookings are listed | `05-my-bookings.png` |
| Payment | Open payment page or confirmation page | Payment status/details are visible | `06-payment-page.png` |
| Community | Create/view posts, blogs, reviews, or buddy finder | Community section works without layout issues | `07-community.png` |
| Admin dashboard | Log in as admin and open dashboard | Admin statistics/navigation are visible | `08-admin-dashboard.png` |
| Admin management | Open users, locations, bookings, or notifications | Admin table/data loads correctly | `09-admin-management.png` |
| Responsive UI | Open main pages on mobile width | Layout adapts without overlap | `10-mobile-view.png` |

## Suggested Submission Evidence Package

Include these items in your final project submission:

1. Screenshots of the three command outputs:
   - Backend test pass
   - Frontend lint pass
   - Frontend build pass
2. Screenshots from the manual testing checklist above.
3. This testing evidence document.
4. A short paragraph in your report:

```text
The Smart Travel Nepal system was tested using backend automated tests, frontend lint validation, production build verification, and manual end-to-end testing of the main user and admin workflows. Backend tests passed 4/4 cases, frontend lint completed with 0 errors, and the frontend production build completed successfully. Manual testing covered authentication, destination browsing, itinerary generation, bookings, payments, community features, admin dashboard functions, and responsive layout checks.
```
