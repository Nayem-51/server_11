# Lesson Platform Backend Server

A Node.js/Express backend server for a lesson platform with MongoDB, Firebase authentication, and Stripe payments integration.

## 🏗️ Project Structure

```
server_11/
├── controllers/          # Business logic controllers
│   ├── authController.js         # Authentication logic
│   ├── lessonController.js       # Lesson management
│   ├── userController.js         # User profile & favorites
│   ├── adminController.js        # Admin operations
│   └── stripeController.js       # Payment processing
├── models/              # MongoDB schemas
│   ├── User.js          # User schema
│   ├── Lesson.js        # Lesson schema
│   ├── Comment.js       # Comments schema
│   ├── Report.js        # Lesson reports schema
│   └── Favorite.js      # Favorites schema
├── middleware/          # Express middleware
│   ├── verifyToken.js   # JWT/Firebase token verification
│   └── isAdmin.js       # Admin role verification
├── routes/              # API routes
│   ├── auth.js          # Authentication endpoints
│   ├── lessons.js       # Lesson endpoints
│   ├── users.js         # User endpoints
│   ├── admin.js         # Admin endpoints
│   └── stripe.js        # Payment endpoints
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## 📋 Features

### Authentication
- User registration and login
- Firebase authentication integration
- JWT token-based session management
- Role-based access control (user, instructor, admin)

### Lesson Management
- Create, read, update, delete lessons
- Public and premium lesson support
- Lesson enrollment system
- Comments and ratings system
- Lesson search and filtering

### User Features
- User profile management
- Favorites system
- Enrolled lessons tracking
- User preferences

### Admin Features
- User management and role assignment
- Lesson publishing/unpublishing
- Report management system
- Dashboard statistics
- Content moderation

### Payments (Stripe)
- One-time payment for lessons
- Subscription management for premium membership
- Payment intent creation
- Webhook handling for payment events

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- Stripe account
- Firebase project

### Installation

1. **Clone and setup**
```bash
cd server_11
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/lesson_platform

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id

# JWT
JWT_SECRET=your_secure_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Server
PORT=5000
NODE_ENV=development
```

3. **Start the server**

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## 📚 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /firebase-auth` - Firebase authentication
- `POST /logout` - Logout user

### Lessons (`/api/lessons`)
- `GET /` - Get all published lessons (public)
- `GET /:id` - Get lesson details
- `POST /` - Create lesson (authenticated)
- `PUT /:id` - Update lesson (instructor only)
- `DELETE /:id` - Delete lesson (instructor only)
- `POST /:id/enroll` - Enroll in lesson
- `GET /:id/comments` - Get lesson comments
- `POST /:id/comments` - Add comment

### Users (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `GET /favorites` - Get favorite lessons
- `POST /favorites` - Add favorite
- `DELETE /favorites/:lessonId` - Remove favorite
- `GET /enrolled` - Get enrolled lessons

### Admin (`/api/admin`)
- `GET /users` - Get all users
- `PUT /users/:userId/role` - Change user role
- `PUT /users/:userId/deactivate` - Deactivate user
- `GET /lessons` - Get all lessons
- `PUT /lessons/:lessonId/publish` - Toggle lesson publish
- `GET /reports` - Get all reports
- `POST /lessons/:lessonId/report` - Report lesson
- `PUT /reports/:reportId/resolve` - Resolve report
- `GET /stats` - Get dashboard statistics

### Stripe (`/api/stripe`)
- `POST /payment-intent` - Create payment intent
- `POST /payment-success` - Handle payment success
- `POST /subscription` - Create subscription
- `POST /subscription/cancel` - Cancel subscription
- `POST /webhook` - Stripe webhook handler

## 🔐 Middleware

### `verifyToken`
Verifies JWT or Firebase tokens. Required for protected routes.

### `isAdmin`
Checks if user has admin role. Must be used after `verifyToken`.

## 📊 Database Models

### User
- Email, display name, photo
- Role (user, instructor, admin)
- Premium status and expiry
- Stripe customer ID
- Enrolled lessons list

### Lesson
- Title, description, category, level
- Instructor reference
- Price (0 for free)
- Video URL, duration
- Rating and enrolled students
- Premium flag, publish status

### Comment
- Lesson and author references
- Text and rating
- Replies support
- Timestamps

### Report
- Lesson and reporter references
- Reason (inappropriate, offensive, spam, copyright, other)
- Status (pending, reviewed, resolved, dismissed)
- Admin resolution notes

### Favorite
- User and lesson references
- Compound unique index (user, lesson)

## 🔄 Data Flow

### Lesson Purchase Flow
1. User requests payment intent → `/api/stripe/payment-intent`
2. Stripe creates payment intent
3. Client processes payment with Stripe Elements
4. Client confirms payment success → `/api/stripe/payment-success`
5. Server enrolls user in lesson

### Lesson Reporting Flow
1. User reports lesson → `/api/admin/lessons/:id/report`
2. Report created in database
3. Admin views reports → `/api/admin/reports`
4. Admin resolves report → `/api/admin/reports/:reportId/resolve`

## 🛠️ Development

### Run tests (when added)
```bash
npm test
```

### Database seeding (optional)
Create a seed file in the root directory to populate initial data.

## 📝 Notes

- Firebase initialization should be done in `server.js` if using Firebase Auth
- Stripe webhook signature verification should be added in production
- Add proper error handling and logging as needed
- Implement rate limiting for API endpoints
- Add request validation with joi or express-validator

## 📄 License

ISC
