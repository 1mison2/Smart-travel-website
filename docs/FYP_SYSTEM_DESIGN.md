# Smart Travel Website - System Design (FYP)

## 1. High-Level Architecture

### Technology stack
- Frontend: React.js + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT
- Maps & Places: Google Maps API + Google Places API
- Payments: Khalti/eSewa (sandbox) with mock fallback
- Realtime Chat: Socket.IO

### Runtime architecture
1. React app calls Express REST APIs.
2. Express handles auth, validation, business logic, and database access.
3. Express integrates with Google Places and payment gateways on server side.
4. Socket.IO handles realtime travel buddy chat.
5. MongoDB stores users, itineraries, listings, bookings, payments, posts, and chat history.

---

## 2. Folder Structure (Implemented)

```txt
backend/
  config/
    db.js
    socket.js
  controllers/
    adminController.js
    authController.js
    bookingController.js
    chatController.js
    itineraryController.js
    listingController.js
    locationController.js
    paymentController.js
    placesController.js
  middleware/
    authMiddleware.js
    uploadMiddleware.js
  models/
    User.js
    Location.js
    Listing.js
    Booking.js
    Payment.js
    Itinerary.js
    CommunityPost.js
    Post.js
    Notification.js
    ChatMessage.js
  routes/
    authRoutes.js
    locationRoutes.js
    placesRoutes.js
    listingRoutes.js
    adminListingRoutes.js
    bookingRoutes.js
    paymentRoutes.js
    itineraryRoutes.js
    notificationRoutes.js
    chatRoutes.js
    adminRoutes.js
  utils/
    notificationService.js
```

---

## 3. Core Data Models

### User
- name, email, password, role (user/admin), authProvider
- profile and security fields

### Location (Destination)
- name, province, district, category, description
- averageCost, latitude, longitude, image

### Listing (Hotel/Activity)
- type: hotel/activity
- location object (name/address/district/province/lat/lng)
- pricePerUnit, capacity, amenities, photos

### Booking
- userId, locationId, date, amount
- bookingStatus: pending/confirmed/cancelled
- paymentStatus: pending/paid/failed/refunded
- paymentProvider, paymentId, paidAt

### Payment
- bookingId, userId, provider (khalti/esewa/mock)
- amount, currency, gatewayRef, status
- raw request/response for audit

### Itinerary
- userId, destination, durationDays, budget, interests
- day-by-day plan with estimated costs

### Community Post
- userId, title/content/images/tags
- moderation status

### Chat Message
- roomId, senderId, receiverId, text, isRead, timestamps

### Notification
- recipient, title, message, type, isRead, meta

---

## 4. REST API Design

## Authentication
- POST `/api/auth/signup`
- POST `/api/auth/login`
- POST `/api/auth/google`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- GET `/api/auth/me`

## Places & Discovery
- GET `/api/places/search?query=Pokhara`
- GET `/api/places/nearby?lat=28.2096&lng=83.9856&type=restaurant&radius=3000`
- GET `/api/places/details/:placeId`

## Listings
- GET `/api/listings`
- GET `/api/listings/:id`
- Admin:
  - POST `/api/admin/listings`
  - PUT `/api/admin/listings/:id`
  - DELETE `/api/admin/listings/:id`

## Itinerary
- POST `/api/itineraries/generate`
- GET `/api/itineraries/me`
- GET `/api/itineraries/:id`
- DELETE `/api/itineraries/:id`

## Booking
- POST `/api/bookings`
- GET `/api/bookings/me`
- GET `/api/bookings/:id`
- PUT `/api/bookings/:id/cancel`
- POST `/api/bookings/:id/payments/initiate`
- POST `/api/bookings/:id/payments/confirm`

## Payment
- POST `/api/payments/initiate`
- POST `/api/payments/verify`
- GET `/api/payments/me`

## Notification
- GET `/api/notifications/me`
- PUT `/api/notifications/:id/read`
- PUT `/api/notifications/read-all`

## Chat
- GET `/api/chat/recent`
- GET `/api/chat/conversation/:userId`
- Socket events:
  - `chat:join`
  - `chat:send`
  - `chat:message`
  - `chat:read`

## Admin
- Existing admin routes for users, locations, bookings, and posts.
- Added booking status update route:
  - PUT `/api/admin/bookings/:id/status`

---

## 5. Integration Notes

## Google Places API
- Backend route `/api/places/nearby` calls Google Places v1.
- If API key is missing/fails, local MongoDB locations are used as fallback.

## Khalti/eSewa
- Initiation endpoint records payment with provider and gateway reference.
- Verification endpoint updates both payment and booking statuses.
- Replace mock/sandbox placeholder with real provider verification calls.

## Socket.IO Chat
- JWT is validated during socket handshake.
- Messages are persisted in MongoDB.
- Read receipts supported via `chat:read`.

---

## 6. Nepal Demo Flow (Viva Ready)

### Example: Pokhara trip
1. User searches destination: "Pokhara".
2. App shows nearby cafes, hotels, and attractions (Lakeside, Phewa area).
3. User generates 3-day itinerary with budget 15000 NPR.
4. User creates booking for a hotel/activity.
5. User initiates payment via Khalti/eSewa sandbox.
6. Backend verifies payment and marks booking as paid + confirmed.
7. User/admin receive notifications.
8. User can chat with a travel buddy for same date range.

---

## 7. Security Checklist
- JWT-protected routes with role checks.
- Account block check before access.
- Server-side verification for payment status updates.
- Booking ownership checks for user operations.
- Input sanitization and object-id validation.
- Raw payment request/response stored for audit.

---

## 8. Suggested Next Implementation Steps
1. Add frontend pages for:
   - Destination search + map explorer
   - Itinerary planner output view
   - Payment method selection page (Khalti/eSewa)
   - Travel buddy finder + realtime chat UI
2. Add API validation middleware (Joi/Zod).
3. Add test suites for auth, booking, and payment verification.
4. Add demo seed data for Kathmandu/Pokhara/Chitwan/Lumbini.

