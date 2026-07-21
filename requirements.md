# Chat Application - Version 1

## Features

- User Registration
- User Login
- User Logout
- User List
- One-to-One Chat

## Pages

- index.html
- login.html
- register.html
- chat.html

## Technologies

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MongoDB
- Socket.IO
## User Flow

1. User opens index.html
2. If user is not logged in, redirect to login.html
3. New user can open register.html
4. After registration, user returns to login.html
5. After successful login, user opens chat.html
6. User selects a contact from the user list
7. User sends and receives messages
8. User can logout and return to login.html
## Page Requirements

### 1. index.html
- App logo or app name
- Loading message
- Later JavaScript will check whether the user is logged in
- Redirect user to login.html or chat.html

### 2. login.html
- App name
- Email input
- Password input
- Login button
- Create account link
- Forgot password link

### 3. register.html
- Full name input
- Email input
- Password input
- Confirm password input
- Create account button
- Login page link

### 4. chat.html
- App header
- Logged-in user profile
- Search users input
- Users or contacts list
- Selected user name and status
- Message area
- Message input
- Send button
- Logout button
## Current Frontend Flow

index.html
→ login.html
→ otp.html
→ profile.html
→ chats.html
→ chat.html

## Current Demo Behaviour

- Phone-number validation is implemented on the frontend.
- Demo OTP is 123456.
- Profile data is saved in browser localStorage.
- Conversations and messages are saved in browser localStorage.
- Contact Picker API is used only when the browser supports it.
- Manual contact checking and SMS invite links are included as a frontend prototype.
- Real OTP, MongoDB, Socket.IO, contact matching and file upload are not connected yet.
