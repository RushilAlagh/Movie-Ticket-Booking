
# 🎬 Movie Ticket Booking System

A modern, containerized microservices solution for seamless movie ticket bookings.

---

## 📜 System Architecture Diagram

![image](https://github.com/user-attachments/assets/fdf26cea-e6d2-4c5e-9f7f-c93a25ee1cd0)

---

## 🔍 Overview

The **Movie Ticket Booking System** provides an intuitive platform for users to:
- Browse screenings
- Select seats
- Book tickets

Admins can:
- Manage screenings
- View reports via a secure API

---

## 🏗️ Architecture

### Frontend
- **React.js**: Interactive UI with real-time seat availability
- **Axios**: Handles API communication with the backend

### Backend
- **Node.js & Express**: RESTful API for business logic
- **JWT**: Secure authentication

### Data Layer
- **PostgreSQL**: Persistent storage for screenings, bookings, users
- **Redis**: Caches seat availability to reduce database load

### Services
- **RabbitMQ**: Async message queue for booking processing
- **Worker Service**: Processes background tasks (e.g., seat releases)

### Infrastructure
- **Docker**: Containerized services
- **Docker Compose**: Orchestration and local development

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/movie-ticket-booking.git
   cd movie-ticket-booking
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## 📚 API Endpoints

| Endpoint                   | Method | Description                     |
|----------------------------|--------|---------------------------------|
| `/screenings/:id/seats`    | GET    | Get available seats for a screening |
| `/bookings`                | POST   | Create a new booking            |
| `/bookings/:id/cancel`     | POST   | Cancel a booking                |
| `/bookings?user_id=:id`    | GET    | List user bookings              |

### Example Requests

To include these in your API endpoints examples, you can format them like a comprehensive API documentation section. Here’s how you can integrate them:

---

## **API Endpoints**

### **GET /movies**  
Fetches a list of all movies available for viewing.

#### **Example Request:**
```bash
GET /movies
```

#### **Example Response:**
```json
[
  {
    "id": 1,
    "title": "Inception",
    "genre": "Sci-Fi",
    "duration": 148,
    "description": "A thief who steals corporate secrets through dream-sharing."
  },
  {
    "id": 2,
    "title": "Interstellar",
    "genre": "Sci-Fi",
    "duration": 169,
    "description": "A team travels through a wormhole in space in an attempt to save humanity."
  }
]
```

---

### **GET /movies/:id**  
Retrieves details of a specific movie.

#### **Example Request:**
```bash
GET /movies/1
```

#### **Example Response:**
```json
{
  "id": 1,
  "title": "Inception",
  "genre": "Sci-Fi",
  "duration": 148,
  "description": "A thief who steals corporate secrets through dream-sharing."
}
```

---

### **GET /movies/:id/screenings**  
Gets details of all upcoming screenings for a specific movie.

#### **Example Request:**
```bash
GET /movies/1/screenings
```

#### **Example Response:**
```json
[
  {
    "screening_id": 10,
    "movie_id": 1,
    "start_time": "2025-04-20T18:00:00",
    "screen_number": 3
  },
  {
    "screening_id": 11,
    "movie_id": 1,
    "start_time": "2025-04-21T21:00:00",
    "screen_number": 1
  }
]
```

---

### **GET /screenings/:id/seats**  
Returns available and booked seats for a particular screening.

#### **Example Request:**
```bash
GET /screenings/10/seats
```

#### **Example Response:**
```json
[
  { "seat_id": 1, "number": "A1", "is_booked": false },
  { "seat_id": 2, "number": "A2", "is_booked": true },
  { "seat_id": 3, "number": "A3", "is_booked": false }
]
```

---

### **POST /bookings**  
Creates a booking for one or more seats in a screening.

#### **Example Request:**
```bash
POST /bookings
Content-Type: application/json

{
  "user_id": 1,
  "screening_id": 10,
  "seat_ids": [1, 3]
}
```

#### **Example Response:**
```json
{
  "booking_id": 101,
  "user_id": 1,
  "screening_id": 10,
  "seats_booked": [1, 3],
  "status": "confirmed"
}
```

---

### **POST /bookings/:id/cancel**  
Cancels an existing booking.

#### **Example Request:**
```bash
POST /bookings/101/cancel
```

#### **Example Response:**
```json
{
  "message": "Booking with ID 101 has been cancelled.",
  "status": "cancelled"
}
```

---

### **GET /bookings?user_id=:id**  
Fetches all bookings made by a specific user.

#### **Example Request:**
```bash
GET /bookings?user_id=1
```

#### **Example Response:**
```json
[
  {
    "booking_id": 101,
    "screening_id": 10,
    "seats": ["A1", "A3"],
    "status": "confirmed",
    "movie_title": "Inception",
    "start_time": "2025-04-20T18:00:00"
  },
  {
    "booking_id": 102,
    "screening_id": 11,
    "seats": ["B1", "B2"],
    "status": "cancelled",
    "movie_title": "Inception",
    "start_time": "2025-04-21T21:00:00"
  }
]
```

---

### **GET /test-db**  
Checks if the database connection is alive and functioning.

#### **Example Request:**
```bash
GET /test-db
```

#### **Example Response:**
```json
{
  "message": "Database connection successful"
}
```

---

### **POST /book**  
Creates a simplified booking for a user based on the movie and their name.

#### **Example Request:**
```bash
POST /book
Content-Type: application/json

{
  "movie_id": "1",
  "user_name": "John Doe"
}
```

#### **Example Response:**
```json
{
  "message": "Booking created successfully",
  "user": "John Doe",
  "movie_id": "1"
}
```
---

## ✨ Key Features

- ✅ Real-time seat availability with **Redis caching**
- ✅ Containerized microservices for easy scaling
- ✅ Async booking processing via **RabbitMQ**
- ✅ Idempotent API to prevent duplicate bookings
- ✅ Admin dashboard for screening management

---

## 🛠️ Tech Stack

- **Frontend**: React, Redux, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Redis
- **DevOps**: Docker, Docker Compose, GitHub Actions

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes:
   ```bash
   git commit -m 'Add some feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request

---

## 📄 License

**MIT** © [Your Name]

---

This revision organizes the content into clear and professional sections, making it more readable and user-friendly. Let me know if you need further adjustments!
