# Architecture Overview

## Overview

This repository contains an educational ERP (Enterprise Resource Planning) system called EduMex/Altum, designed to manage various aspects of school operations. The system serves different user roles including administrators, teachers, coordinators, parents, and students.

The architecture follows a modern full-stack approach with a clear separation between client and server components, using a RESTful API for communication. The application is built as a web-based system designed to run in both development and production environments.

## System Architecture

The system follows a client-server architecture with the following main components:

### Frontend Architecture

- **Framework**: React with TypeScript
- **State Management**: React Query (TanStack Query)
- **UI Components**: Custom components built with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Routing**: Implied client-side routing (specific router not explicitly defined)

### Backend Architecture

- **Runtime**: Node.js with TypeScript
- **API Framework**: Express.js
- **Database Access**: Drizzle ORM with PostgreSQL database
- **Authentication**: JWT-based authentication
- **API Structure**: RESTful API endpoints organized by domain

### Database Architecture

- **Type**: PostgreSQL (via NeonDB serverless)
- **ORM**: Drizzle ORM for database schema definition and access
- **Schema**: Relational schema with tables for students, teachers, groups, subjects, grades, attendance, payments, etc.
- **Migrations**: Managed via Drizzle Kit

## Key Components

### Core Business Modules

1. **User Management**
   - Authentication and authorization
   - User roles (admin, coordinator, teacher, parent, student)
   - Profile management

2. **Academic Management**
   - Student enrollment and management
   - Teacher assignment
   - Group and subject management
   - Grade recording and reporting
   - Attendance tracking
   - Academic reporting (report cards, performance analytics)
   - Evaluation criteria management

3. **Financial Management**
   - Payment concepts definition
   - Debt tracking
   - Payment processing (including SPEI and Stripe integration)
   - Financial reporting
   - Risk classification for payments

4. **Communication System**
   - Messaging between users
   - Announcements
   - Notifications
   - Email integration via SendGrid

5. **AI Assistant Services**
   - Pedagogical recommendations
   - Academic risk prediction
   - Financial summary generation
   - Recovery plans generation
   - Conversation assistance

### Server Components

1. **API Routes**
   - Organized by domain (e.g., teacher-routes, payment-routes, ai-routes)
   - Authentication middleware for secured endpoints
   - Role-based access control

2. **Service Layer**
   - Domain-specific services (e.g., email-service, payment-service, ai-service)
   - Third-party integrations (Anthropic Claude, Stripe, SendGrid)

3. **Storage Layer**
   - Database access abstraction
   - Query implementation

4. **Scheduled Tasks**
   - Cron jobs for recurring operations
   - Background processes for payment processing, notifications, etc.

### Client Components

1. **UI Components**
   - Form elements
   - Data display components
   - Navigation elements
   - Modals and dialogs

2. **Data Fetching**
   - React Query for API communication
   - Custom hooks for data access

3. **Authentication**
   - JWT token storage and management
   - Protected routes

## Data Flow

### Authentication Flow

1. User submits credentials to `/api/login`
2. Server validates credentials and generates JWT token
3. Client stores token and includes it in subsequent requests
4. Protected API endpoints verify token validity and user permissions

### Main Data Flows

1. **Academic Data Flow**
   - Teachers input grades and attendance
   - System calculates statistics and generates reports
   - Parents and students can view academic performance

2. **Financial Data Flow**
   - Administrators create payment concepts and assign debts
   - Parents view and pay outstanding debts
   - System processes payments and generates receipts
   - Financial reports are generated for administrators

3. **Communication Flow**
   - Users create messages directed to specific recipients
   - System delivers messages and notifications
   - Recipients can view, respond, and manage their messages

4. **AI Assistant Flow**
   - User sends request with relevant data
   - System formats prompt and sends to Claude API
   - Response is processed and presented to the user

## External Dependencies

### Third-Party APIs

1. **Anthropic Claude API**
   - Used for AI text generation
   - Powers pedagogical recommendations, risk predictions, and conversation assistance

2. **Stripe API**
   - Payment processing integration
   - Handles credit card payments

3. **SendGrid API**
   - Email delivery service
   - Used for sending notifications, receipts, and reminders

### External Services

1. **NeonDB**
   - Serverless PostgreSQL database
   - Primary data storage

2. **SPEI Payment System**
   - Mexican banking system integration for bank transfers
   - Implemented with webhook-based status updates

## Deployment Strategy

The system is designed to run in various environments:

1. **Development Environment**
   - Runs on Replit
   - Uses Vite for frontend development
   - Hot module replacement for quick iteration

2. **Production Environment**
   - Build process separates client and server code
   - Server-side rendering of initial HTML
   - Static assets served from `dist/public`
   - Environment variables for configuration

3. **Database Provisioning**
   - Configured via environment variables (DATABASE_URL)
   - Schema migrations managed via drizzle-kit

4. **Scaling Strategy**
   - Deployment target configured as "autoscale"
   - Multiple ports exposed for different services

## Security Considerations

1. **Authentication**
   - JWT-based authentication with expiration
   - Role-based access control
   - Password hashing with bcrypt

2. **API Security**
   - Input validation using Zod schemas
   - Middleware for request validation
   - Token verification for protected endpoints

3. **Financial Data**
   - Secure payment processing through established providers
   - Audit logs for financial transactions
   - Receipt generation for payment verification

## Development Practices

1. **Code Organization**
   - Clear separation of concerns (routes, services, storage)
   - Typed interfaces for data structures
   - Modular component structure

2. **Error Handling**
   - Structured error responses
   - Logging of errors and important events
   - Graceful degradation for AI services

3. **Testing and Monitoring**
   - Endpoint monitoring for performance metrics
   - Service health checks
   - Mock data generation for testing